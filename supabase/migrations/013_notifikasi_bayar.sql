-- Migrasi 013: konfirmasi pembayaran QRIS otomatis dari notifikasi aplikasi merchant (QRIS Tahap 2)
-- Jalankan di Supabase SQL Editor SEBELUM men-deploy Edge Function terima-notifikasi-bayar.
-- Membutuhkan migrasi 011 (transaksi QRIS) dan 012 (topup_qris).
--
--   notifikasi_bayar                  -> jejak audit tiap notifikasi yang diterima (cocok / tidak)
--   cocokkan_pembayaran_qris(nominal) -> cari satu pesanan/top up yang menunggu dengan total_bayar = nominal
--
-- total_bayar (nominal + kode unik 1-99) sudah unik di antara semua pesanan yang menunggu
-- (indeks unik parsial di transaksi dan topup_qris, serta dicek silang saat dibuat), jadi nominal pada
-- notifikasi cukup untuk menunjuk tepat satu pesanan.

CREATE TABLE IF NOT EXISTS public.notifikasi_bayar (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teks        text NOT NULL,
  nominal     numeric,
  hasil       text NOT NULL CHECK (hasil IN ('cocok', 'tidak_cocok', 'ditolak', 'gagal_proses')),
  ref_tipe    text CHECK (ref_tipe IN ('transaksi', 'topup')),
  ref_id      uuid,
  catatan     text,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifikasi_bayar_dibuat_idx ON public.notifikasi_bayar (dibuat_pada DESC);

ALTER TABLE public.notifikasi_bayar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifikasi_bayar FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.notifikasi_bayar TO service_role;
GRANT SELECT ON public.notifikasi_bayar TO authenticated;

-- Hanya admin yang boleh membaca jejak notifikasi (isinya bisa memuat nama pengirim uang).
DROP POLICY IF EXISTS "admin baca notifikasi_bayar" ON public.notifikasi_bayar;
CREATE POLICY "admin baca notifikasi_bayar" ON public.notifikasi_bayar
  FOR SELECT USING (public.is_admin());

-- Cari pesanan yang menunggu dengan total_bayar = p_nominal.
-- Mengembalikan {"tipe": "transaksi"|"topup", "id": uuid} bila TEPAT SATU yang cocok dan belum lewat
-- batas waktu + toleransi 10 menit (notifikasi bisa terlambat sedikit). Selain itu mengembalikan NULL.
-- Baris yang sudah berstatus gagal (mis. dibersihkan karena kedaluwarsa) sengaja tidak dicocokkan:
-- admin menanganinya manual dari Admin > Transaksi.
CREATE OR REPLACE FUNCTION public.cocokkan_pembayaran_qris(p_nominal numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batas  timestamptz := now() - interval '10 minutes';
  v_trx    uuid[];
  v_top    uuid[];
BEGIN
  IF p_nominal IS NULL OR p_nominal <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO v_trx
    FROM public.transaksi
   WHERE status = 'menunggu_pembayaran'
     AND metode_bayar = 'qris'
     AND total_bayar = p_nominal
     AND (kedaluwarsa_at IS NULL OR kedaluwarsa_at >= v_batas);

  SELECT COALESCE(array_agg(id), '{}') INTO v_top
    FROM public.topup_qris
   WHERE status = 'menunggu_pembayaran'
     AND total_bayar = p_nominal
     AND (kedaluwarsa_at IS NULL OR kedaluwarsa_at >= v_batas);

  IF coalesce(array_length(v_trx, 1), 0) + coalesce(array_length(v_top, 1), 0) <> 1 THEN
    RETURN NULL;
  END IF;

  IF coalesce(array_length(v_trx, 1), 0) = 1 THEN
    RETURN jsonb_build_object('tipe', 'transaksi', 'id', v_trx[1]);
  END IF;
  RETURN jsonb_build_object('tipe', 'topup', 'id', v_top[1]);
END;
$$;

REVOKE ALL ON FUNCTION public.cocokkan_pembayaran_qris(numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cocokkan_pembayaran_qris(numeric) TO service_role;
