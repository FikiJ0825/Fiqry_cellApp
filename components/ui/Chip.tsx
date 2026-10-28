import { Pressable, StyleSheet, Text } from 'react-native'
import { Colors, FontSize, FontWeight, Radius } from '../../constants/theme'

interface Props {
  label: string
  selected: boolean
  onPress: () => void
}

export default function Chip({ label, selected, onPress }: Props) {
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

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tekan: { opacity: 0.8 },
  teks: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  teksSelected: { color: Colors.textWhite },
})
