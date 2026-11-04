// Logika murni (tanpa Deno/Supabase) untuk membaca balasan WA Center (JW Administrasi) dan
// menyusun pesan request. Dipisah supaya bisa diuji dengan Node.

export type TipeBalasan = "berhasil" | "gagal" | "diproses" | "duplikat" | "tidak_dikenal";

export interface HasilBalasan {
  tipe: TipeBalasan;
  kode_produk?: string;
  nomor_tujuan?: string;
  /** Nomor seri/voucher dari provider, hanya untuk transaksi berhasil */
  sn?: string;
  /** Teks aman untuk agen. JANGAN isi dengan teks mentah: balasan JW memuat saldo & harga modal master. */
  catatan?: string;
}

/** Batas urutan format transaksi ganda (KODE.N.TUJUAN.PIN); lewat ini transaksi digagalkan */
export const MAKS_FORMAT_KE = 5;

export const CATATAN = {
  berhasil: "Transaksi berhasil diproses.",
  diproses: "Transaksi sedang diproses, mohon ditunggu ya kak.",
  // Masalah di sisi master (PIN/nomor bot/saldo master): agen tidak perlu dan tidak boleh tahu detailnya
  internal: "Transaksi tidak dapat diproses saat ini. Silakan coba lagi nanti atau hubungi admin.",
  nomor: "Nomor tujuan tidak valid atau tidak sesuai operator produk yang dipilih.",
  gangguan: "Produk sedang mengalami gangguan. Silakan coba beberapa saat lagi.",
  gagalUmum: "Transaksi gagal diproses.",
  gandaTerlaluBanyak: "Transaksi ke nomor yang sama sudah terlalu sering hari ini. Silakan coba lagi besok.",
} as const;

const BATAS_CATATAN = 200;

/**
 * Buang semua yang tidak boleh dilihat agen dari teks WA Center: harga modal (H=), saldo master (S=,
 * "Saldo Rp…", "Sisa saldo …"), nominal Rp apa pun, dan ID provider "<PJI123>".
 */
export function bersihkanTeks(teks: string): string {
  return teks
    .replace(/<[^>]*>/g, " ")
    .replace(/\b[HS]\s*=\s*[\d.,]+/gi, " ")
    .replace(/\b(sisa\s+)?saldo(\s+(saat\s+ini|anda))?\s*:?\s*(rp\.?\s*)?[\d.,]+/gi, " ")
    .replace(/\brp\.?\s*[\d.,]+/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:-]+|[\s.,;:-]+$/g, "")
    .slice(0, BATAS_CATATAN);
}

const POLA_GANGGUAN = /gangguan|maintenance|offline|sedang tutup|stok\s+(kosong|habis)|kosong|tidak tersedia/i;
const POLA_NOMOR_SALAH =
  /tidak valid|invalid|salah nomor|nomor.{0,20}salah|tidak sesuai|bukan nomor|di\s?luar area|operator/i;

/** Pilih catatan gagal untuk agen dari teks sisa balasan (setelah KODE.TUJUAN.STATUS) */
function catatanGagal(sisaTeks: string): string {
  if (POLA_GANGGUAN.test(sisaTeks)) return CATATAN.gangguan;
  if (POLA_NOMOR_SALAH.test(sisaTeks)) return CATATAN.nomor;
  const bersih = bersihkanTeks(sisaTeks);
  return bersih ? bersih : CATATAN.gagalUmum;
}

// Tujuan boleh huruf+angka karena create-transaction mengizinkan ID game, bukan hanya nomor HP.
// Penanda urutan "KODE.2.TUJUAN" (transaksi ganda) opsional.
// Contoh: "TSEL10.081234567890.SUCCESS.150000", "5.2.085241.GAGAL.150000"
const POLA_STATUS =
  /^(\w+)\.(?:\d{1,2}\.)?([A-Za-z0-9]+)\.(SUCCESS|SUKSES|BERHASIL|GAGAL|FAILED|FAIL|BATAL|REJECT)\b/i;
// Balasan H2H dari provider yang diteruskan JW: "RFM<PJI3290880>SN: 0432… H=10128 S=6848389"
const POLA_SN = /\bSN\s*[:=]\s*([A-Za-z0-9-]{6,})/i;
// Perkiraan format gagal H2H ("RFM<ID> … GAGAL …"); disetel ulang dari teks asli di wa_log
const POLA_GAGAL_H2H = /^\w{1,8}<[\w-]+>.*\b(GAGAL|FAILED|DITOLAK|TIDAK VALID|INVALID)\b/i;
const POLA_DUPLIKAT = /Trx ini sdh dilakukan/i;
const POLA_DUPLIKAT_AWAL = /^(\w+)\.([A-Za-z0-9]+)\s/;
const POLA_SALDO_KURANG = /TRX (\w+)\.([A-Za-z0-9]+) tdk diproses, saldo/i;
const POLA_PIN_SALAH = /kode PIN Anda salah/i;
const POLA_BELUM_TERDAFTAR = /No HP Anda belum terdaftar|Transaksi tidak dapat diproses/i;
const POLA_LUAR_AREA = /pembelian (\w+)\.([A-Za-z0-9]+) gagal diproses, No ponsel diluar area/i;
const POLA_DIPROSES = /Pembelian (\w+)\.([A-Za-z0-9]+) Transaksi sdng dlm proses/i;

export function parseBalasan(teks: string): HasilBalasan {
  const status = teks.match(POLA_STATUS);
  if (status) {
    const kode_produk = status[1];
    const nomor_tujuan = status[2];
    const kata = status[3].toUpperCase();
    if (["SUCCESS", "SUKSES", "BERHASIL"].includes(kata)) {
      return { tipe: "berhasil", kode_produk, nomor_tujuan, sn: teks.match(POLA_SN)?.[1], catatan: CATATAN.berhasil };
    }
    // Sisa setelah "KODE.TUJUAN.GAGAL": buang segmen deposit di ujung, sisanya alasan dari WA Center
    // (bersihkan dulu supaya "saldo Rp.150000" hilang utuh, baru sisa angka deposit di ujung dibuang)
    const sisa = bersihkanTeks(teks.slice(status[0].length)).replace(/[\s.,]*[\d.,]+\s*$/, "");
    return { tipe: "gagal", kode_produk, nomor_tujuan, catatan: catatanGagal(sisa) };
  }

  const sn = teks.match(POLA_SN);
  if (sn) {
    return { tipe: "berhasil", sn: sn[1], catatan: CATATAN.berhasil };
  }

  if (POLA_DUPLIKAT.test(teks)) {
    const awal = teks.match(POLA_DUPLIKAT_AWAL);
    return { tipe: "duplikat", kode_produk: awal?.[1], nomor_tujuan: awal?.[2] };
  }

  const saldoKurang = teks.match(POLA_SALDO_KURANG);
  if (saldoKurang) {
    return { tipe: "gagal", kode_produk: saldoKurang[1], nomor_tujuan: saldoKurang[2], catatan: CATATAN.internal };
  }

  if (POLA_PIN_SALAH.test(teks)) {
    return { tipe: "gagal", catatan: CATATAN.internal };
  }

  if (POLA_BELUM_TERDAFTAR.test(teks)) {
    return { tipe: "gagal", catatan: CATATAN.internal };
  }

  const luarArea = teks.match(POLA_LUAR_AREA);
  if (luarArea) {
    return { tipe: "gagal", kode_produk: luarArea[1], nomor_tujuan: luarArea[2], catatan: CATATAN.nomor };
  }

  if (POLA_GAGAL_H2H.test(teks)) {
    return { tipe: "gagal", catatan: catatanGagal(teks) };
  }

  const diproses = teks.match(POLA_DIPROSES);
  if (diproses) {
    return { tipe: "diproses", kode_produk: diproses[1], nomor_tujuan: diproses[2], catatan: CATATAN.diproses };
  }

  return { tipe: "tidak_dikenal" };
}

// =====================
// FORMAT REQUEST KE WA CENTER
// =====================

/** Format biasa `KODE.TUJUAN.PIN`; transaksi ganda ke-N memakai `KODE.N.TUJUAN.PIN` (N >= 2) */
export function susunPesanRequest(kode: string, tujuan: string, pin: string, ke: number): string {
  return ke <= 1 ? `${kode}.${tujuan}.${pin}` : `${kode}.${ke}.${tujuan}.${pin}`;
}

/** Versi tersamar (PIN master tidak boleh tercatat di tabel) untuk kolom transaksi.pesan_request */
export function susunPesanTersimpan(kode: string, tujuan: string, ke: number): string {
  return susunPesanRequest(kode, tujuan, "****", ke);
}

/**
 * Urutan format yang terakhir dikirim, dibaca dari pesan_request tersimpan. Tiga segmen sebelum
 * "****" = ada penanda urutan; dua segmen = format biasa (tujuan minimal 4 karakter, jadi tidak ambigu).
 */
export function formatKeDariPesan(pesanTersimpan: string | null | undefined): number {
  const cocok = pesanTersimpan?.match(/^\w+\.(\d{1,2})\.[A-Za-z0-9]{4,30}\.\*{4}$/);
  return cocok ? Number(cocok[1]) : 1;
}
