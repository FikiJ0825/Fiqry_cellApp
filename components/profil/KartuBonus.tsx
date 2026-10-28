import { StyleSheet, Text, View } from 'react-native'
import Button from '../ui/Button'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'
import { FontSize, FontWeight, Pastel, Spacing } from '../../constants/theme'
import { formatRupiah } from '../../lib/format'

interface Props {
  jumlah: number
  memproses: boolean
  nonaktif: boolean
  onKlaim: () => void
}

export default function KartuBonus({ jumlah, memproses, nonaktif, onKlaim }: Props) {
  return (
    <Card style={styles.kartu}>
      <View style={styles.baris}>
        <IconTile ikon="gift" warna="mint" size={44} />
        <View>
          <Text style={styles.judul}>Bonus Tersedia</Text>
          <Text style={styles.jumlah}>{formatRupiah(jumlah)}</Text>
        </View>
      </View>
      <Button label="Klaim Sekarang" onPress={onKlaim} loading={memproses} disabled={nonaktif} />
    </Card>
  )
}

const styles = StyleSheet.create({
  kartu: { backgroundColor: Pastel.mint.bg, gap: Spacing.lg },
  baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  judul: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Pastel.mint.teks },
  jumlah: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Pastel.mint.teks },
})
