import { ReactNode } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Colors, FontSize, FontWeight, Pastel, Spacing } from '../../constants/theme'
import CurvedHeader from './CurvedHeader'

interface Props {
  judul: string
  keterangan?: string
  /** Ruang kosong di bawah, tempat kartu/kolom cari menimpa tepi header */
  ruangBawah?: number
  children?: ReactNode
}

/** Header judul layar tab: CurvedHeader dengan judul dan keterangan singkat */
export default function ScreenHeader({ judul, keterangan, ruangBawah = Spacing.xl, children }: Props) {
  return (
    <CurvedHeader ruangBawah={ruangBawah}>
      <Text style={styles.judul}>{judul}</Text>
      {keterangan ? <Text style={styles.keterangan}>{keterangan}</Text> : null}
      {children}
    </CurvedHeader>
  )
}

const styles = StyleSheet.create({
  judul: { color: Colors.textWhite, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  keterangan: { color: Pastel.rose.bg, fontSize: FontSize.sm, marginTop: 2 },
})
