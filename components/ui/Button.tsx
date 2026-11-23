import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { s } from '../../lib/skala'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import PressScale from './PressScale'

type Variant = 'primary' | 'dark' | 'light' | 'glass' | 'soft' | 'outline' | 'danger'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  size?: 'md' | 'sm'
  icon?: IoniconName
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
}: Props) {
  const styles = useStyles(buatStyles)
  const { colors, isDark } = useTheme()
  const nonaktif = disabled || loading

  const WARNA: Record<Variant, { bg: string; teks: string; border: string }> = {
    primary: { bg: colors.primary, teks: colors.textWhite, border: colors.primary },
    // Burgundy-hitam di mode terang, vanilla di mode gelap: kontras maksimal untuk aksi penting
    dark: isDark
      ? { bg: colors.textPrimary, teks: '#1E2023', border: colors.textPrimary }
      : { bg: '#1D1015', teks: '#FFF4F8', border: '#1D1015' },
    // Off-white penuh, untuk dipasang di atas permukaan hitam (mis. kartu saldo)
    light: { bg: '#FFFFFF', teks: colors.primary, border: '#FFFFFF' },
    // Transparan berlapis putih, untuk di atas gradien/hero
    glass: { bg: 'rgba(255,255,255,0.18)', teks: colors.onHeader, border: 'rgba(255,255,255,0.4)' },
    soft: { bg: colors.primaryLight, teks: colors.primaryDark, border: colors.primaryLight },
    outline: { bg: 'transparent', teks: colors.accent, border: colors.accent },
    danger: { bg: colors.surface, teks: colors.error, border: colors.error },
  }
  const warna = WARNA[variant]

  return (
    <PressScale
      onPress={onPress}
      disabled={nonaktif}
      haptik="ringan"
      accessibilityRole="button"
      accessibilityState={{ disabled: nonaktif, busy: loading }}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: warna.bg, borderColor: warna.border },
        nonaktif && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={warna.teks} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? s(16) : s(20)} color={warna.teks} /> : null}
          <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: warna.teks }]}>{label}</Text>
        </>
      )}
    </PressScale>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: Radius.full,
    },
    md: { minHeight: s(44), paddingVertical: s(10), paddingHorizontal: Spacing.xl },
    sm: { minHeight: s(34), paddingVertical: s(7), paddingHorizontal: Spacing.lg },
    disabled: { opacity: 0.5 },
    label: { fontSize: FontSize.lg, fontFamily: Font.semibold, letterSpacing: 0.2 },
    labelSm: { fontSize: FontSize.sm },
  })
