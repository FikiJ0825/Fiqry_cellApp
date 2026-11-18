import { susunPesanRequest } from "./balasan.ts";
import { kirimKeWaCenter } from "./wa-center.ts";

// Logika bersama "pesanan QRIS sudah dibayar -> kirim ke WA Center".
// Dipakai oleh konfirmasi-bayar-qris (admin) dan, nanti, penerima notifikasi pembayaran otomatis.

export type HasilBayarQris =
  | { ok: true }
  | { ok: false; kode: "TIDAK_MENUNGGU" | "KONFIG" | "GAGAL_KIRIM"; pesan: string };

// deno-lint-ignore no-explicit-any
export async function prosesBayarQris(supabase: any, transaksiId: string): Promise<HasilBayarQris> {
  const pinMaster = Deno.env.get("PIN_MASTER");
  if (!pinMaster) {
    console.error("Env PIN_MASTER belum diatur");
    return { ok: false, kode: "KONFIG", pesan: "Konfigurasi server belum lengkap" };
  }

  // Atomik: hanya satu pemanggil yang berhasil mengubah menunggu_pembayaran -> pending
  const { data: trx, error } = await supabase.rpc("tandai_dibayar_qris", {
    p_transaksi_id: transaksiId,
  });
  if (error) {
    console.error("tandai_dibayar_qris gagal:", error.message);
    return { ok: false, kode: "KONFIG", pesan: "Gagal memproses pembayaran" };
  }
  if (!trx) {
    return { ok: false, kode: "TIDAK_MENUNGGU", pesan: "Pesanan tidak lagi menunggu pembayaran" };
  }

  const pesan = susunPesanRequest(trx.kode_produk, trx.nomor_tujuan, pinMaster, 1);
  const hasilKirim = await kirimKeWaCenter(pesan);
  if (hasilKirim === "terkirim") return { ok: true };

  // Pembayaran sudah diterima tetapi pesan gagal dikirim.
  // "pasti_tidak_terkirim": aman dikreditkan ke saldo pengguna (setara refund transaksi saldo).
  // "tidak_pasti": pesan mungkin sudah sampai, jangan kredit otomatis; admin cek manual.
  const direfund = hasilKirim === "pasti_tidak_terkirim";
  if (direfund) {
    const { error: refundError } = await supabase.rpc("refund_saldo", {
      p_agen_id: trx.agen_id,
      p_jumlah: trx.harga,
    });
    if (refundError) {
      console.error(
        `KREDIT SALDO GAGAL transaksi ${trx.id} (agen ${trx.agen_id}, Rp${trx.harga}):`,
        refundError.message,
      );
    }
  }

  await supabase
    .from("transaksi")
    .update({
      status: "gagal",
      pesan_balasan_mentah: direfund
        ? "Gagal mengirim ke WA Bridge (pembayaran QRIS dikreditkan ke saldo)"
        : "Gagal mengirim ke WA Bridge (status pengiriman tidak pasti, cek manual)",
      catatan: direfund
        ? "Pembayaran diterima tetapi transaksi gagal diproses. Nilainya sudah masuk ke saldo Anda."
        : "Pembayaran diterima, status pengiriman tidak pasti. Hubungi admin.",
    })
    .eq("id", trx.id);

  return {
    ok: false,
    kode: "GAGAL_KIRIM",
    pesan: direfund
      ? "Gagal menghubungi server transaksi, pembayaran dikreditkan ke saldo pengguna."
      : "Pengiriman tidak pasti, cek manual sebelum mencoba lagi.",
  };
}
