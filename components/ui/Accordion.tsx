import { Ionicons } from '@expo/vector-icons'
import { ReactNode, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Colors, FontSize, FontWeight, PastelNama, Spacing } from '../../constants/theme'
import Card from './Card'
import IconTile from './IconTile'

interface Props {
  judul: string
  ikon?: IoniconName
  warna?: PastelNama
  terbukaAwal?: boolean
  children: ReactNode
}

/** Kartu yang bisa dibuka-tutup: judul selalu terlihat, isi muncul saat diketuk */
export default function Accordion({ judul, ikon, warna = 'rose', terbukaAwal = false, children }: Props) {
  const [terbuka, setTerbuka] = useState(terbukaAwal)

  return (
    <Card padded={false}>
      <Pressable
        onPress={() => setTerbuka((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: terbuka }}
        style={({ pressed }) => [styles.kepala, pressed && styles.tekan]}
      >
        {ikon ? <IconTile ikon={ikon} warna={warna} size={40} /> : null}
        <Text style={styles.judul}>{judul}</Text>
        <Ionicons name={terbuka ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.grey} />
      </Pressable>
      {terbuka ? <View style={styles.isi}>{children}</View> : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  kepala: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  tekan: { opacity: 0.6 },
  judul: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  isi: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md },
})
