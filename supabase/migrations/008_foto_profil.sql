-- Migrasi 008: foto profil (kolom profiles.foto_url + bucket storage 'avatar')
-- Jalankan di Supabase SQL Editor.
--
-- Isi:
--   1. Kolom profiles.foto_url (URL publik foto di bucket avatar)
--   2. Trigger penjaga kolom (002) diperbarui: klien boleh mengubah foto_url miliknya sendiri
--   3. Bucket publik 'avatar' (jpeg/png/webp, maks 2 MB) + policy: hanya pemilik yang boleh
--      menulis/menghapus di folder {uid}/, semua orang boleh membaca

-- =============================================================================
-- 1. Kolom foto_url
-- =============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto_url text;

-- =============================================================================
-- 2. Trigger penjaga kolom: sama dengan 002 + 'foto_url' di whitelist
-- =============================================================================
CREATE OR REPLACE FUNCTION public.jaga_kolom_profiles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  kolom_boleh text[] := ARRAY['nama', 'nomor_wa', 'foto_url', 'diperbarui_pada', 'direferensikan_oleh'];
BEGIN
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

-- Trigger trg_jaga_kolom_profiles dari 002 otomatis memakai fungsi yang baru.

-- =============================================================================
-- 3. Bucket 'avatar' + policy storage
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatar', 'avatar', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatar_baca_publik" ON storage.objects;
CREATE POLICY "avatar_baca_publik" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatar');

DROP POLICY IF EXISTS "avatar_tulis_pemilik" ON storage.objects;
CREATE POLICY "avatar_tulis_pemilik" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatar' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_ubah_pemilik" ON storage.objects;
CREATE POLICY "avatar_ubah_pemilik" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatar' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_hapus_pemilik" ON storage.objects;
CREATE POLICY "avatar_hapus_pemilik" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatar' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- TEST manual (sebagai agen biasa lewat app):
--   a) ganti foto di tab Profil                         -> berhasil, foto_url terisi
--   b) update({ saldo: 1 }) / update({ tier: 'master' })  -> tetap ERROR 42501
--   c) upload ke folder uid orang lain                    -> ditolak policy storage
-- =============================================================================
