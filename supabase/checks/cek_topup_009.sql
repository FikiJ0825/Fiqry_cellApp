-- Cek migrasi 009 (top up Duitku). Jalankan di Supabase SQL Editor setelah migrasi dijalankan.
-- Semua hasil di bawah harus sesuai komentar di sampingnya.

-- 1. Tabel ada dan RLS aktif -> relrowsecurity = true
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'topup_otomatis';

-- 2. Agen biasa TIDAK punya hak tulis -> hanya SELECT (service_role punya semua)
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'topup_otomatis'
ORDER BY grantee, privilege_type;

-- 3. kreditkan_topup hanya bisa dieksekusi service_role -> tidak ada baris untuk anon/authenticated
SELECT grantee
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'kreditkan_topup'
ORDER BY grantee;

-- 4. Tabel ikut Realtime -> 1 baris
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'topup_otomatis';

-- 5. Uji idempotensi (ganti <AGEN_ID>, jalankan blok ini sekaligus; semuanya dibatalkan di akhir)
-- Harapan: hasil 1 'berhasil', hasil 2 'sudah_diproses', saldo hanya bertambah 10000 sekali,
-- hasil 3 'jumlah_tidak_cocok'.
-- BEGIN;
--   INSERT INTO public.topup_otomatis (agen_id, merchant_order_id, jumlah)
--   VALUES ('<AGEN_ID>', 'UJI-TOPUP-1', 10000), ('<AGEN_ID>', 'UJI-TOPUP-2', 10000);
--   SELECT saldo AS saldo_awal FROM public.profiles WHERE id = '<AGEN_ID>';
--   SELECT public.kreditkan_topup('UJI-TOPUP-1', 10000, 'REF-UJI') AS hasil_1;
--   SELECT public.kreditkan_topup('UJI-TOPUP-1', 10000, 'REF-UJI') AS hasil_2;
--   SELECT public.kreditkan_topup('UJI-TOPUP-2', 5000,  'REF-UJI') AS hasil_3;
--   SELECT saldo AS saldo_akhir FROM public.profiles WHERE id = '<AGEN_ID>';
-- ROLLBACK;
