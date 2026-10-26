-- Migrasi 004: PIN transaksi agen (6 digit, di-hash di server)
-- Jalankan di Supabase SQL Editor.
--
-- Tabel pin_agen TIDAK punya policy untuk klien (RLS aktif, semua hak dicabut): hash PIN hanya
-- dibaca/ditulis Edge Function (service_role). Klien hanya boleh tanya "sudah punya PIN?"
-- lewat RPC punya_pin().

CREATE TABLE IF NOT EXISTS public.pin_agen (
  agen_id            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash           text NOT NULL,                 -- format "salt_hex:hash_hex" (PBKDF2-SHA256)
  gagal              integer NOT NULL DEFAULT 0,    -- percobaan salah berturut-turut
  terkunci_sampai    timestamptz,
  diperbarui_pada    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_agen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pin_agen FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pin_agen TO service_role;

-- Klien: apakah saya sudah punya PIN?
CREATE OR REPLACE FUNCTION public.punya_pin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.pin_agen WHERE agen_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.punya_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.punya_pin() TO authenticated;

-- Catat PIN salah: setelah 5x berturut-turut kunci 15 menit lalu reset hitungan.
CREATE OR REPLACE FUNCTION public.catat_pin_gagal(p_agen_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kunci timestamptz;
BEGIN
  UPDATE public.pin_agen
     SET gagal = CASE WHEN gagal + 1 >= 5 THEN 0 ELSE gagal + 1 END,
         terkunci_sampai = CASE WHEN gagal + 1 >= 5 THEN now() + interval '15 minutes'
                                ELSE terkunci_sampai END
   WHERE agen_id = p_agen_id
  RETURNING terkunci_sampai INTO v_kunci;
  RETURN v_kunci;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_pin_gagal(p_agen_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pin_agen SET gagal = 0, terkunci_sampai = NULL WHERE agen_id = p_agen_id;
$$;

REVOKE ALL ON FUNCTION public.catat_pin_gagal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_pin_gagal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catat_pin_gagal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_pin_gagal(uuid) TO service_role;
