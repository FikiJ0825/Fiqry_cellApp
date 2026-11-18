-- Migrasi 012: top up saldo lewat QRIS bernominal (konfirmasi admin; nanti otomatis lewat notifikasi)
-- Jalankan di Supabase SQL Editor.
--
--   topup_qris                  -> satu baris per permintaan top up (juga jejak audit saldo)
--   buat_topup_qris(jumlah)     -> pengguna membuat permintaan, mendapat total_bayar unik
--   konfirmasi_topup_qris(id)   -> admin: tambah saldo sebesar jumlah (idempoten)
--   batalkan_topup_qris(id)     -> pemilik atau admin membatalkan sebelum dibayar
--
-- total_bayar = jumlah + kode_unik (1-99). Saldo yang masuk = jumlah saja.
-- Tidak bergantung pada migrasi 009 (Duitku).

CREATE TABLE IF NOT EXISTS public.topup_qris (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agen_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jumlah             numeric NOT NULL CHECK (jumlah > 0),
  kode_unik          integer NOT NULL,
  total_bayar        numeric NOT NULL,
  status             text NOT NULL DEFAULT 'menunggu_pembayaran'
                       CHECK (status IN ('menunggu_pembayaran', 'berhasil', 'gagal')),
  kedaluwarsa_at     timestamptz,
  saldo_sebelum      numeric,
  saldo_sesudah      numeric,
  dibuat_pada        timestamptz NOT NULL DEFAULT now(),
  dibayar_pada       timestamptz,
  dikonfirmasi_oleh  uuid,
  catatan            text
);

CREATE INDEX IF NOT EXISTS topup_qris_agen_idx ON public.topup_qris (agen_id, dibuat_pada DESC);

CREATE UNIQUE INDEX IF NOT EXISTS topup_qris_total_bayar_menunggu_uq
  ON public.topup_qris (total_bayar)
  WHERE status = 'menunggu_pembayaran';

ALTER TABLE public.topup_qris ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.topup_qris FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.topup_qris TO service_role;
GRANT SELECT ON public.topup_qris TO authenticated;

DROP POLICY IF EXISTS "pengguna baca topup_qris sendiri" ON public.topup_qris;
CREATE POLICY "pengguna baca topup_qris sendiri" ON public.topup_qris
  FOR SELECT USING (agen_id = auth.uid());

DROP POLICY IF EXISTS "admin baca semua topup_qris" ON public.topup_qris;
CREATE POLICY "admin baca semua topup_qris" ON public.topup_qris
  FOR SELECT USING (public.is_admin());

-- Buat permintaan top up. Kode unik dipilih agar tidak bentrok dengan topup_qris maupun transaksi
-- QRIS yang sama-sama masih menunggu pembayaran.
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
    IF NOT EXISTS (SELECT 1 FROM public.topup_qris WHERE status = 'menunggu_pembayaran' AND total_bayar = v_total)
       AND NOT EXISTS (SELECT 1 FROM public.transaksi WHERE status = 'menunggu_pembayaran' AND total_bayar = v_total) THEN
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

-- Inti kredit saldo, hanya dipanggil fungsi lain di database (bukan lewat API).
-- Mengembalikan true bila saldo baru ditambah, false bila sudah diproses / tidak menunggu.
CREATE OR REPLACE FUNCTION public.kreditkan_topup_qris(p_id uuid, p_oleh uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top     public.topup_qris%ROWTYPE;
  v_sebelum numeric;
  v_sesudah numeric;
BEGIN
  SELECT * INTO v_top FROM public.topup_qris WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_top.status <> 'menunggu_pembayaran' THEN
    RETURN false;
  END IF;

  SELECT COALESCE(saldo, 0) INTO v_sebelum FROM public.profiles WHERE id = v_top.agen_id FOR UPDATE;
  v_sesudah := v_sebelum + v_top.jumlah;

  UPDATE public.profiles SET saldo = v_sesudah WHERE id = v_top.agen_id;

  UPDATE public.topup_qris
     SET status = 'berhasil',
         saldo_sebelum = v_sebelum,
         saldo_sesudah = v_sesudah,
         dibayar_pada = now(),
         dikonfirmasi_oleh = p_oleh
   WHERE id = p_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.kreditkan_topup_qris(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kreditkan_topup_qris(uuid, uuid) TO service_role;

-- Konfirmasi oleh admin
CREATE OR REPLACE FUNCTION public.konfirmasi_topup_qris(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh mengonfirmasi top up' USING ERRCODE = '42501';
  END IF;
  RETURN public.kreditkan_topup_qris(p_id, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.konfirmasi_topup_qris(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.konfirmasi_topup_qris(uuid) TO authenticated;

-- Batalkan sebelum dibayar (pemilik atau admin)
CREATE OR REPLACE FUNCTION public.batalkan_topup_qris(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top public.topup_qris%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus login' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_top FROM public.topup_qris WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Top up tidak ditemukan' USING ERRCODE = 'P0001';
  END IF;
  IF v_top.agen_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Tidak berhak membatalkan top up ini' USING ERRCODE = '42501';
  END IF;
  IF v_top.status <> 'menunggu_pembayaran' THEN
    RETURN false;
  END IF;

  UPDATE public.topup_qris
     SET status = 'gagal', catatan = 'Dibatalkan sebelum pembayaran diterima.'
   WHERE id = p_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.batalkan_topup_qris(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batalkan_topup_qris(uuid) TO authenticated;
