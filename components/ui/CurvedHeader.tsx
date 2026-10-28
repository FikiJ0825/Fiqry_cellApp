import { StatusBar } from 'expo-status-bar'
import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Radius, Spacing } from '../../constants/theme'

interface Props {
  children: ReactNode
  /** Ruang kosong di bawah isi, tempat kartu putih menimpa tepi header */
  ruangBawah?: number
}

/** Header merah dengan sudut bawah membulat dan lingkaran dekoratif (tanpa gradien) */
export default function CurvedHeader({ children, ruangBawah = Spacing.xl }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.md, paddingBottom: ruangBawah }]}>
      <StatusBar style="light" />
      <View style={[styles.lingkaran, styles.lingkaranBesar]} />
      <View style={[styles.lingkaran, styles.lingkaranKecil]} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: Radius.xl + 4,
    borderBottomRightRadius: Radius.xl + 4,
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
  },
  lingkaran: { position: 'absolute', borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  lingkaranBesar: { width: 180, height: 180, top: -60, right: -50 },
  lingkaranKecil: { width: 90, height: 90, bottom: 10, left: -30 },
})
