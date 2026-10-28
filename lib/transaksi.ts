import { Colors, PastelNama } from '../constants/theme'

export type StatusTransaksi = 'pending' | 'diproses' | 'berhasil' | 'gagal'

export const STATUS_TRANSAKSI: { value: StatusTransaksi; label: string }[] = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'berhasil', label: 'Berhasil' },
  { value: 'gagal', label: 'Gagal' },
]

export function getStatusLabel(status: string): string {
  return STATUS_TRANSAKSI.find((s) => s.value === status)?.label ?? status
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'berhasil':
      return Colors.success
    case 'gagal':
      return Colors.error
    case 'diproses':
    case 'pending':
      return Colors.warning
    default:
      return Colors.grey
  }
}

/** Warna pastel untuk pil/ikon status transaksi */
export function getStatusPastel(status: string): PastelNama {
  switch (status) {
    case 'berhasil':
      return 'mint'
    case 'gagal':
      return 'rose'
    case 'diproses':
    case 'pending':
      return 'butter'
    default:
      return 'sky'
  }
}

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Contoh: 26 Okt 2026, 14:05 */
export function formatWaktu(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const jam = String(d.getHours()).padStart(2, '0')
  const menit = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}, ${jam}:${menit}`
}

/** Awal hari ini (waktu perangkat) dalam ISO, untuk filter "hari ini". */
export function awalHariIniIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
