import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FontSize, Spacing, Font } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  judul: string
  aksiLabel?: string
  onAksi?: () => void
}

export default function SectionHeader({ judul, aksiLabel, onAksi }: Props) {
  const styles = useStyles(buatStyles)
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

const buatStyles = (t: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  judul: { fontSize: FontSize.lg, fontFamily: Font.bold, color: t.colors.textPrimary },
  aksi: { fontSize: FontSize.sm, fontFamily: Font.semibold, color: t.colors.accent },
})
