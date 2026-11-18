// QRIS statis -> QRIS dinamis (bernominal) di sisi klien.
//
// Payload QRIS mengikuti format TLV EMV: tiap elemen = ID(2 digit) + panjang(2 digit) + isi.
// Mengubah statis jadi dinamis:
//   1. tag 01 (Point of Initiation) dari "11" (statis) menjadi "12" (dinamis)
//   2. sisipkan tag 54 (Transaction Amount) sebelum tag 58 (Country Code), urut naik by ID
//   3. hitung ulang CRC16-CCITT (tag 63) atas seluruh payload
// Nama merchant dan tujuan dana tidak berubah, jadi uang tetap masuk ke QRIS pemilik.

interface Tlv {
  id: string
  isi: string
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) dalam 4 hex huruf besar. */
export function hitungCrc16(teks: string): string {
  let crc = 0xffff
  for (let i = 0; i < teks.length; i++) {
    crc ^= teks.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function urai(payload: string): Tlv[] {
  const hasil: Tlv[] = []
  let i = 0
  while (i < payload.length) {
    const id = payload.slice(i, i + 2)
    const panjang = Number(payload.slice(i + 2, i + 4))
    if (id.length < 2 || !Number.isInteger(panjang) || payload.length < i + 4 + panjang) {
      throw new Error('Payload QRIS tidak valid')
    }
    hasil.push({ id, isi: payload.slice(i + 4, i + 4 + panjang) })
    i += 4 + panjang
  }
  return hasil
}

function rakit(daftar: Tlv[]): string {
  return daftar.map((t) => `${t.id}${String(t.isi.length).padStart(2, '0')}${t.isi}`).join('')
}

/** Apakah CRC di ujung payload cocok (dipakai memvalidasi payload hasil decode JPG). */
export function crcValid(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== '6304') return false
  return hitungCrc16(payload.slice(0, -4)) === payload.slice(-4)
}

/**
 * Bangun payload QRIS dinamis dari payload statis.
 * @param payloadStatis isi QRIS statis (hasil decode gambar JPG), harus lolos crcValid
 * @param nominal rupiah bulat > 0 (sudah termasuk kode unik)
 */
export function buatQrisDinamis(payloadStatis: string, nominal: number): string {
  if (!Number.isInteger(nominal) || nominal <= 0) throw new Error('Nominal QRIS tidak valid')
  const bersih = payloadStatis.trim()
  if (!crcValid(bersih)) throw new Error('Payload QRIS statis tidak valid (CRC tidak cocok)')

  // Buang tag 63 (CRC lama) dan tag 54 bila payload asli sudah punya nominal
  const elemen = urai(bersih).filter((t) => t.id !== '63' && t.id !== '54')

  const tag01 = elemen.find((t) => t.id === '01')
  if (!tag01) throw new Error('Payload QRIS tidak memiliki tag 01')
  tag01.isi = '12'

  elemen.push({ id: '54', isi: String(nominal) })
  elemen.sort((a, b) => Number(a.id) - Number(b.id))

  const tanpaCrc = `${rakit(elemen)}6304`
  return `${tanpaCrc}${hitungCrc16(tanpaCrc)}`
}
