import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Radius, Spacing } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  children: ReactNode
  /** Ruang kosong di bawah isi, tempat kartu menimpa tepi header */
  ruangBawah?: number
}

/**
 * Header crimson (hitam-crimson di mode gelap) dengan sudut bawah membulat.
 * "Cahaya" ala poster ditiru dengan lingkaran transparan bertumpuk, tanpa library gradien.
 */
export default function CurvedHeader({ children, ruangBawah = Spacing.xl }: Props) {
  const styles = useStyles(buatStyles)
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.md, paddingBottom: ruangBawah }]}>
      <View pointerEvents="none" style={[styles.lingkaran, styles.busur]} />
      <View pointerEvents="none" style={[styles.lingkaran, styles.cahayaBesar]} />
      <View pointerEvents="none" style={[styles.lingkaran, styles.bayangan]} />
      <View pointerEvents="none" style={styles.garis} />
      {children}
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    header: {
      backgroundColor: t.colors.header,
      borderBottomLeftRadius: Radius.xl,
      borderBottomRightRadius: Radius.xl,
      paddingHorizontal: Spacing.xl,
      overflow: 'hidden',
    },
    lingkaran: { position: 'absolute', borderRadius: Radius.full },
    // Busur tipis bercahaya di pojok kanan atas (mirip lengkung merah di poster)
    busur: {
      width: 210,
      height: 210,
      top: -90,
      right: -70,
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(229,80,95,0.55)' : 'rgba(245,242,237,0.28)',
      backgroundColor: t.isDark ? 'rgba(139,13,26,0.35)' : 'rgba(255,255,255,0.07)',
    },
    cahayaBesar: {
      width: 120,
      height: 120,
      top: -40,
      right: 20,
      backgroundColor: t.isDark ? 'rgba(229,80,95,0.10)' : 'rgba(255,255,255,0.06)',
    },
    bayangan: {
      width: 160,
      height: 160,
      bottom: -80,
      left: -50,
      backgroundColor: t.isDark ? 'rgba(139,13,26,0.28)' : 'rgba(11,11,11,0.20)',
    },
    garis: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 1,
      backgroundColor: t.isDark ? 'rgba(229,80,95,0.45)' : 'rgba(245,242,237,0.20)',
    },
  })
