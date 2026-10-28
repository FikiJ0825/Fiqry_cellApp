import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
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
export const TAMPILAN_KATEGORI: Record<KategoriProduk, { ikon: IoniconName; warna: PastelNama }> = {
  pulsa: { ikon: 'phone-portrait-outline', warna: 'rose' },
  paket_data: { ikon: 'wifi-outline', warna: 'sky' },
  listrik: { ikon: 'flash-outline', warna: 'butter' },
  e_wallet: { ikon: 'wallet-outline', warna: 'mint' },
  game: { ikon: 'game-controller-outline', warna: 'lilac' },
  wifi: { ikon: 'globe-outline', warna: 'peach' },
  bpjs: { ikon: 'medkit-outline', warna: 'mint' },
  pdam: { ikon: 'water-outline', warna: 'sky' },
  tv_kabel: { ikon: 'tv-outline', warna: 'lilac' },
}

export function getKategoriLabel(value: string | null | undefined): string {
  if (!value) return 'Tanpa kategori'
  return KATEGORI_PRODUK.find((k) => k.value === value)?.label ?? value
}
