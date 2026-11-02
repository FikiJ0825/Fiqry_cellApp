import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Font, FontSize, Spacing } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  judul: string
  keterangan?: string
  /** Tombol/elemen di sisi kanan judul, mis. <TombolKotak /> */
  kanan?: ReactNode
  /** Tidak dipakai lagi (header terang tidak lagi menimpa kartu); dipertahankan agar pemanggil lama tetap valid */
  ruangBawah?: number
  children?: ReactNode
}

/** Header judul layar bergaya tema 1: terang, tanpa blok warna; judul gelap + keterangan abu-kecokelatan */
export default function ScreenHeader({ judul, keterangan, kanan, children }: Props) {
  const styles = useStyles(buatStyles)
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wadah, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.baris}>
        <View style={styles.teks}>
          <Text style={styles.judul}>{judul}</Text>
          {keterangan ? <Text style={styles.keterangan}>{keterangan}</Text> : null}
        </View>
        {kanan}
      </View>
      {children}
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    wadah: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
    baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    teks: { flex: 1 },
    judul: { fontFamily: Font.bold, color: t.colors.textPrimary, fontSize: FontSize.xxl },
    keterangan: { fontFamily: Font.regular, color: t.colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  })
