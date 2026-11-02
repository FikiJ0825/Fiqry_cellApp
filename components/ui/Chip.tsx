import { Pressable, StyleSheet, Text } from 'react-native'
import { FontSize, Radius, Font } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  label: string
  selected: boolean
  onPress: () => void
}

export default function Chip({ label, selected, onPress }: Props) {
  const styles = useStyles(buatStyles)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.tekan]}
    >
      <Text style={[styles.teks, selected && styles.teksSelected]}>{label}</Text>
    </Pressable>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  tekan: { opacity: 0.8 },
  teks: { fontSize: FontSize.sm, color: t.colors.textSecondary, fontFamily: Font.semibold },
  teksSelected: { fontFamily: Font.regular, color: t.colors.textWhite },
})
