import { StyleSheet, Text, View } from 'react-native'
import { FontSize, FontWeight, Pastel, Radius } from '../../constants/theme'
import { getStatusLabel, getStatusPastel } from '../../lib/transaksi'

export default function StatusPill({ status }: { status: string }) {
  const warna = Pastel[getStatusPastel(status)]
  return (
    <View style={[styles.pill, { backgroundColor: warna.bg }]}>
      <Text style={[styles.teks, { color: warna.teks }]}>{getStatusLabel(status)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  teks: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
})
