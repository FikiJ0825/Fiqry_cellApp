import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { konfirmasiDanKredit } from "../_shared/duitku.ts";

// Cek manual status top up, dipakai app bila callback Duitku terlambat.
// Dibatasi per top up (terakhir_cek_pada) karena Duitku memblokir merchant yang menembak
// API status berulang-ulang.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function balas(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const JEDA_CEK_DETIK = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return balas({ error: "Token tidak ditemukan" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return balas({ error: "Token tidak valid" }, 401);

    const body = await req.json().catch(() => ({}));
    const topupId = typeof body?.topup_id === "string" ? body.topup_id : "";
    if (!topupId) return balas({ error: "topup_id wajib diisi" }, 400);

    const { data: topup } = await supabase
      .from("topup_otomatis")
      .select("id, merchant_order_id, status, terakhir_cek_pada")
      .eq("id", topupId)
      .eq("agen_id", user.id)
      .maybeSingle();
    if (!topup) return balas({ error: "Top up tidak ditemukan" }, 404);

    // Sudah final: tidak perlu tanya Duitku.
    if (topup.status === "berhasil") return balas({ status: "berhasil" });

    const terakhir = topup.terakhir_cek_pada ? new Date(topup.terakhir_cek_pada).getTime() : 0;
    if (Date.now() - terakhir < JEDA_CEK_DETIK * 1000) {
      return balas({ status: topup.status, ditunda: true });
    }

    await supabase
      .from("topup_otomatis")
      .update({ terakhir_cek_pada: new Date().toISOString() })
      .eq("id", topup.id);

    const hasil = await konfirmasiDanKredit(supabase, topup.merchant_order_id);

    if (hasil === "duitku_tidak_terjangkau") {
      return balas({ error: "Gagal memeriksa status pembayaran, coba lagi sebentar lagi" }, 502);
    }

    const { data: terbaru } = await supabase
      .from("topup_otomatis")
      .select("status")
      .eq("id", topup.id)
      .single();

    return balas({ status: terbaru?.status ?? topup.status });
  } catch (err) {
    console.error("cek-topup error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
