import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Font, FontSize, Radius } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  label: string
  selected: boolean
  onPress: () => void
  ikon?: IoniconName
}

/** Chip gaya tema 1: terpilih = kotak membulat crimson berisi teks/ikon putih */
export default function Chip({ label, selected, onPress, ikon }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.tekan]}
    >
      {ikon ? <Ionicons name={ikon} size={15} color={selected ? colors.textWhite : colors.textSecondary} /> : null}
      <Text style={[styles.teks, selected && styles.teksSelected]}>{label}</Text>
    </Pressable>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary, ...t.shadow.card },
    tekan: { opacity: 0.8 },
    teks: { fontSize: FontSize.sm, color: t.colors.textSecondary, fontFamily: Font.semibold },
    teksSelected: { color: t.colors.textWhite },
  })
