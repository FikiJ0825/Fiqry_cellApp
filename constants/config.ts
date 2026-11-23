/** Nomor WhatsApp admin (format internasional tanpa +, contoh: 6281234567890) */
export const NOMOR_WA_ADMIN = '6285241909400'

/** Daftar admin untuk tombol bantuan WhatsApp melayang (format internasional tanpa +) */
export const NOMOR_ADMIN_BANTUAN = [
  { label: 'Admin 1', nomor: '6282194186225' },
  { label: 'Admin 2', nomor: '6285241909400' },
] as const

/**
 * Isi QRIS statis milik pemilik (teks hasil decode gambar QRIS, diawali "000201...").
 * Dipakai lib/qris.ts untuk membuat QRIS bernominal. Kosongkan untuk menyembunyikan
 * pilihan bayar QRIS di halaman beli. Payload QRIS bukan rahasia (sama dengan isi gambar QR).
 */
export const QRIS_PAYLOAD_STATIS: string =
  '00020101021126570011ID.DANA.WWW011893600915301484387202090148438720303UMI51440014ID.CO.QRIS.WWW0215ID10254558999440303UMI5204799953033605802ID5913CEO F, Wisata6006Konawe6105934126304D83B'
