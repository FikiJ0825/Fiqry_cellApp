import { StyleSheet, Text, View } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { FontSize, Spacing, Font } from '../../constants/theme'
import Button from './Button'
import IconTile from './IconTile'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  ikon: IoniconName
  judul: string
  keterangan?: string
  aksiLabel?: string
  onAksi?: () => void
}

export default function EmptyState({ ikon, judul, keterangan, aksiLabel, onAksi }: Props) {
  const styles = useStyles(buatStyles)
  return (
    <View style={styles.wrap}>
      <IconTile ikon={ikon} warna="rose" size={64} />
      <Text style={styles.judul}>{judul}</Text>
      {keterangan ? <Text style={styles.keterangan}>{keterangan}</Text> : null}
      {aksiLabel && onAksi ? <Button label={aksiLabel} onPress={onAksi} size="sm" style={styles.aksi} /> : null}
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  judul: { fontSize: FontSize.md, fontFamily: Font.bold, color: t.colors.textPrimary, marginTop: Spacing.md },
  keterangan: { fontFamily: Font.regular,
    fontSize: FontSize.sm,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  aksi: { marginTop: Spacing.lg },
})
