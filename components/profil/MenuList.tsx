import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'
import { IoniconName } from '../../constants/produk'
import { Colors, FontSize, FontWeight, PastelNama, Spacing } from '../../constants/theme'

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
          <Ionicons name="chevron-forward" size={18} color={Colors.grey} />
        </Pressable>
      ))}
    </Card>
  )
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  garis: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  tekan: { opacity: 0.6 },
  teks: { flex: 1 },
  judul: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  keterangan: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
})
