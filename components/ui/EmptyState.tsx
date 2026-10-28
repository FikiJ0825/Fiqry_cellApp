import { StyleSheet, Text, View } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme'
import Button from './Button'
import IconTile from './IconTile'

interface Props {
  ikon: IoniconName
  judul: string
  keterangan?: string
  aksiLabel?: string
  onAksi?: () => void
}

export default function EmptyState({ ikon, judul, keterangan, aksiLabel, onAksi }: Props) {
  return (
    <View style={styles.wrap}>
      <IconTile ikon={ikon} warna="rose" size={64} />
      <Text style={styles.judul}>{judul}</Text>
      {keterangan ? <Text style={styles.keterangan}>{keterangan}</Text> : null}
      {aksiLabel && onAksi ? <Button label={aksiLabel} onPress={onAksi} size="sm" style={styles.aksi} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  judul: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.md },
  keterangan: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  aksi: { marginTop: Spacing.lg },
})
