-- Migrasi 016: jangan pakai ulang total bayar QRIS yang baru saja dipakai
-- Jalankan di Supabase SQL Editor, lalu deploy ulang Edge Function create-transaction.
-- Membutuhkan migrasi 011 (transaksi QRIS) dan 012 (topup_qris).
--
-- Masalah: notifikasi pembayaran yang telat (mis. HP penerima sedang offline) dicocokkan berdasarkan
-- total bayar. Bila pesanan lama sudah dikonfirmasi manual lalu ada pesanan baru dengan total bayar yang
-- sama, notifikasi telat itu bisa salah mengonfirmasi pesanan baru yang belum dibayar.
-- Perbaikan: total bayar yang dipakai pesanan/top up QRIS mana pun dalam 1 jam terakhir (status apa pun)
-- tidak dipilih lagi untuk pesanan baru.

CREATE OR REPLACE FUNCTION public.total_bayar_terpakai(p_total numeric)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.transaksi
            WHERE metode_bayar = 'qris'
              AND total_bayar = p_total
              AND (status = 'menunggu_pembayaran' OR dibuat_pada > now() - interval '1 hour')
         )
      OR EXISTS (
           SELECT 1 FROM public.topup_qris
            WHERE total_bayar = p_total
              AND (status = 'menunggu_pembayaran' OR dibuat_pada > now() - interval '1 hour')
         );
$$;

REVOKE ALL ON FUNCTION public.total_bayar_terpakai(numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.total_bayar_terpakai(numeric) TO service_role;

-- buat_topup_qris: sama dengan migrasi 012, hanya pengecekan kode unik yang memakai total_bayar_terpakai
CREATE OR REPLACE FUNCTION public.buat_topup_qris(p_jumlah numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_aktif   boolean;
  v_menunggu integer;
  v_kode    integer;
  v_total   numeric;
  v_exp     timestamptz := now() + interval '15 minutes';
  v_id      uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Harus login' USING ERRCODE = '42501';
  END IF;

  IF p_jumlah IS NULL OR p_jumlah <> trunc(p_jumlah) OR p_jumlah < 10000 OR p_jumlah > 2000000 THEN
    RAISE EXCEPTION 'Nominal top up harus bilangan bulat Rp10.000 sampai Rp2.000.000' USING ERRCODE = 'P0001';
  END IF;

  SELECT aktif INTO v_aktif FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil tidak ditemukan' USING ERRCODE = 'P0001';
  END IF;
  IF v_aktif = false THEN
    RAISE EXCEPTION 'Akun Anda dinonaktifkan, hubungi admin' USING ERRCODE = 'P0001';
  END IF;

  -- Serialkan pembuatan kode unik supaya tidak saling bentrok
  PERFORM pg_advisory_xact_lock(hashtext('total_bayar_qris'));

  UPDATE public.topup_qris
     SET status = 'gagal', catatan = 'Waktu pembayaran QRIS habis.'
   WHERE status = 'menunggu_pembayaran' AND kedaluwarsa_at < now();
  UPDATE public.transaksi
     SET status = 'gagal', catatan = 'Waktu pembayaran QRIS habis.'
   WHERE status = 'menunggu_pembayaran' AND kedaluwarsa_at IS NOT NULL AND kedaluwarsa_at < now();

  SELECT count(*) INTO v_menunggu
    FROM public.topup_qris WHERE agen_id = v_uid AND status = 'menunggu_pembayaran';
  IF v_menunggu >= 3 THEN
    RAISE EXCEPTION 'Masih ada top up QRIS yang belum dibayar. Bayar atau batalkan dulu.' USING ERRCODE = 'P0001';
  END IF;

  FOR i IN 1..30 LOOP
    v_kode := 1 + floor(random() * 99)::integer;
    v_total := p_jumlah + v_kode;
    IF NOT public.total_bayar_terpakai(v_total) THEN
      INSERT INTO public.topup_qris (agen_id, jumlah, kode_unik, total_bayar, kedaluwarsa_at)
      VALUES (v_uid, p_jumlah, v_kode, v_total, v_exp)
      RETURNING id INTO v_id;

      RETURN jsonb_build_object(
        'id', v_id, 'jumlah', p_jumlah, 'kode_unik', v_kode,
        'total_bayar', v_total, 'kedaluwarsa_at', v_exp
      );
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Sedang ramai, coba lagi sebentar lagi' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.buat_topup_qris(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buat_topup_qris(numeric) TO authenticated;
