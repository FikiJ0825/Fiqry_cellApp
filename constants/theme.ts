import { Platform, ViewStyle } from 'react-native'

export const Colors = {
  primary: '#E04B57',
  primaryDark: '#B3202E',
  primaryLight: '#FFE3E5',
  background: '#FFF7F7',
  surface: '#FFFFFF',
  border: '#F3DDDF',
  textPrimary: '#2B1E20',
  textSecondary: '#7A6A6C',
  textWhite: '#FFFFFF',
  success: '#2E7D32',
  warning: '#F57F17',
  error: '#D32F2F',
  grey: '#A89B9D',
}

/** Warna pastel: latar (bg), ikon (fg), dan teks (teks, lebih gelap agar terbaca di atas bg) */
export const Pastel = {
  rose: { bg: '#FFE3E5', fg: '#D93844', teks: '#B3202E' },
  peach: { bg: '#FFEBDD', fg: '#E8833A', teks: '#B85A14' },
  mint: { bg: '#DDF5E8', fg: '#2E9E5B', teks: '#1F7A45' },
  sky: { bg: '#E0EEFF', fg: '#3B82D6', teks: '#245FA8' },
  butter: { bg: '#FFF3CC', fg: '#C99A06', teks: '#8A6500' },
  lilac: { bg: '#EDE4FF', fg: '#7C5CD6', teks: '#5B3FB0' },
}

export type PastelNama = keyof typeof Pastel

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
}

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
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

const bayangan = (elevation: number, opacity: number, radius: number, offsetY: number): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: Colors.primaryDark,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  }) ?? {}

export const Shadow = {
  card: bayangan(2, 0.08, 10, 3),
  float: bayangan(6, 0.14, 18, 8),
}
