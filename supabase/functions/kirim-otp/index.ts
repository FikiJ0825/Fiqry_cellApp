import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { nomorWaValid, normalisasiNomorWa } from "../_shared/nomor.ts";
import { buatKodeOtp, hashOtp } from "../_shared/otp.ts";
import { kirimPesanWa } from "../_shared/wa-center.ts";

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

// Kirim kode OTP 6 digit ke WhatsApp calon pengguna. Dipanggil dari layar Daftar (pemanggil memakai
// kunci anon, belum login). Pembatasan kirim (60 detik, 3x/jam per nomor) ada di database.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const kunciService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !kunciService) {
      console.error("SUPABASE_URL / SERVICE_ROLE_KEY belum tersedia");
      return balas({ error: "Konfigurasi server belum lengkap" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const nomor = normalisasiNomorWa(typeof body?.nomor_wa === "string" ? body.nomor_wa : "");
    if (!nomorWaValid(nomor)) return balas({ error: "Nomor WhatsApp tidak valid" }, 400);

    const service = createClient(url, kunciService);

    const { data: ada } = await service.from("profiles").select("id").eq("nomor_wa", nomor).maybeSingle();
    if (ada) return balas({ error: "Nomor WhatsApp sudah terdaftar" }, 409);

    const kode = buatKodeOtp();
    const hash = await hashOtp(kunciService, nomor, kode);

    const { error: errBuat } = await service.rpc("buat_otp_wa", { p_nomor: nomor, p_hash: hash });
    if (errBuat) {
      // P0001 = pesan pembatasan yang memang ditujukan untuk pengguna
      if (errBuat.code === "P0001") return balas({ error: errBuat.message }, 429);
      console.error("buat_otp_wa gagal:", errBuat.message);
      return balas({ error: "Gagal membuat kode, coba lagi" }, 500);
    }

    const hasil = await kirimPesanWa(
      nomor,
      `Kode verifikasi AdePulsa Anda: *${kode}*\nBerlaku 5 menit. Jangan berikan kode ini kepada siapa pun.`,
    );
    if (hasil !== "terkirim") {
      return balas({ error: "Gagal mengirim kode ke WhatsApp. Pastikan nomor aktif lalu coba lagi" }, 502);
    }

    return balas({ status: "terkirim" });
  } catch (err) {
    console.error("kirim-otp error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
