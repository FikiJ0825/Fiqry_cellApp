-- Migrasi 010: detail transaksi untuk agen (SN + catatan) dan pengamanan wa_log
-- Jalankan di Supabase SQL Editor SEBELUM men-deploy create-transaction dan wa-webhook versi baru.
--
--   transaksi.sn       -> nomor seri / voucher dari provider, terisi saat transaksi berhasil
--   transaksi.catatan  -> keterangan singkat yang aman dibaca agen (sudah dibersihkan di wa-webhook)
--   wa_log             -> RLS diaktifkan tanpa policy: hanya service_role (Edge Function) yang bisa
--                         membaca/menulis. Isinya teks mentah WA Center yang memuat saldo dan harga
--                         modal master (mis. "H=10128 S=6848389"), tidak boleh terbaca agen.
--
-- Aman dijalankan ulang.

ALTER TABLE public.transaksi
  ADD COLUMN IF NOT EXISTS sn      text,
  ADD COLUMN IF NOT EXISTS catatan text;

ALTER TABLE IF EXISTS public.wa_log ENABLE ROW LEVEL SECURITY;
