import { Platform, ViewStyle } from 'react-native'

/**
 * Palet crimson bergaya "Tema 1": latar terang lembut (blush), kartu putih, aksen crimson #8B0D1A,
 * bar navigasi merah tua. Dua mode (terang & gelap) dengan nama token yang sama; dipilih lewat useTheme().
 */
export interface ThemeColors {
  /** Isi tombol, chip terpilih, indikator (selalu crimson #8B0D1A) */
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
}

export const LightColors: ThemeColors = {
  primary: '#8B0D1A',
  primaryDark: '#5E0912',
  primaryLight: '#F8E1E1',
  accent: '#B3122A',
  background: '#FCF3F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F8E6E4',
  border: '#F1DAD7',
  textPrimary: '#2A1114',
  textSecondary: '#715659',
  textWhite: '#FFFFFF',
  success: '#2F6F46',
  warning: '#9A5B0B',
  error: '#C62833',
  grey: '#A38D90',
  header: '#8B0D1A',
  ink: '#2B0B11',
  onHeader: '#FFFFFF',
  onHeaderSoft: 'rgba(255,255,255,0.86)',
  heroFrom: '#8B0D1A',
  heroTo: '#C73A4E',
  bgFrom: '#FFF8F6',
  bgTo: '#F9E4E2',
  navBar: '#2B0B11',
  navBarEnd: '#3D1119',
  navIcon: '#F08A96',
  navBubble: '#F7EFEA',
  navBubbleIcon: '#B3122A',
  navRing: '#C8102E',
}

export const DarkColors: ThemeColors = {
  primary: '#8B0D1A',
  primaryDark: '#F4A0AA',
  primaryLight: '#3A1820',
  accent: '#F0707F',
  background: '#1A0C0F',
  surface: '#26151A',
  surfaceAlt: '#301A20',
  border: '#3D2429',
  textPrimary: '#F7EFEA',
  textSecondary: '#C2ABAE',
  textWhite: '#FFFFFF',
  success: '#6FBF8A',
  warning: '#E0B055',
  error: '#FF7A82',
  grey: '#8A7276',
  header: '#2B0B11',
  ink: '#2B0B11',
  onHeader: '#FFFFFF',
  onHeaderSoft: 'rgba(255,255,255,0.86)',
  heroFrom: '#7A0B17',
  heroTo: '#B5303F',
  bgFrom: '#1A0C0F',
  bgTo: '#221015',
  navBar: '#1F080D',
  navBarEnd: '#2E0E15',
  navIcon: '#F08A96',
  navBubble: '#F7EFEA',
  navBubbleIcon: '#B3122A',
  navRing: '#C8102E',
}

export interface PastelWarna {
  bg: string
  fg: string
  teks: string
}

/** Warna latar (bg), ikon (fg), dan teks (teks) bernuansa teredam agar serasi dengan merah-hitam */
export const PastelTerang = {
  rose: { bg: '#F4DEDF', fg: '#8B0D1A', teks: '#6E0A15' },
  peach: { bg: '#F3E6D8', fg: '#B8742F', teks: '#7D4A14' },
  mint: { bg: '#DFEBE1', fg: '#3F7A55', teks: '#2B5B3D' },
  sky: { bg: '#DFE8EE', fg: '#4A6F8F', teks: '#33516B' },
  butter: { bg: '#F3EACB', fg: '#A8801A', teks: '#6E5410' },
  lilac: { bg: '#E9E1E6', fg: '#6D4A63', teks: '#4F3447' },
}

export type PastelNama = keyof typeof PastelTerang
export type PastelSet = Record<PastelNama, PastelWarna>

export const PastelGelap: PastelSet = {
  rose: { bg: 'rgba(229,80,95,0.16)', fg: '#E5505F', teks: '#F09AA2' },
  peach: { bg: 'rgba(224,161,92,0.16)', fg: '#E0A15C', teks: '#EDBF8A' },
  mint: { bg: 'rgba(111,191,138,0.16)', fg: '#6FBF8A', teks: '#9AD7AF' },
  sky: { bg: 'rgba(127,169,204,0.16)', fg: '#7FA9CC', teks: '#A5C4DF' },
  butter: { bg: 'rgba(224,188,82,0.16)', fg: '#E0BC52', teks: '#EBD083' },
  lilac: { bg: 'rgba(181,138,168,0.16)', fg: '#B58AA8', teks: '#CBAAC0' },
}

export const FontSize = {
  xs: 11,
  sm: 12.5,
  md: 14.5,
  lg: 16.5,
  xl: 19,
  xxl: 23,
}

/** Poppins per bobot (di Android fontWeight tidak memilih bobot font kustom, jadi pakai fontFamily) */
export const Font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const

export const Radius = {
  sm: 10,
  md: 14,
  lg: 22,
  xl: 30,
  full: 999,
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
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
    default: {},
  }) ?? {}

export const ShadowTerang: ThemeShadow = {
  card: bayangan('#8B0D1A', 3, 0.09, 16, 5),
  float: bayangan('#8B0D1A', 10, 0.2, 24, 10),
}

/** Mode gelap: kedalaman dari border tipis, bukan bayangan */
export const ShadowGelap: ThemeShadow = {
  card: {},
  float: bayangan('#000000', 8, 0.5, 20, 8),
}
