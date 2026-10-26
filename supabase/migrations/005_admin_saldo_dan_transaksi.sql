-- Migrasi 005: aksi admin atomik untuk saldo agen dan transaksi macet
-- Jalankan di Supabase SQL Editor.
--
--   tambah_saldo_admin(agen, jumlah, catatan)   -> top-up / koreksi saldo + catatan audit
--   selesaikan_transaksi_admin(transaksi, status) -> tutup transaksi pending/diproses secara manual
--
-- Keduanya SECURITY DEFINER, mengecek is_admin() di dalam, dan hanya bisa dipanggil user login.

CREATE TABLE IF NOT EXISTS public.penyesuaian_saldo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agen_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id        uuid NOT NULL,
  jumlah          numeric NOT NULL,                -- positif = tambah, negatif = kurangi
  saldo_sebelum   numeric NOT NULL,
  saldo_sesudah   numeric NOT NULL,
  catatan         text,
  dibuat_pada     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.penyesuaian_saldo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.penyesuaian_saldo FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.penyesuaian_saldo TO service_role;
GRANT SELECT ON public.penyesuaian_saldo TO authenticated;

DROP POLICY IF EXISTS "admin baca penyesuaian saldo" ON public.penyesuaian_saldo;
CREATE POLICY "admin baca penyesuaian saldo" ON public.penyesuaian_saldo
  FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.tambah_saldo_admin(p_agen_id uuid, p_jumlah numeric, p_catatan text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sebelum numeric;
  v_sesudah numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh mengubah saldo' USING ERRCODE = '42501';
  END IF;

  IF p_jumlah IS NULL OR p_jumlah = 0 THEN
    RAISE EXCEPTION 'Jumlah tidak boleh 0' USING ERRCODE = 'P0001';
  END IF;

  SELECT saldo INTO v_sebelum FROM public.profiles WHERE id = p_agen_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agen tidak ditemukan' USING ERRCODE = 'P0001';
  END IF;

  v_sesudah := COALESCE(v_sebelum, 0) + p_jumlah;
  IF v_sesudah < 0 THEN
    RAISE EXCEPTION 'Saldo tidak boleh menjadi negatif' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles SET saldo = v_sesudah WHERE id = p_agen_id;

  INSERT INTO public.penyesuaian_saldo (agen_id, admin_id, jumlah, saldo_sebelum, saldo_sesudah, catatan)
  VALUES (p_agen_id, auth.uid(), p_jumlah, COALESCE(v_sebelum, 0), v_sesudah, NULLIF(trim(p_catatan), ''));

  RETURN v_sesudah;
END;
$$;

REVOKE ALL ON FUNCTION public.tambah_saldo_admin(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tambah_saldo_admin(uuid, numeric, text) TO authenticated;

-- Tutup transaksi yang macet. 'gagal' mengembalikan saldo (saldo_sebelum - saldo_sesudah),
-- 'berhasil' menjalankan progres referral & bonus harian seperti wa-webhook.
CREATE OR REPLACE FUNCTION public.selesaikan_transaksi_admin(p_transaksi_id uuid, p_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trx public.transaksi%ROWTYPE;
  v_refund numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh menyelesaikan transaksi' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('berhasil', 'gagal') THEN
    RAISE EXCEPTION 'Status harus berhasil atau gagal' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_trx FROM public.transaksi WHERE id = p_transaksi_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan' USING ERRCODE = 'P0001';
  END IF;

  IF v_trx.status NOT IN ('pending', 'diproses') THEN
    RAISE EXCEPTION 'Transaksi sudah final (%)', v_trx.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.transaksi
     SET status = p_status,
         pesan_balasan_mentah = COALESCE(pesan_balasan_mentah, '') || ' [ditandai manual oleh admin]'
   WHERE id = p_transaksi_id;

  IF p_status = 'gagal' THEN
    v_refund := v_trx.saldo_sebelum - v_trx.saldo_sesudah;
    IF v_refund > 0 THEN
      PERFORM public.refund_saldo(v_trx.agen_id, v_refund);
    END IF;
  ELSE
    PERFORM public.update_referral_progress(v_trx.agen_id);
    PERFORM public.cek_bonus_transaksi_harian(v_trx.agen_id);
  END IF;

  RETURN p_status;
END;
$$;

REVOKE ALL ON FUNCTION public.selesaikan_transaksi_admin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.selesaikan_transaksi_admin(uuid, text) TO authenticated;
