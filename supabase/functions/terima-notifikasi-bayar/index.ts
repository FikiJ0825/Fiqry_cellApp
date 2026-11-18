import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prosesBayarQris } from "../_shared/bayar-qris.ts";
import { bacaNotifikasi, samaRahasia } from "../_shared/notif-bayar.ts";

// QRIS Tahap 2: menerima notifikasi "uang masuk" yang diteruskan dari HP pemilik (aplikasi peneruspesan
// seperti MacroDroid/Tasker) lalu mengonfirmasi otomatis pesanan/top up QRIS yang total bayarnya sama.
//
// Dideploy dengan verify_jwt=false (pemanggilnya bukan pengguna Supabase); keamanan memakai header
// rahasia x-notif-secret yang dibandingkan dengan env NOTIF_BAYAR_SECRET.
// Jika tidak ada yang cocok, tidak terjadi apa-apa: admin tetap bisa mengonfirmasi dari Admin > Transaksi.

const MAKS_TEKS = 2000;

function balas(isi: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(isi), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Aplikasi peneruspesan berbeda-beda: terima JSON {teks|text|message|body}, atau teks mentah.
async function ambilTeks(req: Request): Promise<string> {
  const mentah = (await req.text()).slice(0, MAKS_TEKS * 2);
  try {
    const json = JSON.parse(mentah);
    if (json && typeof json === "object") {
      for (const kunci of ["teks", "text", "message", "body", "isi"]) {
        if (typeof json[kunci] === "string") return json[kunci].slice(0, MAKS_TEKS);
      }
      return "";
    }
  } catch {
    // bukan JSON: pakai teks apa adanya
  }
  return mentah.slice(0, MAKS_TEKS);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return balas({ error: "Metode tidak diizinkan" }, 405);

  try {
    const rahasia = Deno.env.get("NOTIF_BAYAR_SECRET");
    const url = Deno.env.get("SUPABASE_URL");
    const kunciService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!rahasia || rahasia.length < 24 || !url || !kunciService) {
      console.error("Env NOTIF_BAYAR_SECRET (min. 24 karakter) / SUPABASE_URL / SERVICE_ROLE_KEY belum lengkap");
      return balas({ error: "Konfigurasi server belum lengkap" }, 500);
    }

    const kiriman = req.headers.get("x-notif-secret") ?? "";
    if (!(await samaRahasia(kiriman, rahasia))) return balas({ error: "Tidak diizinkan" }, 401);

    const teks = (await ambilTeks(req)).trim();
    if (!teks) return balas({ error: "Teks notifikasi kosong" }, 400);

    const service = createClient(url, kunciService);

    const catat = async (
      hasil: "cocok" | "tidak_cocok" | "ditolak" | "gagal_proses",
      ekstra: { nominal?: number | null; ref_tipe?: string; ref_id?: string; catatan?: string } = {},
    ) => {
      const { error } = await service.from("notifikasi_bayar").insert({
        teks,
        hasil,
        nominal: ekstra.nominal ?? null,
        ref_tipe: ekstra.ref_tipe ?? null,
        ref_id: ekstra.ref_id ?? null,
        catatan: ekstra.catatan ?? null,
      });
      if (error) console.error("Gagal mencatat notifikasi_bayar:", error.message);
    };

    const baca = bacaNotifikasi(teks);
    if (!baca.ok) {
      await catat("ditolak", { catatan: baca.alasan });
      return balas({ hasil: "ditolak" });
    }

    const { data: cocok, error: errCocok } = await service.rpc("cocokkan_pembayaran_qris", {
      p_nominal: baca.nominal,
    });
    if (errCocok) {
      console.error("cocokkan_pembayaran_qris gagal:", errCocok.message);
      await catat("gagal_proses", { nominal: baca.nominal, catatan: "Pencocokan gagal: " + errCocok.message });
      return balas({ error: "Gagal memproses" }, 500);
    }
    if (!cocok) {
      await catat("tidak_cocok", {
        nominal: baca.nominal,
        catatan: "Tidak ada (atau lebih dari satu) pesanan menunggu dengan total ini",
      });
      return balas({ hasil: "tidak_cocok" });
    }

    if (cocok.tipe === "topup") {
      const { data: berhasil, error } = await service.rpc("kreditkan_topup_qris", {
        p_id: cocok.id,
        p_oleh: null,
      });
      if (error) {
        console.error("kreditkan_topup_qris gagal:", error.message);
        await catat("gagal_proses", {
          nominal: baca.nominal, ref_tipe: "topup", ref_id: cocok.id, catatan: error.message,
        });
        return balas({ error: "Gagal memproses" }, 500);
      }
      await catat(berhasil ? "cocok" : "tidak_cocok", {
        nominal: baca.nominal,
        ref_tipe: "topup",
        ref_id: cocok.id,
        catatan: berhasil ? "Top up dikreditkan otomatis" : "Top up sudah diproses sebelumnya",
      });
      return balas({ hasil: berhasil ? "cocok" : "tidak_cocok" });
    }

    // Pembelian produk: logika yang sama dengan konfirmasi admin (atomik, refund bila gagal kirim)
    const hasil = await prosesBayarQris(service, cocok.id);
    if (hasil.ok) {
      await catat("cocok", {
        nominal: baca.nominal, ref_tipe: "transaksi", ref_id: cocok.id, catatan: "Pesanan dikirim otomatis",
      });
      return balas({ hasil: "cocok" });
    }
    await catat(hasil.kode === "TIDAK_MENUNGGU" ? "tidak_cocok" : "gagal_proses", {
      nominal: baca.nominal, ref_tipe: "transaksi", ref_id: cocok.id, catatan: hasil.pesan,
    });
    return balas({ hasil: hasil.kode === "TIDAK_MENUNGGU" ? "tidak_cocok" : "gagal_proses" });
  } catch (err) {
    console.error("terima-notifikasi-bayar error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
