import { Platform, ViewStyle } from 'react-native'
import { ms, s } from '../lib/skala'

/**
 * Palet baru: Terang = blush pink + crimson #E5203A + burgundy (ref. Gradient & Burgundy);
 * Gelap = Royal Charcoal + vanilla #FFFCD0 + crimson (ref. Vanillia & Royal Charcoal). Dua mode (terang & gelap) dengan nama token yang sama; dipilih lewat useTheme().
 */
export interface ThemeColors {
  /** Isi tombol, chip terpilih, indikator (selalu crimson #E5203A) */
  primary: string
  /** Teks/ikon penekanan crimson tua di atas latar netral (di mode gelap lebih terang agar terbaca) */
  primaryDark: string
  /** Tint latar lembut berwarna crimson (BUKAN untuk warna teks) */
  primaryLight: string
  /** Teks/ikon merah di atas latar netral (kontras >= 4.5:1 di background & surface) */
  accent: string
  background: string
  surface: string
  surfaceAlt: string
  border: string
  textPrimary: string
  textSecondary: string
  /** Teks di atas isi crimson (tombol primer, chip terpilih) */
  textWhite: string
  success: string
  warning: string
  error: string
  grey: string
  /** Latar header bawaan (Stack native) */
  header: string
  /** Permukaan gelap penuh (dipakai langka) */
  ink: string
  /** Teks di atas gradien/hero merah — pakai ini, bukan pastel.*.bg */
  onHeader: string
  /** Teks sekunder di atas gradien/hero merah */
  onHeaderSoft: string
  /** Gradien hero (kartu saldo/banner) */
  heroFrom: string
  heroTo: string
  /** Gradien latar layar */
  bgFrom: string
  bgTo: string
  /** Bar navigasi bawah */
  navBar: string
  navBarEnd: string
  navIcon: string
  navBubble: string
  navBubbleIcon: string
  navRing: string
  /** Garis tepi lengkungan tab bar (terang di mode gelap supaya lekukan terlihat) */
  navRim: string
}

export const LightColors: ThemeColors = {
  primary: '#E5203A',
  primaryDark: '#660F24',
  primaryLight: '#FFDBE8',
  accent: '#D41E38',
  background: '#FFF4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F8E6EA',
  border: '#F1DDE0',
  textPrimary: '#1D1015',
  textSecondary: '#6E4A55',
  textWhite: '#FFFFFF',
  success: '#2F6F46',
  warning: '#9A5B0B',
  error: '#C62833',
  grey: '#A38D93',
  header: '#E5203A',
  ink: '#1D1015',
  onHeader: '#FFFFFF',
  onHeaderSoft: 'rgba(255,255,255,0.88)',
  heroFrom: '#E5203A',
  heroTo: '#660F24',
  bgFrom: '#FFF7FA',
  bgTo: '#FFE6EE',
  navBar: '#421B29',
  navBarEnd: '#1D1015',
  navIcon: '#D28B96',
  navBubble: '#FFF1F5',
  navBubbleIcon: '#E5203A',
  navRing: '#E5203A',
  navRim: 'rgba(0,0,0,0)',
}

export const DarkColors: ThemeColors = {
  primary: '#E5203A',
  primaryDark: '#FF94B2',
  primaryLight: '#3A2228',
  accent: '#FF94B2',
  background: '#1E2023',
  surface: '#2A2C30',
  surfaceAlt: '#33353A',
  border: '#47484C',
  textPrimary: '#FFFCD0',
  textSecondary: '#A6A4A9',
  textWhite: '#FFFFFF',
  success: '#6FBF8A',
  warning: '#E0B055',
  error: '#FF7A82',
  grey: '#807E83',
  header: '#262323',
  ink: '#1E1F22',
  onHeader: '#FFFFFF',
  onHeaderSoft: 'rgba(255,255,255,0.88)',
  heroFrom: '#E5203A',
  heroTo: '#660F24',
  bgFrom: '#1E2023',
  bgTo: '#1E1F22',
  navBar: '#1E1F22',
  navBarEnd: '#262323',
  navIcon: '#A6A4A9',
  navBubble: '#FFFCD0',
  navBubbleIcon: '#E5203A',
  navRing: '#E5203A',
  navRim: '#807E83',
}

export interface PastelWarna {
  bg: string
  fg: string
  teks: string
}

/** Warna latar (bg), ikon (fg), dan teks (teks) bernuansa teredam agar serasi dengan merah-hitam */
export const PastelTerang = {
  rose: { bg: '#FFDBE8', fg: '#E5203A', teks: '#8A1630' },
  peach: { bg: '#F3E6D8', fg: '#B8742F', teks: '#7D4A14' },
  mint: { bg: '#DFEBE1', fg: '#3F7A55', teks: '#2B5B3D' },
  sky: { bg: '#DFE8EE', fg: '#4A6F8F', teks: '#33516B' },
  butter: { bg: '#F3EACB', fg: '#A8801A', teks: '#6E5410' },
  lilac: { bg: '#E9E1E6', fg: '#6D4A63', teks: '#4F3447' },
}

export type PastelNama = keyof typeof PastelTerang
export type PastelSet = Record<PastelNama, PastelWarna>

export const PastelGelap: PastelSet = {
  rose: { bg: 'rgba(255,148,178,0.16)', fg: '#FF94B2', teks: '#FFB8CC' },
  peach: { bg: 'rgba(224,161,92,0.16)', fg: '#E0A15C', teks: '#EDBF8A' },
  mint: { bg: 'rgba(111,191,138,0.16)', fg: '#6FBF8A', teks: '#9AD7AF' },
  sky: { bg: 'rgba(127,169,204,0.16)', fg: '#7FA9CC', teks: '#A5C4DF' },
  butter: { bg: 'rgba(224,188,82,0.16)', fg: '#E0BC52', teks: '#EBD083' },
  lilac: { bg: 'rgba(181,138,168,0.16)', fg: '#B58AA8', teks: '#CBAAC0' },
}

// Ukuran dasar dinaikkan (body ~15.5) mengikuti aplikasi seperti My Telkomsel / DANA, lalu diskalakan
// menurut lebar layar lewat lib/skala (font setengah kekuatan, jarak & radius penuh).
export const FontSize = {
  xs: ms(11.5),
  sm: ms(12.5),
  md: ms(14),
  lg: ms(15.5),
  xl: ms(18),
  xxl: ms(22),
}

/** Poppins per bobot (di Android fontWeight tidak memilih bobot font kustom, jadi pakai fontFamily) */
export const Font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const

// Gaya minimalis (ringkas seperti My Telkomsel): radius & jarak lebih rapat dari versi sebelumnya
export const Radius = {
  sm: s(8),
  md: s(12),
  lg: s(16),
  xl: s(22),
  full: 999,
}

export const Spacing = {
  xs: s(3),
  sm: s(6),
  md: s(10),
  lg: s(14),
  xl: s(16),
  xxl: s(20),
}

export interface ThemeShadow {
  card: ViewStyle
  float: ViewStyle
}

const bayangan = (warna: string, elevation: number, opacity: number, radius: number, offsetY: number): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: warna,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation, shadowColor: warna },
    web: { boxShadow: `0px ${offsetY}px ${radius}px ${warna}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` },
    default: {},
  }) ?? {}

export const ShadowTerang: ThemeShadow = {
  card: bayangan('#660F24', 2, 0.06, 10, 3),
  float: bayangan('#660F24', 6, 0.14, 16, 6),
}

/** Mode gelap: kedalaman dari border tipis, bukan bayangan */
export const ShadowGelap: ThemeShadow = {
  card: {},
  float: bayangan('#000000', 8, 0.5, 20, 8),
}
