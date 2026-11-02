import { Platform, ViewStyle } from 'react-native'

/**
 * Palet "Clean · Premium · Timeless": Black #0B0B0B, Crimson Red #8B0D1A, Off-White #F5F2ED.
 * Dua mode (terang & gelap) dengan nama token yang sama; dipilih lewat useTheme() di lib/theme.tsx.
 */
export interface ThemeColors {
  /** Isi tombol, indikator tab, header (selalu crimson #8B0D1A) */
  primary: string
  /** Teks/ikon penekanan berwarna crimson di atas latar netral (di mode gelap lebih terang agar terbaca) */
  primaryDark: string
  /** Tint latar lembut berwarna crimson */
  primaryLight: string
  /** Warna teks/ikon merah di atas latar (alias penekanan) */
  accent: string
  background: string
  surface: string
  surfaceAlt: string
  border: string
  textPrimary: string
  textSecondary: string
  /** Teks di atas isi crimson/gelap (off-white) */
  textWhite: string
  success: string
  warning: string
  error: string
  grey: string
  /** Latar header lengkung */
  header: string
  /** Hitam/arang penuh untuk kartu premium (saldo) */
  ink: string
}

export const LightColors: ThemeColors = {
  primary: '#8B0D1A',
  primaryDark: '#5E0912',
  primaryLight: '#F1DCDD',
  accent: '#8B0D1A',
  background: '#F5F2ED',
  surface: '#FBF9F6',
  surfaceAlt: '#EDE8E0',
  border: '#E2DACF',
  textPrimary: '#0B0B0B',
  textSecondary: '#6D6560',
  textWhite: '#F5F2ED',
  success: '#2F6F46',
  warning: '#B7791F',
  error: '#D9383F',
  grey: '#A69E97',
  header: '#8B0D1A',
  ink: '#0B0B0B',
}

export const DarkColors: ThemeColors = {
  primary: '#8B0D1A',
  primaryDark: '#EE8791',
  primaryLight: '#2A0E12',
  accent: '#E5505F',
  background: '#0B0B0B',
  surface: '#151112',
  surfaceAlt: '#1E1517',
  border: '#2E2124',
  textPrimary: '#F5F2ED',
  textSecondary: '#A89E9B',
  textWhite: '#F5F2ED',
  success: '#6FBF8A',
  warning: '#E0B055',
  error: '#FF6B72',
  grey: '#7A6E70',
  header: '#120404',
  ink: '#120404',
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
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
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
  card: bayangan('#3A1A1A', 2, 0.07, 10, 3),
  float: bayangan('#3A1A1A', 8, 0.16, 20, 8),
}

/** Mode gelap: kedalaman dari border tipis, bukan bayangan */
export const ShadowGelap: ThemeShadow = {
  card: {},
  float: bayangan('#000000', 8, 0.5, 20, 8),
}
