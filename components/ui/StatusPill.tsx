import { StyleSheet, Text, View } from 'react-native'
import { FontSize, Radius, Font } from '../../constants/theme'
import { getStatusLabel, getStatusPastel } from '../../lib/transaksi'
import { Theme, useStyles, useTheme } from '../../lib/theme'

export default function StatusPill({ status }: { status: string }) {
  const styles = useStyles(buatStyles)
  const { pastel } = useTheme()
  const warna = pastel[getStatusPastel(status)]
  return (
    <View style={[styles.pill, { backgroundColor: warna.bg }]}>
      <Text style={[styles.teks, { color: warna.teks }]}>{getStatusLabel(status)}</Text>
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  teks: { fontSize: FontSize.xs, fontFamily: Font.bold },
})
