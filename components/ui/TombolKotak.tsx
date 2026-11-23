import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Font, Radius } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import PressScale from './PressScale'

interface Props {
  ikon: IoniconName
  onPress: () => void
  label: string
  ukuran?: number
  /** Angka kecil di pojok (mis. jumlah notifikasi belum dibaca); disembunyikan bila 0 */
  badge?: number
}

/** Tombol ikon kotak putih membulat (menu/kembali/bantuan) seperti di tema 1 */
export default function TombolKotak({ ikon, onPress, label, ukuran = 42, badge = 0 }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()

  return (
    <PressScale
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tombol, { width: ukuran, height: ukuran }]}
    >
      <Ionicons name={ikon} size={Math.round(ukuran * 0.5)} color={colors.textPrimary} />
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTeks}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </PressScale>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    tombol: {
      borderRadius: Radius.md,
      backgroundColor: t.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadow.card,
    },
    tekan: { opacity: 0.7 },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeTeks: { fontFamily: Font.bold, fontSize: 10, color: '#FFFFFF' },
  })
