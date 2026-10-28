-- Migrasi 007: perbaiki alur referral (cek kode, pelacakan, naik tier) dan bonus transaksi harian
--
-- Dasar temuan (dibaca langsung dari database 2026-10-28):
--   * referral_tracking kosong dan tidak ada trigger yang mengisinya. register.tsx hanya mengisi
--     profiles.direferensikan_oleh, jadi update_referral_progress tidak pernah menghitung apa pun
--     dan tidak ada agen yang bisa naik ke Master lewat referral.
--   * RLS profiles hanya mengizinkan baca profil sendiri/admin. Cek kode referral di register.tsx
--     berjalan sebelum login (anon), jadi selalu tidak menemukan baris -> "Kode referral tidak valid".
--   * kode_referral dibuat huruf kecil (generate_kode_referral(text)), sedangkan register.tsx
--     mengubah input menjadi HURUF BESAR -> tidak pernah cocok.
--   * update_referral_progress: syarat naik Master 10 referral; keputusan bisnis menjadi 5.
--   * Master yang naik tanpa transaksi sendiri (transaksi_terakhir_pada NULL) langsung diturunkan
--     lagi oleh downgrade_tier_tidak_aktif pada 02:00 malam itu.
--   * cek_bonus_transaksi_harian menghitung status 'sukses', padahal aplikasi memakai 'berhasil'
--     (bonus tidak pernah masuk), berlaku untuk semua tier, dan batas "hari" mengikuti UTC.
--   * update_referral_progress & cek_bonus_transaksi_harian: SECURITY DEFINER tanpa search_path.
--
-- Keputusan bisnis (pemilik, 2026-10-28):
--   * Naik Master: 5 referral yang syarat_terpenuhi, tiap referral = 3 transaksi berhasil.
--   * Bonus hanya untuk Master: +Rp5.000 tiap kelipatan 10 transaksi berhasil dalam sehari
--     (hari menurut zona Asia/Jakarta).
--
-- Urutan rilis: jalankan migrasi ini DULU, baru pasang versi aplikasi yang memakai
-- cek_kode_referral / pasang_referral (pendaftaran dengan kode referral gagal bila fungsi belum ada).

-- 1. Cek kode referral untuk pendaftar yang belum login (tidak peka huruf besar/kecil).
--    Hanya mengembalikan ada/tidak; id pemilik kode tidak dibuka ke klien.
CREATE OR REPLACE FUNCTION public.cek_kode_referral(p_kode text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE kode_referral IS NOT NULL
      AND lower(kode_referral) = lower(btrim(p_kode))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.cek_kode_referral(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cek_kode_referral(text) TO anon, authenticated;

-- 2. Pasang pereferensi untuk akun yang baru dibuat (dipanggil setelah signUp).
--    Hanya sekali, hanya untuk akun berumur <= 1 hari, dan tidak boleh kode milik sendiri.
CREATE OR REPLACE FUNCTION public.pasang_referral(p_kode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pereferensi uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus login' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_pereferensi
  FROM profiles
  WHERE kode_referral IS NOT NULL
    AND lower(kode_referral) = lower(btrim(p_kode))
  LIMIT 1;

  IF v_pereferensi IS NULL THEN
    RAISE EXCEPTION 'Kode referral tidak valid';
  END IF;

  IF v_pereferensi = auth.uid() THEN
    RAISE EXCEPTION 'Kode referral sendiri tidak bisa dipakai';
  END IF;

  UPDATE profiles
  SET direferensikan_oleh = v_pereferensi
  WHERE id = auth.uid()
    AND direferensikan_oleh IS NULL
    AND dibuat_pada > now() - interval '1 day';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode referral hanya bisa dipasang saat pendaftaran';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pasang_referral(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.pasang_referral(text) TO authenticated;

-- 3. Catat baris referral_tracking setiap kali direferensikan_oleh terisi (dari jalur mana pun).
CREATE OR REPLACE FUNCTION public.buat_referral_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO referral_tracking (pereferensi_id, direferensikan_id)
  VALUES (NEW.direferensikan_oleh, NEW.id)
  ON CONFLICT (direferensikan_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buat_referral_tracking() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_buat_referral_tracking ON public.profiles;
CREATE TRIGGER trg_buat_referral_tracking
AFTER UPDATE OF direferensikan_oleh ON public.profiles
FOR EACH ROW
WHEN (OLD.direferensikan_oleh IS NULL
      AND NEW.direferensikan_oleh IS NOT NULL
      AND NEW.direferensikan_oleh <> NEW.id)
EXECUTE FUNCTION public.buat_referral_tracking();

-- Susul profil yang sudah punya pereferensi tetapi belum tercatat (saat ditulis: 0 baris).
INSERT INTO referral_tracking (pereferensi_id, direferensikan_id)
SELECT direferensikan_oleh, id
FROM profiles
WHERE direferensikan_oleh IS NOT NULL
  AND direferensikan_oleh <> id
ON CONFLICT (direferensikan_id) DO NOTHING;

-- 4. Hitung progres referral: referral valid setelah 3 transaksi berhasil, 5 referral valid -> Master.
--    Master baru mendapat masa tenggang 2 bulan (transaksi_terakhir_pada diisi bila kosong/kadaluarsa)
--    agar tidak langsung diturunkan oleh downgrade_tier_tidak_aktif.
--    Nama parameter user_id dipertahankan: wa-webhook & migrasi 005 memanggilnya dengan nama itu.
CREATE OR REPLACE FUNCTION public.update_referral_progress(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_transaksi_per_referral CONSTANT int := 3;
  c_referral_untuk_master  CONSTANT int := 5;
  v_pereferensi uuid;
BEGIN
  UPDATE profiles SET transaksi_terakhir_pada = now() WHERE id = user_id;

  SELECT pereferensi_id INTO v_pereferensi
  FROM referral_tracking
  WHERE direferensikan_id = user_id;

  IF v_pereferensi IS NULL THEN
    RETURN;
  END IF;

  UPDATE referral_tracking
  SET jumlah_transaksi_sukses = jumlah_transaksi_sukses + 1,
      syarat_terpenuhi = (jumlah_transaksi_sukses + 1) >= c_transaksi_per_referral
  WHERE direferensikan_id = user_id;

  IF (SELECT count(*)
      FROM referral_tracking
      WHERE pereferensi_id = v_pereferensi
        AND syarat_terpenuhi) >= c_referral_untuk_master THEN
    UPDATE profiles
    SET tier = 'master',
        transaksi_terakhir_pada = CASE
          WHEN transaksi_terakhir_pada IS NULL
            OR transaksi_terakhir_pada < now() - interval '2 months'
          THEN now()
          ELSE transaksi_terakhir_pada
        END
    WHERE id = v_pereferensi
      AND tier <> 'master';
  END IF;
END;
$$;

-- 5. Bonus harian: hanya Master, Rp5.000 tiap kelipatan 10 transaksi berhasil dalam sehari (Asia/Jakarta).
--    Baris profil dikunci dulu supaya dua transaksi yang selesai bersamaan tidak menghitung jumlah yang sama.
CREATE OR REPLACE FUNCTION public.cek_bonus_transaksi_harian(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_bonus     CONSTANT numeric := 5000;
  c_kelipatan CONSTANT int := 10;
  v_tier   text;
  v_jumlah int;
BEGIN
  SELECT tier INTO v_tier FROM profiles WHERE id = user_id FOR UPDATE;

  IF v_tier IS DISTINCT FROM 'master' THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_jumlah
  FROM transaksi
  WHERE agen_id = user_id
    AND status = 'berhasil'
    AND dibuat_pada >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';

  IF v_jumlah > 0 AND v_jumlah % c_kelipatan = 0 THEN
    UPDATE profiles
    SET saldo_bonus_pending = saldo_bonus_pending + c_bonus
    WHERE id = user_id;
  END IF;
END;
$$;

-- CREATE OR REPLACE mempertahankan hak akses lama (migrasi 003: hanya service_role). Ditegaskan ulang:
REVOKE EXECUTE ON FUNCTION public.update_referral_progress(uuid)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cek_bonus_transaksi_harian(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_referral_progress(uuid)   TO service_role;
GRANT  EXECUTE ON FUNCTION public.cek_bonus_transaksi_harian(uuid) TO service_role;

-- 6. Beri kode referral untuk profil lama yang belum punya (saat ditulis: 1 profil).
UPDATE profiles
SET kode_referral = generate_kode_referral(COALESCE(nama, ''))
WHERE kode_referral IS NULL;

-- Rollback bila ada yang rusak:
--   DROP TRIGGER IF EXISTS trg_buat_referral_tracking ON public.profiles;
--   DROP FUNCTION IF EXISTS public.buat_referral_tracking();
--   DROP FUNCTION IF EXISTS public.pasang_referral(text);
--   DROP FUNCTION IF EXISTS public.cek_kode_referral(text);
--   Pulihkan isi lama dua fungsi (dibaca dari database 2026-10-28; keduanya SECURITY DEFINER, tanpa search_path):
--
--   CREATE OR REPLACE FUNCTION public.update_referral_progress(user_id uuid) RETURNS void
--   LANGUAGE plpgsql SECURITY DEFINER AS $$
--   DECLARE
--     pereferensi uuid;
--   BEGIN
--     UPDATE profiles SET transaksi_terakhir_pada = now() WHERE id = user_id;
--     SELECT pereferensi_id INTO pereferensi FROM referral_tracking WHERE direferensikan_id = user_id;
--     IF pereferensi IS NOT NULL THEN
--       UPDATE referral_tracking SET jumlah_transaksi_sukses = jumlah_transaksi_sukses + 1
--       WHERE direferensikan_id = user_id;
--       UPDATE referral_tracking SET syarat_terpenuhi = true
--       WHERE direferensikan_id = user_id AND jumlah_transaksi_sukses >= 3 AND syarat_terpenuhi = false;
--       IF (SELECT count(*) FROM referral_tracking WHERE pereferensi_id = pereferensi AND syarat_terpenuhi = true) >= 10 THEN
--         UPDATE profiles SET tier = 'master' WHERE id = pereferensi AND tier != 'master';
--       END IF;
--     END IF;
--   END;
--   $$;
--
--   CREATE OR REPLACE FUNCTION public.cek_bonus_transaksi_harian(user_id uuid) RETURNS void
--   LANGUAGE plpgsql SECURITY DEFINER AS $$
--   DECLARE
--     jumlah_hari_ini int;
--   BEGIN
--     SELECT count(*) INTO jumlah_hari_ini FROM transaksi
--     WHERE agen_id = user_id AND status = 'sukses' AND dibuat_pada >= date_trunc('day', now());
--     IF jumlah_hari_ini > 0 AND jumlah_hari_ini % 10 = 0 THEN
--       UPDATE profiles SET saldo_bonus_pending = saldo_bonus_pending + 5000 WHERE id = user_id;
--     END IF;
--   END;
--   $$;
