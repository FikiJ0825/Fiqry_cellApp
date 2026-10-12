-- Migrasi 003: tutup celah hak akses fungsi dan policy INSERT
-- Dasar temuan (diperiksa langsung di database 2026-10-12):
--   * refund_saldo, potong_saldo_atomic, update_referral_progress, cek_bonus_transaksi_harian,
--     downgrade_tier_tidak_aktif dapat dieksekusi role anon & authenticated (default PUBLIC).
--     Kunci anon key tertanam di app, jadi siapa pun bisa memanggil rpc() langsung.
--     (refund/potong saldo sudah dinetralkan trigger 002, tapi fungsi bonus/referral belum.)
--   * policy "Agen insert transaksi sendiri": agen bisa INSERT baris transaksi sendiri dengan
--     saldo_sebelum/saldo_sesudah/status bebas. wa-webhook menghitung refund dari selisih
--     kedua kolom itu, sehingga baris palsu + satu balasan "gagal" = refund dengan nominal bebas.
--   * policy "user insert klaim miliknya": agen bisa membuat klaim_bonus dengan jumlah bebas.
--     Klaim kini lewat RPC klaim_bonus_referral() (migrasi 002).
--
-- Semua yang dicabut hanya dipanggil dari: Edge Function (service_role), pg_cron (postgres),
-- atau fungsi SECURITY DEFINER lain. Klien app hanya memakai get_email_by_nomor_wa,
-- klaim_bonus_referral dan is_admin (lewat RLS).

REVOKE EXECUTE ON FUNCTION public.refund_saldo(uuid, numeric)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.potong_saldo_atomic(uuid, numeric)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_referral_progress(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cek_bonus_transaksi_harian(uuid)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.downgrade_tier_tidak_aktif()           FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refund_saldo(uuid, numeric)             TO service_role;
GRANT EXECUTE ON FUNCTION public.potong_saldo_atomic(uuid, numeric)      TO service_role;
GRANT EXECUTE ON FUNCTION public.update_referral_progress(uuid)          TO service_role;
GRANT EXECUTE ON FUNCTION public.cek_bonus_transaksi_harian(uuid)        TO service_role;
GRANT EXECUTE ON FUNCTION public.downgrade_tier_tidak_aktif()            TO service_role;

DROP POLICY IF EXISTS "Agen insert transaksi sendiri" ON public.transaksi;
DROP POLICY IF EXISTS "user insert klaim miliknya"    ON public.klaim_bonus;

-- Rollback bila ada yang rusak:
--   GRANT EXECUTE ON FUNCTION public.<nama>(<args>) TO anon, authenticated;
--   CREATE POLICY "Agen insert transaksi sendiri" ON public.transaksi FOR INSERT WITH CHECK (agen_id = auth.uid());
--   CREATE POLICY "user insert klaim miliknya"    ON public.klaim_bonus FOR INSERT WITH CHECK (agen_id = auth.uid());
