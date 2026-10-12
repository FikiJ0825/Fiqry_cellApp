-- Migrasi 002: kunci kolom sensitif profiles + klaim bonus atomik lewat RPC
-- Jalankan di Supabase SQL Editor (setelah dibaca), lalu jalankan blok TEST di bagian bawah.
--
-- Masalah yang ditutup:
--   1. Klien (role authenticated) boleh UPDATE baris profiles miliknya sendiri lewat RLS standar,
--      sehingga secara teknis bisa mengubah saldo / tier / role / kode_referral sendiri.
--   2. Klaim bonus sebelumnya = INSERT klaim_bonus + UPDATE saldo_bonus_pending dari klien
--      (dua langkah, tidak atomik, bisa di-replay).

-- =============================================================================
-- 1. Trigger penjaga kolom profiles
--    Whitelist: klien hanya boleh mengubah nama, nomor_wa, diperbarui_pada,
--    dan mengisi direferensikan_oleh SATU KALI (dari NULL). Kolom lain (termasuk
--    kolom yang ditambah di masa depan) otomatis terkunci.
--    Pemanggil non-klien (service_role, SECURITY DEFINER function, pg_cron, SQL Editor)
--    dan admin tidak dibatasi.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.jaga_kolom_profiles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  kolom_boleh text[] := ARRAY['nama', 'nomor_wa', 'diperbarui_pada', 'direferensikan_oleh'];
BEGIN
  -- current_user = 'authenticated'/'anon' hanya untuk query langsung dari klien (PostgREST).
  -- Di dalam SECURITY DEFINER function current_user = pemilik function.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- register.tsx mengisi email_auth dari klien; izinkan hanya selama masih kosong (sekali)
  IF OLD.email_auth IS NULL THEN
    kolom_boleh := kolom_boleh || 'email_auth';
  END IF;

  IF (to_jsonb(NEW) - kolom_boleh) IS DISTINCT FROM (to_jsonb(OLD) - kolom_boleh) THEN
    RAISE EXCEPTION 'Perubahan kolom ini tidak diizinkan'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.direferensikan_oleh IS NOT NULL
     AND NEW.direferensikan_oleh IS DISTINCT FROM OLD.direferensikan_oleh THEN
    RAISE EXCEPTION 'Referensi agen tidak dapat diubah'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jaga_kolom_profiles ON public.profiles;
CREATE TRIGGER trg_jaga_kolom_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.jaga_kolom_profiles();

-- =============================================================================
-- 2. RPC klaim bonus atomik
--    Mengunci baris profil, membuat klaim_bonus pending sebesar saldo_bonus_pending,
--    mengosongkan saldo_bonus_pending, lalu mengembalikan jumlahnya.
--    Dipanggil klien: supabase.rpc('klaim_bonus_referral')
-- =============================================================================

CREATE OR REPLACE FUNCTION public.klaim_bonus_referral()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_jumlah numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesi tidak valid' USING ERRCODE = '28000';
  END IF;

  SELECT saldo_bonus_pending
    INTO v_jumlah
    FROM public.profiles
   WHERE id = v_uid
   FOR UPDATE;

  IF v_jumlah IS NULL OR v_jumlah <= 0 THEN
    RAISE EXCEPTION 'Tidak ada bonus yang dapat diklaim' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.klaim_bonus (agen_id, jumlah, status)
  VALUES (v_uid, v_jumlah, 'pending');

  UPDATE public.profiles
     SET saldo_bonus_pending = 0
   WHERE id = v_uid;

  RETURN v_jumlah;
END;
$$;

REVOKE ALL ON FUNCTION public.klaim_bonus_referral() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.klaim_bonus_referral() TO authenticated;

-- =============================================================================
-- 3. (Opsional, disarankan) cabut hak INSERT langsung ke klaim_bonus dari klien.
--    Sesuaikan nama policy lewat: SELECT policyname FROM pg_policies WHERE tablename='klaim_bonus';
-- =============================================================================
-- DROP POLICY IF EXISTS "<nama_policy_insert_klaim_bonus>" ON public.klaim_bonus;

-- =============================================================================
-- TEST manual (jalankan sebagai agen biasa lewat app / supabase-js, BUKAN di SQL Editor):
--   a) supabase.from('profiles').update({ saldo: 999999 }).eq('id', uid)   -> harus ERROR 42501
--   b) supabase.from('profiles').update({ tier: 'master' }).eq('id', uid)  -> harus ERROR 42501
--   c) supabase.from('profiles').update({ role: 'admin' }).eq('id', uid)   -> harus ERROR 42501
--   d) supabase.from('profiles').update({ nama: 'Tes' }).eq('id', uid)     -> harus berhasil
--   e) supabase.rpc('klaim_bonus_referral') dua kali berturut-turut        -> kedua kalinya ERROR "Tidak ada bonus..."
--   f) Register agen baru dengan kode referral                             -> tetap berhasil
--   g) Transaksi berhasil -> update_referral_progress / bonus harian tetap jalan (service role)
-- =============================================================================
