import { ReactNode } from 'react'
import { StyleSheet, Text } from 'react-native'
import { FontSize, Spacing, Font } from '../../constants/theme'
import CurvedHeader from './CurvedHeader'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  judul: string
  keterangan?: string
  /** Ruang kosong di bawah, tempat kartu/kolom cari menimpa tepi header */
  ruangBawah?: number
  children?: ReactNode
}

/** Header judul layar tab: CurvedHeader dengan judul dan keterangan singkat */
export default function ScreenHeader({ judul, keterangan, ruangBawah = Spacing.xl, children }: Props) {
  const styles = useStyles(buatStyles)
  return (
    <CurvedHeader ruangBawah={ruangBawah}>
      <Text style={styles.judul}>{judul}</Text>
      {keterangan ? <Text style={styles.keterangan}>{keterangan}</Text> : null}
      {children}
    </CurvedHeader>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  judul: { color: t.colors.textWhite, fontSize: FontSize.xxl, fontFamily: Font.bold },
  keterangan: { fontFamily: Font.regular, color: t.pastel.rose.bg, fontSize: FontSize.sm, marginTop: 2 },
})
