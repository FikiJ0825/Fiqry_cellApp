-- Migrasi 011: pembelian dengan bayar QRIS langsung (tanpa saldo)
-- Jalankan di Supabase SQL Editor SEBELUM deploy Edge Function create-transaction versi baru.
--
-- Alur:
--   1. create-transaction (metode_bayar = 'qris') -> baris transaksi status 'menunggu_pembayaran'
--      dengan total_bayar = harga + kode_unik (unik di antara pesanan yang masih menunggu).
--   2. Pembayaran terkonfirmasi (admin lewat konfirmasi-bayar-qris, nanti otomatis lewat notifikasi)
--      -> tandai_dibayar_qris() mengubah status jadi 'pending' lalu pesan dikirim ke WA Center.
--   3. wa-webhook / selesaikan_transaksi_admin yang sudah ada mengurus berhasil/gagal.
--
-- Trik agar logika refund lama tetap benar: saat dibayar, saldo_sebelum diisi (saldo + harga) dan
-- saldo_sesudah diisi saldo sekarang. Saldo asli tidak berubah, tetapi bila transaksi akhirnya GAGAL,
-- refund (saldo_sebelum - saldo_sesudah = harga) dikreditkan ke saldo pengguna.

ALTER TABLE public.transaksi
  ADD COLUMN IF NOT EXISTS metode_bayar   text    NOT NULL DEFAULT 'saldo',
  ADD COLUMN IF NOT EXISTS harga          numeric,
  ADD COLUMN IF NOT EXISTS kode_unik      integer,
  ADD COLUMN IF NOT EXISTS total_bayar    numeric,
  ADD COLUMN IF NOT EXISTS kedaluwarsa_at timestamptz;

-- Perluas daftar status yang diizinkan. Constraint status lama (jika ada) dibuang lebih dulu karena
-- definisinya tidak tercatat di migrasi; baris lama tidak diperiksa ulang (NOT VALID).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.transaksi'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.transaksi DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.transaksi
  ADD CONSTRAINT transaksi_status_check
  CHECK (status IN ('pending', 'diproses', 'berhasil', 'gagal', 'menunggu_pembayaran')) NOT VALID;

ALTER TABLE public.transaksi
  DROP CONSTRAINT IF EXISTS transaksi_metode_bayar_check;
ALTER TABLE public.transaksi
  ADD CONSTRAINT transaksi_metode_bayar_check CHECK (metode_bayar IN ('saldo', 'qris'));

-- Dua pesanan yang sama-sama menunggu tidak boleh punya total bayar sama, supaya pembayaran
-- bisa dicocokkan ke satu pesanan saja.
CREATE UNIQUE INDEX IF NOT EXISTS transaksi_total_bayar_menunggu_uq
  ON public.transaksi (total_bayar)
  WHERE status = 'menunggu_pembayaran';

-- Tandai pesanan QRIS sudah dibayar (hanya service_role, dipanggil Edge Function).
-- Mengembalikan data untuk dikirim ke WA Center, atau NULL bila pesanan tidak lagi menunggu
-- (sudah dikonfirmasi / dibatalkan / kedaluwarsa), sehingga aman dipanggil ulang.
CREATE OR REPLACE FUNCTION public.tandai_dibayar_qris(p_transaksi_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trx    public.transaksi%ROWTYPE;
  v_saldo  numeric;
BEGIN
  SELECT * INTO v_trx FROM public.transaksi WHERE id = p_transaksi_id FOR UPDATE;
  IF NOT FOUND OR v_trx.status <> 'menunggu_pembayaran' OR v_trx.metode_bayar <> 'qris' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(saldo, 0) INTO v_saldo FROM public.profiles WHERE id = v_trx.agen_id FOR UPDATE;

  UPDATE public.transaksi
     SET status = 'pending',
         saldo_sebelum = v_saldo + v_trx.harga,
         saldo_sesudah = v_saldo,
         kedaluwarsa_at = NULL
   WHERE id = p_transaksi_id;

  RETURN jsonb_build_object(
    'id', v_trx.id,
    'agen_id', v_trx.agen_id,
    'kode_produk', v_trx.kode_produk,
    'nomor_tujuan', v_trx.nomor_tujuan,
    'harga', v_trx.harga
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tandai_dibayar_qris(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tandai_dibayar_qris(uuid) TO service_role;

-- Batalkan pesanan QRIS yang belum dibayar: oleh pemiliknya sendiri atau admin.
CREATE OR REPLACE FUNCTION public.batalkan_bayar_qris(p_transaksi_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trx public.transaksi%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus login' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_trx FROM public.transaksi WHERE id = p_transaksi_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan' USING ERRCODE = 'P0001';
  END IF;

  IF v_trx.agen_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Tidak berhak membatalkan transaksi ini' USING ERRCODE = '42501';
  END IF;

  IF v_trx.status <> 'menunggu_pembayaran' THEN
    RETURN false;
  END IF;

  UPDATE public.transaksi
     SET status = 'gagal',
         catatan = 'Pesanan dibatalkan sebelum pembayaran QRIS diterima.'
   WHERE id = p_transaksi_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.batalkan_bayar_qris(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batalkan_bayar_qris(uuid) TO authenticated;

-- Bersihkan pesanan QRIS yang lewat waktu supaya total_bayar-nya bisa dipakai lagi.
CREATE OR REPLACE FUNCTION public.kedaluwarsakan_qris()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jumlah integer;
BEGIN
  UPDATE public.transaksi
     SET status = 'gagal',
         catatan = 'Waktu pembayaran QRIS habis.'
   WHERE status = 'menunggu_pembayaran'
     AND kedaluwarsa_at IS NOT NULL
     AND kedaluwarsa_at < now();
  GET DIAGNOSTICS v_jumlah = ROW_COUNT;
  RETURN v_jumlah;
END;
$$;

REVOKE ALL ON FUNCTION public.kedaluwarsakan_qris() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kedaluwarsakan_qris() TO service_role;
