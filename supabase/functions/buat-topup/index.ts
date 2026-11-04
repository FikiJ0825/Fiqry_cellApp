import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmacSha256Hex, konfigDuitku } from "../_shared/duitku.ts";

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

// Batas nominal top up (Duitku sendiri menolak di bawah Rp10.000).
const TOPUP_MIN = Number(Deno.env.get("TOPUP_MIN") ?? 10000);
const TOPUP_MAX = Number(Deno.env.get("TOPUP_MAX") ?? 2000000);
// Kode QRIS Duitku: SP (ShopeePay), NQ (Nobu), SQ (Nusapay).
const METODE_QRIS = Deno.env.get("DUITKU_METODE_QRIS") ?? "NQ";
const EXPIRY_MENIT = Number(Deno.env.get("DUITKU_EXPIRY_MENIT") ?? 15);

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. AUTENTIKASI
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return balas({ error: "Token tidak ditemukan" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return balas({ error: "Token tidak valid" }, 401);

    // 2. VALIDASI INPUT
    const body = await req.json().catch(() => ({}));
    const jumlah = Number(body?.jumlah);
    if (!Number.isInteger(jumlah) || jumlah < TOPUP_MIN || jumlah > TOPUP_MAX) {
      return balas({ error: `Nominal top up harus ${rupiah(TOPUP_MIN)} - ${rupiah(TOPUP_MAX)}` }, 400);
    }

    const cfg = konfigDuitku();
    if (!cfg) {
      console.error("Env DUITKU_MERCHANT_CODE / DUITKU_API_KEY belum diatur");
      return balas({ error: "Top up otomatis belum tersedia, gunakan top up manual via WhatsApp" }, 503);
    }

    const { data: profil, error: profilError } = await supabase
      .from("profiles")
      .select("nama, aktif")
      .eq("id", user.id)
      .single();
    if (profilError || !profil) return balas({ error: "Profil agen tidak ditemukan" }, 400);
    if (profil.aktif === false) return balas({ error: "Akun Anda dinonaktifkan, hubungi admin" }, 403);

    // 3. PAKAI ULANG QR YANG MASIH BERLAKU (nominal sama) supaya tidak menumpuk permintaan
    const sekarang = new Date();
    const { data: lama } = await supabase
      .from("topup_otomatis")
      .select("id, merchant_order_id, jumlah, qr_string, payment_url, kadaluarsa_pada")
      .eq("agen_id", user.id)
      .eq("status", "pending")
      .eq("jumlah", jumlah)
      .gt("kadaluarsa_pada", new Date(sekarang.getTime() + 60_000).toISOString())
      .not("qr_string", "is", null)
      .order("dibuat_pada", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lama) {
      return balas({
        topup_id: lama.id,
        merchant_order_id: lama.merchant_order_id,
        jumlah: lama.jumlah,
        qr_string: lama.qr_string,
        payment_url: lama.payment_url,
        kadaluarsa_pada: lama.kadaluarsa_pada,
      });
    }

    // 4. CATAT PERMINTAAN
    const merchantOrderId = `TP${crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
    const kadaluarsaPada = new Date(sekarang.getTime() + EXPIRY_MENIT * 60_000).toISOString();

    const { data: topup, error: insertError } = await supabase
      .from("topup_otomatis")
      .insert({
        agen_id: user.id,
        merchant_order_id: merchantOrderId,
        jumlah,
        status: "pending",
        kadaluarsa_pada: kadaluarsaPada,
      })
      .select("id")
      .single();
    if (insertError || !topup) {
      console.error("Gagal mencatat topup:", insertError?.message);
      return balas({ error: "Gagal membuat top up" }, 500);
    }

    // 5. MINTA QRIS KE DUITKU
    const callbackUrl = `${supabaseUrl}/functions/v1/duitku-callback`;
    const signature = await hmacSha256Hex(cfg.merchantCode + merchantOrderId + jumlah, cfg.apiKey);

    const tandaiGagal = () =>
      supabase.from("topup_otomatis").update({ status: "gagal" }).eq("id", topup.id).eq("status", "pending");

    let json: Record<string, unknown> | null = null;
    let httpOk = false;
    try {
      const res = await fetch(`${cfg.baseUrl}/v2/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantCode: cfg.merchantCode,
          paymentAmount: jumlah,
          paymentMethod: METODE_QRIS,
          merchantOrderId,
          productDetails: "Top up saldo AdePulsa",
          customerVaName: String(profil.nama ?? "Agen AdePulsa").slice(0, 20),
          email: user.email ?? "agen@adepulsa.app",
          callbackUrl,
          returnUrl: Deno.env.get("DUITKU_RETURN_URL") ?? callbackUrl,
          expiryPeriod: EXPIRY_MENIT,
          signature,
        }),
        signal: AbortSignal.timeout(20000),
      });
      httpOk = res.ok;
      json = await res.json().catch(() => null);
    } catch (err) {
      console.error("Gagal menghubungi Duitku (inquiry):", err);
      await tandaiGagal();
      return balas({ error: "Gagal menghubungi layanan pembayaran, coba lagi nanti" }, 502);
    }

    const qrString = typeof json?.qrString === "string" ? json.qrString : null;
    const paymentUrl = typeof json?.paymentUrl === "string" ? json.paymentUrl : null;

    if (!httpOk || json?.statusCode !== "00" || (!qrString && !paymentUrl)) {
      console.error("Inquiry Duitku ditolak:", JSON.stringify(json));
      await tandaiGagal();
      return balas({ error: "Layanan pembayaran menolak permintaan, coba lagi nanti" }, 502);
    }

    await supabase
      .from("topup_otomatis")
      .update({
        duitku_reference: typeof json?.reference === "string" ? json.reference : null,
        qr_string: qrString,
        payment_url: paymentUrl,
      })
      .eq("id", topup.id);

    return balas({
      topup_id: topup.id,
      merchant_order_id: merchantOrderId,
      jumlah,
      qr_string: qrString,
      payment_url: paymentUrl,
      kadaluarsa_pada: kadaluarsaPada,
    });
  } catch (err) {
    console.error("buat-topup error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
