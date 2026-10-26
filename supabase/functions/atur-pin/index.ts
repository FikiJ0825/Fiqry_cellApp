import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashPin, periksaPin, POLA_PIN } from "../_shared/pin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function balas(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Buat atau ubah PIN transaksi. Body: { pin, pin_lama? }. pin_lama wajib kalau sudah punya PIN.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return balas({ error: "Token tidak ditemukan" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return balas({ error: "Token tidak valid" }, 401);

    const body = await req.json();
    const pin = body?.pin;
    if (typeof pin !== "string" || !POLA_PIN.test(pin)) {
      return balas({ error: "PIN harus 6 digit angka" }, 400);
    }

    const { data: ada } = await supabase
      .from("pin_agen")
      .select("agen_id")
      .eq("agen_id", user.id)
      .maybeSingle();

    if (ada) {
      const hasil = await periksaPin(supabase, user.id, body?.pin_lama);
      if (!hasil.ok) {
        return balas({ error: hasil.error === "PIN salah" ? "PIN lama salah" : hasil.error, kode: hasil.kode }, hasil.status);
      }
    }

    const { error: simpanError } = await supabase.from("pin_agen").upsert({
      agen_id: user.id,
      pin_hash: await hashPin(pin),
      gagal: 0,
      terkunci_sampai: null,
      diperbarui_pada: new Date().toISOString(),
    });
    if (simpanError) {
      console.error("atur-pin gagal simpan:", simpanError.message);
      return balas({ error: "Gagal menyimpan PIN" }, 500);
    }

    return balas({ pesan: "PIN berhasil disimpan" });
  } catch (err) {
    console.error("atur-pin error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
