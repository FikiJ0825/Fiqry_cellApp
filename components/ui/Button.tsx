import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../constants/theme'

type Variant = 'primary' | 'soft' | 'outline' | 'danger'

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

const WARNA: Record<Variant, { bg: string; teks: string; border: string }> = {
  primary: { bg: Colors.primary, teks: Colors.textWhite, border: Colors.primary },
  soft: { bg: Colors.primaryLight, teks: Colors.primaryDark, border: Colors.primaryLight },
  outline: { bg: Colors.surface, teks: Colors.primary, border: Colors.primary },
  danger: { bg: Colors.surface, teks: Colors.error, border: Colors.error },
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
  const warna = WARNA[variant]
  const nonaktif = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={nonaktif}
      accessibilityRole="button"
      accessibilityState={{ disabled: nonaktif, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: warna.bg, borderColor: warna.border },
        pressed && styles.pressed,
        nonaktif && styles.disabled,
        style,
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
  )
}

const styles = StyleSheet.create({
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
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  labelSm: { fontSize: FontSize.sm },
})
