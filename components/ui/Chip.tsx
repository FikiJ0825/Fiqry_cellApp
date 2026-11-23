import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Font, FontSize, Radius } from '../../constants/theme'
import { s } from '../../lib/skala'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import PressScale from './PressScale'

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
    <PressScale
      onPress={onPress}
      haptik="pilih"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {ikon ? <Ionicons name={ikon} size={s(16)} color={selected ? colors.textWhite : colors.textSecondary} /> : null}
      <Text style={[styles.teks, selected && styles.teksSelected]}>{label}</Text>
    </PressScale>
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
      paddingHorizontal: s(16),
      paddingVertical: s(10),
    },
    chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary, ...t.shadow.card },
    tekan: { opacity: 0.8 },
    teks: { fontSize: FontSize.sm, color: t.colors.textSecondary, fontFamily: Font.semibold },
    teksSelected: { color: t.colors.textWhite },
  })
