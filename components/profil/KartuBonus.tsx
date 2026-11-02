import { StyleSheet, Text, View } from 'react-native'
import Button from '../ui/Button'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'
import { FontSize, Spacing, Font } from '../../constants/theme'
import { formatRupiah } from '../../lib/format'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  jumlah: number
  memproses: boolean
  nonaktif: boolean
  onKlaim: () => void
}

export default function KartuBonus({ jumlah, memproses, nonaktif, onKlaim }: Props) {
  const styles = useStyles(buatStyles)
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

const buatStyles = (t: Theme) => StyleSheet.create({
  kartu: { backgroundColor: t.pastel.mint.bg, gap: Spacing.lg },
  baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  judul: { fontSize: FontSize.sm, fontFamily: Font.semibold, color: t.pastel.mint.teks },
  jumlah: { fontSize: FontSize.xxl, fontFamily: Font.bold, color: t.pastel.mint.teks },
})
