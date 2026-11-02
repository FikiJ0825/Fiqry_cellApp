import { Ionicons } from '@expo/vector-icons'
import { ReactNode, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { FontSize, PastelNama, Spacing, Font } from '../../constants/theme'
import Card from './Card'
import IconTile from './IconTile'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  judul: string
  ikon?: IoniconName
  warna?: PastelNama
  terbukaAwal?: boolean
  children: ReactNode
}

/** Kartu yang bisa dibuka-tutup: judul selalu terlihat, isi muncul saat diketuk */
export default function Accordion({ judul, ikon, warna = 'rose', terbukaAwal = false, children }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
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
        <Ionicons name={terbuka ? 'chevron-up' : 'chevron-down'} size={18} color={colors.grey} />
      </Pressable>
      {terbuka ? <View style={styles.isi}>{children}</View> : null}
    </Card>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  kepala: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  tekan: { opacity: 0.6 },
  judul: { flex: 1, fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textPrimary },
  isi: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md },
})
