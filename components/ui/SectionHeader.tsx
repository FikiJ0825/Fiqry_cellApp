import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme'

interface Props {
  judul: string
  aksiLabel?: string
  onAksi?: () => void
}

export default function SectionHeader({ judul, aksiLabel, onAksi }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.judul}>{judul}</Text>
      {aksiLabel && onAksi ? (
        <Pressable onPress={onAksi} hitSlop={8} accessibilityRole="button">
          <Text style={styles.aksi}>{aksiLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  judul: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  aksi: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
})
