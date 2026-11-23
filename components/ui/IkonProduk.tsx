import { ReactNode } from 'react'
import Svg, { Path } from 'react-native-svg'

/**
 * Ikon khas tiap kategori produk (gaya line, 24x24, stroke 2).
 * Sumber path: Tabler Icons (outline), lisensi MIT, https://tabler.io/icons
 */
const IKON_PRODUK = {
  pulsa: [
    'M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14',
    'M11 4h2',
    'M12 17v.01',
  ],
  paket_data: ['M6 18l0 -3', 'M10 18l0 -6', 'M14 18l0 -9', 'M18 18l0 -12'],
  listrik: ['M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11'],
  e_wallet: [
    'M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12',
    'M20 12v4h-4a2 2 0 0 1 0 -4h4',
  ],
  game: [
    'M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1 -3.923 -2.035l1.634 -8.173a5 5 0 0 1 4.904 -4.019h3.4',
    'M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925 -2.023l-1.6 -8.232',
    'M8 9v2',
    'M7 10h2',
    'M14 10h2',
  ],
  wifi: [
    'M12 18l.01 0',
    'M9.172 15.172a4 4 0 0 1 5.656 0',
    'M6.343 12.343a8 8 0 0 1 11.314 0',
    'M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0',
  ],
  bpjs: [
    'M8 8v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2',
    'M4 10a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -8',
    'M10 14h4',
    'M12 12v4',
  ],
  pdam: [
    'M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546',
  ],
  tv_kabel: [
    'M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -9',
    'M16 3l-4 4l-4 -4',
  ],
} as const

export type NamaIkonProduk = keyof typeof IKON_PRODUK

export function adalahIkonProduk(nama: string): nama is NamaIkonProduk {
  return nama in IKON_PRODUK
}

interface Props {
  nama: NamaIkonProduk
  warna: string
  ukuran: number
}

export default function IkonProduk({ nama, warna, ukuran }: Props) {
  const elemen: ReactNode[] = IKON_PRODUK[nama].map((d, i) => (
    <Path key={i} d={d} />
  ))
  return (
    <Svg width={ukuran} height={ukuran} viewBox="0 0 24 24" fill="none" stroke={warna} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {elemen}
    </Svg>
  )
}
