// Kirim pesan ke WA Center lewat wa-bridge. Dipakai create-transaction (pesan pertama) dan
// wa-webhook (kirim ulang format transaksi ganda).

/**
 * - "terkirim": bridge menjawab OK.
 * - "pasti_tidak_terkirim": bridge menjawab error / konfigurasi belum lengkap; pesan jelas tidak
 *   sampai ke WA Center, aman di-refund.
 * - "tidak_pasti": timeout / koneksi putus; pesan MUNGKIN sudah terkirim, jangan refund otomatis
 *   supaya tidak rugi dobel, perlu cek manual oleh admin.
 */
export type HasilKirim = "terkirim" | "pasti_tidak_terkirim" | "tidak_pasti";

export async function kirimKeWaCenter(pesan: string): Promise<HasilKirim> {
  const waBridgeUrl = Deno.env.get("WA_BRIDGE_URL");
  const waCenterNumber = Deno.env.get("WA_CENTER_NUMBER");
  const waBridgeSecret = Deno.env.get("WA_BRIDGE_SECRET");

  if (!waBridgeUrl || !waCenterNumber || !waBridgeSecret) {
    console.error("Env WA_BRIDGE_URL / WA_CENTER_NUMBER / WA_BRIDGE_SECRET belum lengkap");
    return "pasti_tidak_terkirim";
  }

  const kirim = () =>
    fetch(`${waBridgeUrl}/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${waBridgeSecret}`,
      },
      body: JSON.stringify({ nomor_tujuan: waCenterNumber, pesan }),
      signal: AbortSignal.timeout(15000),
    });

  try {
    let respons = await kirim();

    // 503 = bridge menolak SEBELUM mengirim (WhatsApp belum terhubung di connector yang kebetulan
    // terpilih), jadi aman dicoba sekali lagi tanpa risiko pesan terkirim ganda. Cloudflare membagi
    // request antar-connector, percobaan kedua bisa mengenai bridge yang sehat.
    if (respons.status === 503) {
      console.warn("WA Bridge menjawab 503, mencoba ulang sekali");
      await new Promise((selesai) => setTimeout(selesai, 1000));
      respons = await kirim();
    }

    if (!respons.ok) {
      console.error("WA Bridge menjawab status", respons.status);
      return "pasti_tidak_terkirim";
    }
    return "terkirim";
  } catch (err) {
    console.error("Gagal menghubungi WA Bridge:", err);
    return "tidak_pasti";
  }
}
