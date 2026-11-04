-- Migrasi 009: top up saldo otomatis lewat QRIS Duitku
-- Jalankan di Supabase SQL Editor.
--
--   topup_otomatis                      -> satu baris per permintaan top up (juga jejak audit saldo)
--   kreditkan_topup(order, jumlah, ref) -> tambah saldo atomik & idempoten, hanya service_role (dipanggil Edge Function)
--
-- Agen hanya bisa MEMBACA top up miliknya; semua tulis lewat Edge Function (service_role).

CREATE TABLE IF NOT EXISTS public.topup_otomatis (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agen_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  merchant_order_id  text NOT NULL UNIQUE,
  jumlah             numeric NOT NULL CHECK (jumlah > 0),
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'berhasil', 'gagal', 'kadaluarsa')),
  duitku_reference   text,
  qr_string          text,
  payment_url        text,
  kadaluarsa_pada    timestamptz,
  saldo_sebelum      numeric,
  saldo_sesudah      numeric,
  dibuat_pada        timestamptz NOT NULL DEFAULT now(),
  dibayar_pada       timestamptz,
  terakhir_cek_pada  timestamptz   -- pembatas cek manual ke API status Duitku (jangan dipanggil berulang)
);

CREATE INDEX IF NOT EXISTS topup_otomatis_agen_idx
  ON public.topup_otomatis (agen_id, dibuat_pada DESC);

ALTER TABLE public.topup_otomatis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.topup_otomatis FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.topup_otomatis TO service_role;
GRANT SELECT ON public.topup_otomatis TO authenticated;

DROP POLICY IF EXISTS "agen baca topup sendiri" ON public.topup_otomatis;
CREATE POLICY "agen baca topup sendiri" ON public.topup_otomatis
  FOR SELECT USING (agen_id = auth.uid());

DROP POLICY IF EXISTS "admin baca semua topup" ON public.topup_otomatis;
CREATE POLICY "admin baca semua topup" ON public.topup_otomatis
  FOR SELECT USING (public.is_admin());

-- Kredit saldo setelah pembayaran terkonfirmasi. Aman dipanggil berulang (callback Duitku bisa
-- dikirim ulang): saldo hanya bertambah sekali, yaitu saat status belum 'berhasil'.
-- Top up yang sudah ditandai 'kadaluarsa'/'gagal' tetap dikreditkan jika Duitku memastikan uang masuk.
-- Hasil: 'berhasil' | 'sudah_diproses' | 'jumlah_tidak_cocok' | 'tidak_ditemukan'
CREATE OR REPLACE FUNCTION public.kreditkan_topup(p_order_id text, p_jumlah numeric, p_reference text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topup   public.topup_otomatis%ROWTYPE;
  v_sebelum numeric;
  v_sesudah numeric;
BEGIN
  SELECT * INTO v_topup FROM public.topup_otomatis WHERE merchant_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'tidak_ditemukan';
  END IF;

  IF v_topup.status = 'berhasil' THEN
    RETURN 'sudah_diproses';
  END IF;

  IF v_topup.jumlah <> p_jumlah THEN
    RETURN 'jumlah_tidak_cocok';
  END IF;

  SELECT saldo INTO v_sebelum FROM public.profiles WHERE id = v_topup.agen_id FOR UPDATE;
  v_sebelum := COALESCE(v_sebelum, 0);
  v_sesudah := v_sebelum + v_topup.jumlah;

  UPDATE public.profiles SET saldo = v_sesudah WHERE id = v_topup.agen_id;

  UPDATE public.topup_otomatis
     SET status = 'berhasil',
         duitku_reference = COALESCE(NULLIF(p_reference, ''), duitku_reference),
         saldo_sebelum = v_sebelum,
         saldo_sesudah = v_sesudah,
         dibayar_pada = now()
   WHERE id = v_topup.id;

  RETURN 'berhasil';
END;
$$;

REVOKE ALL ON FUNCTION public.kreditkan_topup(text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kreditkan_topup(text, numeric, text) TO service_role;

-- Realtime: layar top up di app menunggu perubahan status baris ini.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'topup_otomatis'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.topup_otomatis;
  END IF;
END $$;
