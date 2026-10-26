-- Cek read-only: apakah migrasi 002 & 003 benar-benar aktif di database?
-- Jalankan di Supabase SQL Editor. Tidak mengubah apa pun.

-- 1. Trigger penjaga kolom profiles (harus ada 1 baris, tgenabled = 'O')
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_jaga_kolom_profiles';

-- 2. Hak eksekusi RPC sensitif: anon_bisa & authenticated_bisa harus FALSE semua
SELECT f.proname,
       has_function_privilege('anon', f.oid, 'EXECUTE')          AS anon_bisa,
       has_function_privilege('authenticated', f.oid, 'EXECUTE') AS authenticated_bisa
FROM pg_proc f
JOIN pg_namespace n ON n.oid = f.pronamespace
WHERE n.nspname = 'public'
  AND f.proname IN ('refund_saldo', 'potong_saldo_atomic', 'update_referral_progress',
                    'cek_bonus_transaksi_harian', 'downgrade_tier_tidak_aktif');

-- 3. klaim_bonus_referral: anon_bisa harus FALSE, authenticated_bisa TRUE
SELECT f.proname,
       has_function_privilege('anon', f.oid, 'EXECUTE')          AS anon_bisa,
       has_function_privilege('authenticated', f.oid, 'EXECUTE') AS authenticated_bisa
FROM pg_proc f
JOIN pg_namespace n ON n.oid = f.pronamespace
WHERE n.nspname = 'public' AND f.proname = 'klaim_bonus_referral';

-- 4. Policy INSERT klien pada transaksi & klaim_bonus: harus 0 baris
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('transaksi', 'klaim_bonus')
  AND cmd IN ('INSERT', 'ALL');

-- 5. Semua policy pada profiles & transaksi (tinjau manual: agen hanya boleh SELECT miliknya)
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'transaksi', 'produk');
