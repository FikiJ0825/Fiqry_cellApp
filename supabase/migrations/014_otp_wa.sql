-- Migrasi 014: OTP WhatsApp saat pendaftaran
-- Jalankan di Supabase SQL Editor SEBELUM men-deploy Edge Function kirim-otp dan daftar.
--
--   otp_wa                              -> kode OTP (hanya hash-nya) per nomor, berlaku 5 menit
--   buat_otp_wa(nomor, hash)            -> simpan OTP baru + pembatasan kirim (60 detik, 3x per jam)
--   periksa_otp_wa(nomor, hash, pakai)  -> 'ok' | 'salah' | 'kedaluwarsa' | 'terlalu_banyak'
--   pasang_referral_untuk(user, kode)   -> pasang pereferensi atas nama akun baru (dipanggil server)
--
-- Semua fungsi hanya untuk service_role (dipanggil Edge Function); klien tidak punya akses.

CREATE TABLE IF NOT EXISTS public.otp_wa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_wa    text NOT NULL,
  kode_hash   text NOT NULL,
  kedaluwarsa timestamptz NOT NULL,
  percobaan   integer NOT NULL DEFAULT 0,
  terpakai    boolean NOT NULL DEFAULT false,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_wa_nomor_idx ON public.otp_wa (nomor_wa, dibuat_pada DESC);

ALTER TABLE public.otp_wa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.otp_wa FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.otp_wa TO service_role;

-- Simpan OTP baru. Kode error P0001 membawa pesan yang boleh ditampilkan ke pengguna.
CREATE OR REPLACE FUNCTION public.buat_otp_wa(p_nomor text, p_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terakhir timestamptz;
  v_jumlah   integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('otp_wa:' || p_nomor));

  SELECT max(dibuat_pada) INTO v_terakhir FROM public.otp_wa WHERE nomor_wa = p_nomor;
  IF v_terakhir IS NOT NULL AND v_terakhir > now() - interval '60 seconds' THEN
    RAISE EXCEPTION 'Tunggu 1 menit sebelum meminta kode lagi' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_jumlah
    FROM public.otp_wa WHERE nomor_wa = p_nomor AND dibuat_pada > now() - interval '1 hour';
  IF v_jumlah >= 3 THEN
    RAISE EXCEPTION 'Terlalu banyak permintaan kode. Coba lagi dalam 1 jam' USING ERRCODE = 'P0001';
  END IF;

  -- Kode lama tidak boleh dipakai lagi
  UPDATE public.otp_wa SET terpakai = true WHERE nomor_wa = p_nomor AND terpakai = false;

  INSERT INTO public.otp_wa (nomor_wa, kode_hash, kedaluwarsa)
  VALUES (p_nomor, p_hash, now() + interval '5 minutes');

  -- Bersihkan data lama supaya tabel tidak menumpuk
  DELETE FROM public.otp_wa WHERE dibuat_pada < now() - interval '1 day';
END;
$$;

REVOKE ALL ON FUNCTION public.buat_otp_wa(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buat_otp_wa(text, text) TO service_role;

-- Periksa OTP terbaru yang belum dipakai. p_pakai = true menandai kode terpakai bila cocok.
-- Salah tebak menaikkan percobaan; setelah 5 kali salah kode itu mati.
CREATE OR REPLACE FUNCTION public.periksa_otp_wa(p_nomor text, p_hash text, p_pakai boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp public.otp_wa%ROWTYPE;
BEGIN
  SELECT * INTO v_otp
    FROM public.otp_wa
   WHERE nomor_wa = p_nomor AND terpakai = false
   ORDER BY dibuat_pada DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND OR v_otp.kedaluwarsa < now() THEN
    RETURN 'kedaluwarsa';
  END IF;
  IF v_otp.percobaan >= 5 THEN
    RETURN 'terlalu_banyak';
  END IF;

  IF v_otp.kode_hash <> p_hash THEN
    UPDATE public.otp_wa SET percobaan = percobaan + 1 WHERE id = v_otp.id;
    RETURN 'salah';
  END IF;

  IF p_pakai THEN
    UPDATE public.otp_wa SET terpakai = true WHERE id = v_otp.id;
  END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.periksa_otp_wa(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.periksa_otp_wa(text, text, boolean) TO service_role;

-- Versi server dari pasang_referral (migrasi 007): sama aturannya, tetapi memakai id akun yang diberikan
-- karena Edge Function daftar bekerja dengan service_role (auth.uid() kosong).
CREATE OR REPLACE FUNCTION public.pasang_referral_untuk(p_user uuid, p_kode text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pereferensi uuid;
BEGIN
  SELECT id INTO v_pereferensi
    FROM profiles
   WHERE kode_referral IS NOT NULL
     AND lower(kode_referral) = lower(btrim(p_kode))
   LIMIT 1;

  IF v_pereferensi IS NULL OR v_pereferensi = p_user THEN
    RETURN false;
  END IF;

  UPDATE profiles
     SET direferensikan_oleh = v_pereferensi
   WHERE id = p_user
     AND direferensikan_oleh IS NULL
     AND dibuat_pada > now() - interval '1 day';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.pasang_referral_untuk(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pasang_referral_untuk(uuid, text) TO service_role;
