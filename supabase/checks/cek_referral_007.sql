-- Cek read-only setelah migrasi 007 dijalankan. Tidak mengubah apa pun.
-- Jalankan di Supabase SQL Editor atau: npx supabase db query --linked --project-ref <ref> -f supabase/checks/cek_referral_007.sql

-- 1. Fungsi baru ada dan memakai search_path (kolom config harus berisi search_path=public)
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig AS config
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('cek_kode_referral', 'pasang_referral', 'buat_referral_tracking',
                    'update_referral_progress', 'cek_bonus_transaksi_harian')
ORDER BY p.proname;

-- 2. Hak eksekusi: cek_kode_referral anon=TRUE auth=TRUE; pasang_referral anon=FALSE auth=TRUE;
--    tiga fungsi lainnya anon=FALSE auth=FALSE
SELECT f.proname,
       has_function_privilege('anon', f.oid, 'EXECUTE')          AS anon_bisa,
       has_function_privilege('authenticated', f.oid, 'EXECUTE') AS authenticated_bisa
FROM pg_proc f
WHERE f.pronamespace = 'public'::regnamespace
  AND f.proname IN ('cek_kode_referral', 'pasang_referral', 'buat_referral_tracking',
                    'update_referral_progress', 'cek_bonus_transaksi_harian')
ORDER BY f.proname;

-- 3. Trigger pelacak referral aktif (tgenabled = 'O')
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_buat_referral_tracking';

-- 4. Semua profil punya kode referral (profil_tanpa_kode harus 0)
SELECT count(*) FILTER (WHERE kode_referral IS NULL) AS profil_tanpa_kode FROM public.profiles;

-- 5. Isi fungsi progres memakai syarat 5 referral (harus ada angka 5 dan 3)
SELECT proname,
       prosrc LIKE '%c_referral_untuk_master  CONSTANT int := 5%' AS syarat_5_referral,
       prosrc LIKE '%c_transaksi_per_referral CONSTANT int := 3%' AS syarat_3_transaksi
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname = 'update_referral_progress';
