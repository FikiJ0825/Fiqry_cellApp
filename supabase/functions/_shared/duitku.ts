// Helper Duitku (Edge Function). Dokumentasi: https://docs.duitku.com/api/en/
//
// Env (Supabase secrets):
//   DUITKU_MERCHANT_CODE, DUITKU_API_KEY
//   DUITKU_BASE_URL  sandbox    https://sandbox.duitku.com/webapi/api/merchant
//                    production https://passport.duitku.com/webapi/api/merchant
//
// Semua signature memakai HMAC-SHA256 (hex huruf kecil) dengan API key; MD5/SHA256 biasa sudah usang.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const BASE_URL_SANDBOX = "https://sandbox.duitku.com/webapi/api/merchant";

export function konfigDuitku() {
  const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE");
  const apiKey = Deno.env.get("DUITKU_API_KEY");
  const baseUrl = (Deno.env.get("DUITKU_BASE_URL") ?? BASE_URL_SANDBOX).replace(/\/+$/, "");
  if (!merchantCode || !apiKey) return null;
  return { merchantCode, apiKey, baseUrl };
}

export async function hmacSha256Hex(pesan: string, kunci: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(kunci),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(pesan));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Perbandingan waktu-tetap supaya signature tidak bisa ditebak lewat selisih waktu. */
export function samaAman(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let selisih = 0;
  for (let i = 0; i < a.length; i++) selisih |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return selisih === 0;
}

export interface StatusDuitku {
  statusCode: string; // 00 sukses, 01 proses, 02 gagal/kedaluwarsa
  amount: number;
  reference: string;
}

/** Tanya status transaksi ke Duitku. Hasil null = gagal menghubungi / respons tidak valid. */
export async function cekStatusDuitku(merchantOrderId: string): Promise<StatusDuitku | null> {
  const cfg = konfigDuitku();
  if (!cfg) return null;

  const signature = await hmacSha256Hex(cfg.merchantCode + merchantOrderId, cfg.apiKey);

  try {
    const res = await fetch(`${cfg.baseUrl}/transactionStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantCode: cfg.merchantCode, merchantOrderId, signature }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || typeof json.statusCode !== "string") {
      console.error("transactionStatus Duitku gagal:", res.status, json?.Message ?? json?.statusMessage);
      return null;
    }
    return {
      statusCode: json.statusCode,
      amount: Number(json.amount),
      reference: String(json.reference ?? ""),
    };
  } catch (err) {
    console.error("Gagal menghubungi Duitku (transactionStatus):", err);
    return null;
  }
}

export type HasilKonfirmasi =
  | "berhasil" // saldo bertambah
  | "sudah_diproses" // sebelumnya sudah dikreditkan
  | "belum_dibayar" // Duitku: masih proses
  | "gagal" // Duitku: gagal / kedaluwarsa
  | "jumlah_tidak_cocok"
  | "tidak_ditemukan"
  | "duitku_tidak_terjangkau"; // minta pemanggil mengulang nanti

/**
 * Sumber kebenaran pembayaran adalah API status Duitku, bukan isi callback/permintaan app.
 * Dipakai oleh callback dan cek manual; kredit saldo ada di RPC kreditkan_topup (idempoten).
 */
export async function konfirmasiDanKredit(
  supabase: SupabaseClient,
  merchantOrderId: string,
): Promise<HasilKonfirmasi> {
  const status = await cekStatusDuitku(merchantOrderId);
  if (!status) return "duitku_tidak_terjangkau";

  if (status.statusCode === "00") {
    const { data, error } = await supabase.rpc("kreditkan_topup", {
      p_order_id: merchantOrderId,
      p_jumlah: status.amount,
      p_reference: status.reference,
    });
    if (error) {
      console.error(`kreditkan_topup gagal (${merchantOrderId}):`, error.message);
      return "duitku_tidak_terjangkau";
    }
    return data as HasilKonfirmasi;
  }

  if (status.statusCode === "01") return "belum_dibayar";

  // 02 = gagal / kedaluwarsa: tutup baris yang masih pending.
  await supabase
    .from("topup_otomatis")
    .update({ status: "kadaluarsa" })
    .eq("merchant_order_id", merchantOrderId)
    .eq("status", "pending");
  return "gagal";
}
