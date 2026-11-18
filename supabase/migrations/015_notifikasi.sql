-- Migrasi 015: notifikasi dalam aplikasi (in-app)
-- Jalankan di Supabase SQL Editor. Membutuhkan migrasi 011 (status menunggu_pembayaran), 012 (topup_qris)
-- dan 005 (penyesuaian_saldo).
--
--   notifikasi                       -> satu baris per pemberitahuan untuk seorang pengguna
--   trigger pada transaksi           -> status berhasil / gagal / pesanan QRIS dibatalkan
--   trigger pada topup_qris          -> top up berhasil
--   trigger pada penyesuaian_saldo   -> saldo ditambah / dikurangi admin
--   tandai_notifikasi_dibaca(id)     -> tandai satu (atau semua bila id kosong) sudah dibaca
--
-- Realtime diaktifkan supaya badge dan toast di aplikasi langsung muncul.

CREATE TABLE IF NOT EXISTS public.notifikasi (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agen_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jenis       text NOT NULL CHECK (jenis IN ('transaksi', 'topup', 'saldo')),
  judul       text NOT NULL,
  isi         text NOT NULL,
  ref_id      uuid,
  dibaca      boolean NOT NULL DEFAULT false,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifikasi_agen_idx ON public.notifikasi (agen_id, dibuat_pada DESC);

ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifikasi FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.notifikasi TO service_role;
GRANT SELECT ON public.notifikasi TO authenticated;

DROP POLICY IF EXISTS "pengguna baca notifikasi sendiri" ON public.notifikasi;
CREATE POLICY "pengguna baca notifikasi sendiri" ON public.notifikasi
  FOR SELECT USING (agen_id = auth.uid());

-- Rupiah bertitik ribuan tanpa bergantung pada locale server: 15000 -> 'Rp 15.000'
CREATE OR REPLACE FUNCTION public.rupiah_teks(p_nilai numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'Rp ' || replace(to_char(COALESCE(p_nilai, 0), 'FM999,999,999,999'), ',', '.');
$$;

-- Transaksi: hanya saat status berubah menjadi berhasil / gagal
CREATE OR REPLACE FUNCTION public.notif_transaksi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nama   text;
  v_produk text;
BEGIN
  -- Kegagalan membuat notifikasi tidak boleh menggagalkan perubahan status transaksi
  BEGIN
    SELECT nama INTO v_nama FROM public.produk WHERE kode_produk = NEW.kode_produk LIMIT 1;
    v_produk := COALESCE(v_nama, NEW.kode_produk) || ' ke ' || NEW.nomor_tujuan;

    IF NEW.status = 'berhasil' THEN
      INSERT INTO public.notifikasi (agen_id, jenis, judul, isi, ref_id)
      VALUES (NEW.agen_id, 'transaksi', 'Transaksi berhasil', v_produk || ' sudah berhasil diproses.', NEW.id);

    ELSIF NEW.status = 'gagal' AND OLD.status = 'menunggu_pembayaran' THEN
      -- Pesanan QRIS yang tidak jadi dibayar (batal / waktu habis): tidak ada uang yang perlu dikembalikan
      INSERT INTO public.notifikasi (agen_id, jenis, judul, isi, ref_id)
      VALUES (NEW.agen_id, 'transaksi', 'Pesanan QRIS dibatalkan',
              v_produk || ' tidak diproses karena pembayaran tidak diterima tepat waktu.', NEW.id);

    ELSIF NEW.status = 'gagal' THEN
      INSERT INTO public.notifikasi (agen_id, jenis, judul, isi, ref_id)
      VALUES (NEW.agen_id, 'transaksi', 'Transaksi gagal',
              v_produk || ' gagal diproses. Nilainya dikembalikan ke saldo Anda.', NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notif_transaksi gagal: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notif_transaksi() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notif_transaksi ON public.transaksi;
CREATE TRIGGER trg_notif_transaksi
AFTER UPDATE OF status ON public.transaksi
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('berhasil', 'gagal'))
EXECUTE FUNCTION public.notif_transaksi();

-- Top up QRIS berhasil
CREATE OR REPLACE FUNCTION public.notif_topup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifikasi (agen_id, jenis, judul, isi, ref_id)
    VALUES (NEW.agen_id, 'topup', 'Top up berhasil',
            'Saldo bertambah ' || public.rupiah_teks(NEW.jumlah) || '.', NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notif_topup gagal: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notif_topup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notif_topup ON public.topup_qris;
CREATE TRIGGER trg_notif_topup
AFTER UPDATE OF status ON public.topup_qris
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'berhasil')
EXECUTE FUNCTION public.notif_topup();

-- Penyesuaian saldo oleh admin
CREATE OR REPLACE FUNCTION public.notif_penyesuaian_saldo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifikasi (agen_id, jenis, judul, isi, ref_id)
    VALUES (
      NEW.agen_id, 'saldo',
      CASE WHEN NEW.jumlah >= 0 THEN 'Saldo ditambahkan' ELSE 'Saldo dikurangi' END,
      CASE WHEN NEW.jumlah >= 0 THEN 'Admin menambah saldo Anda ' ELSE 'Admin mengurangi saldo Anda ' END
        || public.rupiah_teks(abs(NEW.jumlah)) || '.'
        || COALESCE(' Catatan: ' || NEW.catatan, ''),
      NEW.id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notif_penyesuaian_saldo gagal: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notif_penyesuaian_saldo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notif_penyesuaian_saldo ON public.penyesuaian_saldo;
CREATE TRIGGER trg_notif_penyesuaian_saldo
AFTER INSERT ON public.penyesuaian_saldo
FOR EACH ROW
EXECUTE FUNCTION public.notif_penyesuaian_saldo();

-- Tandai dibaca: satu notifikasi, atau semua milik sendiri bila p_id kosong.
-- Mengembalikan jumlah baris yang diubah.
CREATE OR REPLACE FUNCTION public.tandai_notifikasi_dibaca(p_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jumlah integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus login' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notifikasi
     SET dibaca = true
   WHERE agen_id = auth.uid()
     AND dibaca = false
     AND (p_id IS NULL OR id = p_id);
  GET DIAGNOSTICS v_jumlah = ROW_COUNT;
  RETURN v_jumlah;
END;
$$;

REVOKE ALL ON FUNCTION public.tandai_notifikasi_dibaca(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tandai_notifikasi_dibaca(uuid) TO authenticated;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifikasi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifikasi;
  END IF;
END $$;
