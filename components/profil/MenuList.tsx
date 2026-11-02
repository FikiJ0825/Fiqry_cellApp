import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'
import { IoniconName } from '../../constants/produk'
import { FontSize, PastelNama, Spacing, Font } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

export interface ItemMenu {
  kunci: string
  ikon: IoniconName
  warna: PastelNama
  judul: string
  keterangan?: string
  onPress: () => void
}

/** Daftar menu bergaya BRImo: ikon pastel, judul, keterangan, dan panah */
export default function MenuList({ item }: { item: ItemMenu[] }) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  return (
    <Card padded={false}>
      {item.map((m, i) => (
        <Pressable
          key={m.kunci}
          onPress={m.onPress}
          accessibilityRole="button"
          accessibilityLabel={m.judul}
          style={({ pressed }) => [styles.baris, i > 0 && styles.garis, pressed && styles.tekan]}
        >
          <IconTile ikon={m.ikon} warna={m.warna} size={40} />
          <View style={styles.teks}>
            <Text style={styles.judul}>{m.judul}</Text>
            {m.keterangan ? <Text style={styles.keterangan}>{m.keterangan}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.grey} />
        </Pressable>
      ))}
    </Card>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  garis: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border },
  tekan: { opacity: 0.6 },
  teks: { flex: 1 },
  judul: { fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textPrimary },
  keterangan: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, marginTop: 2 },
})
