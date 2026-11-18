// Membaca teks notifikasi "uang masuk" dari aplikasi merchant (DANA/GoPay/OVO/ShopeePay).
//
// PENTING: pola di bawah ini perkiraan umum. Sesuaikan dengan contoh teks notifikasi asli
// (lihat supabase/checks/uji_notifikasi_bayar.ps1) sebelum dipakai di produksi.

// Kata yang menandakan uang MASUK.
const KATA_MASUK = [/menerima/i, /diterima/i, /uang masuk/i, /dana masuk/i, /pembayaran (qris )?(dari|berhasil)/i, /received/i];

// Kata yang menandakan uang KELUAR atau bukan pembayaran; teks seperti ini selalu ditolak.
const KATA_TOLAK = [/mengirim/i, /dikirim/i, /kamu membayar/i, /anda membayar/i, /top ?up/i, /penarikan/i, /tarik/i, /promo/i, /voucher/i, /cashback/i];

/** "Rp 15.037", "Rp15.037,00", "Rp. 1.250.000" -> 15037, 15037, 1250000. Null bila bukan angka rupiah utuh. */
export function ambilNominal(teks: string): number | null {
  const cocok = teks.match(/Rp\.?\s*([0-9][0-9.,]*)/i);
  if (!cocok) return null;

  let angka = cocok[1].replace(/[.,]+$/, "");
  // Buang bagian desimal ",00" / ",50" (format Indonesia); titik = pemisah ribuan
  angka = angka.replace(/,\d{1,2}$/, "");
  angka = angka.replace(/[.,]/g, "");
  if (!/^\d+$/.test(angka)) return null;

  const nilai = Number(angka);
  return Number.isSafeInteger(nilai) && nilai > 0 ? nilai : null;
}

export type HasilBaca =
  | { ok: true; nominal: number }
  | { ok: false; alasan: string };

export function bacaNotifikasi(teks: string): HasilBaca {
  if (KATA_TOLAK.some((p) => p.test(teks))) {
    return { ok: false, alasan: "Bukan notifikasi uang masuk (kata terlarang)" };
  }
  if (!KATA_MASUK.some((p) => p.test(teks))) {
    return { ok: false, alasan: "Tidak ada kata uang masuk" };
  }
  const nominal = ambilNominal(teks);
  if (nominal === null) return { ok: false, alasan: "Nominal tidak ditemukan" };
  return { ok: true, nominal };
}

/** Bandingkan dua string tanpa bocor waktu (dibandingkan lewat hash SHA-256 yang panjangnya sama). */
export async function samaRahasia(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let beda = 0;
  for (let i = 0; i < va.length; i++) beda |= va[i] ^ vb[i];
  return beda === 0;
}
