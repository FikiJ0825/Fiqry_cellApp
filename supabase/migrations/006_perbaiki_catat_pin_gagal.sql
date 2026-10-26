-- Migrasi 006: perbaiki catat_pin_gagal (dibuat di migrasi 004)
--
-- Bug: fungsi mengembalikan nilai kolom terkunci_sampai. Setelah sekali terkunci, kolom itu
-- tetap berisi tanggal lama (sudah lewat), sehingga PIN salah biasa pun dianggap "baru terkunci"
-- dan pesan "PIN terkunci 15 menit" muncul padahal belum terkunci.
-- Perbaikan: kembalikan boolean TRUE hanya saat penguncian baru terjadi pada pemanggilan ini,
-- dan bersihkan tanggal kunci lama yang sudah lewat.
--
-- Jalankan di Supabase SQL Editor. Tidak perlu deploy ulang edge function.

DROP FUNCTION IF EXISTS public.catat_pin_gagal(uuid);

CREATE FUNCTION public.catat_pin_gagal(p_agen_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gagal_baru integer;
BEGIN
  SELECT CASE WHEN terkunci_sampai IS NOT NULL AND terkunci_sampai <= now() THEN 0 ELSE gagal END + 1
    INTO v_gagal_baru
    FROM public.pin_agen
   WHERE agen_id = p_agen_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_gagal_baru >= 5 THEN
    UPDATE public.pin_agen
       SET gagal = 0, terkunci_sampai = now() + interval '15 minutes'
     WHERE agen_id = p_agen_id;
    RETURN true;
  END IF;

  UPDATE public.pin_agen
     SET gagal = v_gagal_baru,
         terkunci_sampai = CASE WHEN terkunci_sampai <= now() THEN NULL ELSE terkunci_sampai END
   WHERE agen_id = p_agen_id;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.catat_pin_gagal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catat_pin_gagal(uuid) TO service_role;

-- Bersihkan sisa kunci lama dari tes sebelumnya
UPDATE public.pin_agen SET gagal = 0, terkunci_sampai = NULL
 WHERE terkunci_sampai IS NOT NULL AND terkunci_sampai <= now();
