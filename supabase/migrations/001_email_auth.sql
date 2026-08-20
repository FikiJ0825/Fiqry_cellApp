-- Migrasi email_auth: pisahkan email Auth (fixed) dari nomor WA (bisa diubah)
-- Jalankan bertahap di Supabase SQL Editor.

-- =============================================================================
-- Langkah 1: Tambah kolom + backfill (jalankan dulu, cek Table Editor)
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_auth text UNIQUE;

UPDATE profiles
SET email_auth = nomor_wa || '@apppulsa.app'
WHERE email_auth IS NULL AND nomor_wa IS NOT NULL;

-- =============================================================================
-- Langkah 2: Set NOT NULL (jalankan terpisah setelah backfill sukses)
-- =============================================================================

-- ALTER TABLE profiles ALTER COLUMN email_auth SET NOT NULL;

-- =============================================================================
-- Langkah 3: RPC lookup login (SECURITY DEFINER — anon tidak perlu SELECT profiles)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_email_by_nomor_wa(input_nomor_wa text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email_auth FROM profiles WHERE nomor_wa = input_nomor_wa LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_nomor_wa(text) TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_nomor_wa(text) TO authenticated;

-- =============================================================================
-- Langkah 4: Update trigger handle_pengguna_baru
-- Cek fungsi existing dulu: SELECT prosrc FROM pg_proc WHERE proname = 'handle_pengguna_baru';
-- Sesuaikan INSERT di bawah dengan kolom lain yang sudah ada di fungsi asli.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_pengguna_baru()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email_auth)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;
