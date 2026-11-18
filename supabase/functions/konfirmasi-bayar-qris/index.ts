import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prosesBayarQris } from "../_shared/bayar-qris.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function balas(isi: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(isi), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Admin mengonfirmasi bahwa pembayaran QRIS sebuah pesanan sudah masuk.
// Pesanan lalu dikirim ke WA Center. (Jalur otomatis lewat notifikasi dibuat terpisah.)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return balas({ error: "Token tidak ditemukan" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;

    // Klien atas nama pemanggil: is_admin() memakai auth.uid() dari token ini
    const klienPemanggil = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await klienPemanggil.auth.getUser();
    if (authError || !user) return balas({ error: "Token tidak valid" }, 401);

    const { data: admin, error: adminError } = await klienPemanggil.rpc("is_admin");
    if (adminError || admin !== true) {
      return balas({ error: "Hanya admin yang boleh mengonfirmasi pembayaran" }, 403);
    }

    const body = await req.json();
    const transaksiId = typeof body?.transaksi_id === "string" ? body.transaksi_id : "";
    if (!/^[0-9a-fA-F-]{36}$/.test(transaksiId)) {
      return balas({ error: "transaksi_id tidak valid" }, 400);
    }

    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const hasil = await prosesBayarQris(service, transaksiId);

    if (hasil.ok) return balas({ status: "pending", pesan: "Pembayaran dikonfirmasi, pesanan dikirim" });
    const status = hasil.kode === "TIDAK_MENUNGGU" ? 409 : hasil.kode === "GAGAL_KIRIM" ? 502 : 500;
    return balas({ error: hasil.pesan, kode: hasil.kode }, status);
  } catch (err) {
    console.error("konfirmasi-bayar-qris error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
