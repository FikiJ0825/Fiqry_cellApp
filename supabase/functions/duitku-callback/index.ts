import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmacSha256Hex, konfigDuitku, konfirmasiDanKredit, samaAman } from "../_shared/duitku.ts";

// Callback pembayaran dari Duitku (POST application/x-www-form-urlencoded).
// verify_jwt = false (lihat config.toml) dan URL-nya publik, jadi keaslian dijaga dua lapis:
//   1. signature HMAC-SHA256(merchantCode + amount + merchantOrderId) harus cocok;
//   2. status dikonfirmasi ulang ke API transactionStatus Duitku sebelum saldo ditambah.
// Duitku mengirim ulang callback (maks 5x) bila tidak mendapat HTTP 200, jadi:
//   - 200 hanya untuk callback valid yang sudah selesai diproses;
//   - 5xx bila Duitku tidak terjangkau supaya dicoba lagi.

const teks = (isi: string, status = 200) =>
  new Response(isi, { status, headers: { "Content-Type": "text/plain" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return teks("Method not allowed", 405);

  try {
    const cfg = konfigDuitku();
    if (!cfg) {
      console.error("Env DUITKU_MERCHANT_CODE / DUITKU_API_KEY belum diatur");
      return teks("Server belum dikonfigurasi", 500);
    }

    const form = await req.formData();
    const ambil = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : "";
    };

    const merchantCode = ambil("merchantCode");
    const amount = ambil("amount");
    const merchantOrderId = ambil("merchantOrderId");
    const resultCode = ambil("resultCode");
    const signature = ambil("signature");

    if (!merchantCode || !amount || !merchantOrderId || !signature) {
      return teks("Bad request", 400);
    }

    const diharapkan = await hmacSha256Hex(merchantCode + amount + merchantOrderId, cfg.apiKey);
    if (merchantCode !== cfg.merchantCode || !samaAman(diharapkan.toLowerCase(), signature.toLowerCase())) {
      console.error(`Signature callback tidak valid (order ${merchantOrderId})`);
      return teks("Wrong signature", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (resultCode !== "00") {
      // Pembayaran gagal: tutup baris yang masih pending. Top up yang sudah berhasil tidak disentuh.
      await supabase
        .from("topup_otomatis")
        .update({ status: "gagal" })
        .eq("merchant_order_id", merchantOrderId)
        .eq("status", "pending");
      return teks("OK");
    }

    const hasil = await konfirmasiDanKredit(supabase, merchantOrderId);

    if (hasil === "duitku_tidak_terjangkau") return teks("Retry later", 503);

    if (hasil === "jumlah_tidak_cocok" || hasil === "tidak_ditemukan") {
      // Callback bertanda tangan benar tapi tidak bisa dicocokkan: catat untuk dicek manual,
      // jangan minta Duitku mengulang (hasilnya akan sama).
      console.error(`Callback tidak bisa dikreditkan: ${hasil} (order ${merchantOrderId}, amount ${amount})`);
    }

    return teks("OK");
  } catch (err) {
    console.error("duitku-callback error:", err);
    return teks("Error", 500);
  }
});
