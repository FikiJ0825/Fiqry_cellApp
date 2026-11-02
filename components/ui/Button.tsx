import { Ionicons } from '@expo/vector-icons'
import { useRef } from 'react'
import { ActivityIndicator, Animated, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

type Variant = 'primary' | 'dark' | 'light' | 'soft' | 'outline' | 'danger'

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
  const skala = useRef(new Animated.Value(1)).current
  const nonaktif = disabled || loading

  const WARNA: Record<Variant, { bg: string; teks: string; border: string }> = {
    primary: { bg: colors.primary, teks: colors.textWhite, border: colors.primary },
    // Hitam di mode terang, off-white di mode gelap: kontras maksimal untuk aksi penting
    dark: isDark
      ? { bg: colors.textPrimary, teks: '#0B0B0B', border: colors.textPrimary }
      : { bg: '#0B0B0B', teks: '#F5F2ED', border: '#0B0B0B' },
    // Off-white penuh, untuk dipasang di atas permukaan hitam (mis. kartu saldo)
    light: { bg: '#F5F2ED', teks: '#0B0B0B', border: '#F5F2ED' },
    soft: { bg: colors.primaryLight, teks: colors.primaryDark, border: colors.primaryLight },
    outline: { bg: 'transparent', teks: colors.accent, border: colors.accent },
    danger: { bg: colors.surface, teks: colors.error, border: colors.error },
  }
  const warna = WARNA[variant]

  const animasi = (ke: number) =>
    Animated.spring(skala, { toValue: ke, useNativeDriver: true, speed: 40, bounciness: 6 }).start()

  return (
    <Animated.View style={[{ transform: [{ scale: skala }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animasi(0.97)}
        onPressOut={() => animasi(1)}
        disabled={nonaktif}
        accessibilityRole="button"
        accessibilityState={{ disabled: nonaktif, busy: loading }}
        style={[
          styles.base,
          size === 'sm' ? styles.sm : styles.md,
          { backgroundColor: warna.bg, borderColor: warna.border },
          nonaktif && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={warna.teks} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={warna.teks} /> : null}
            <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: warna.teks }]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
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
    md: { paddingVertical: 14, paddingHorizontal: Spacing.xl },
    sm: { paddingVertical: 10, paddingHorizontal: Spacing.lg },
    disabled: { opacity: 0.5 },
    label: { fontSize: FontSize.md, fontFamily: Font.semibold, letterSpacing: 0.2 },
    labelSm: { fontFamily: Font.regular, fontSize: FontSize.sm },
  })
