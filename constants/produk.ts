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

export function getKategoriLabel(value: string | null | undefined): string {
  if (!value) return 'Tanpa kategori'
  return KATEGORI_PRODUK.find((k) => k.value === value)?.label ?? value
}
