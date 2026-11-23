import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import type { NamaIkonProduk } from '../components/ui/IkonProduk'
import type { PastelNama } from './theme'

/** Kategori produk; nilai disimpan di kolom produk.kategori */
export const KATEGORI_PRODUK = [
  { value: 'pulsa', label: 'Pulsa' },
  { value: 'paket_data', label: 'Paket Data' },
  { value: 'listrik', label: 'Token Listrik' },
  { value: 'e_wallet', label: 'E-Wallet' },
  { value: 'game', label: 'Game' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'bpjs', label: 'BPJS' },
  { value: 'pdam', label: 'PDAM' },
  { value: 'tv_kabel', label: 'TV Kabel' },
] as const

export type KategoriProduk = (typeof KATEGORI_PRODUK)[number]['value']

export type IoniconName = ComponentProps<typeof Ionicons>['name']

/** Ikon dan warna pastel tiap kategori, dipakai di Beranda dan layar Produk */
export const TAMPILAN_KATEGORI: Record<KategoriProduk, { ikon: IoniconName | NamaIkonProduk; warna: PastelNama }> = {
  pulsa: { ikon: 'pulsa', warna: 'rose' },
  paket_data: { ikon: 'paket_data', warna: 'sky' },
  listrik: { ikon: 'listrik', warna: 'butter' },
  e_wallet: { ikon: 'e_wallet', warna: 'mint' },
  game: { ikon: 'game', warna: 'lilac' },
  wifi: { ikon: 'wifi', warna: 'peach' },
  bpjs: { ikon: 'bpjs', warna: 'mint' },
  pdam: { ikon: 'pdam', warna: 'sky' },
  tv_kabel: { ikon: 'tv_kabel', warna: 'lilac' },
}

export function getKategoriLabel(value: string | null | undefined): string {
  if (!value) return 'Tanpa kategori'
  return KATEGORI_PRODUK.find((k) => k.value === value)?.label ?? value
}
