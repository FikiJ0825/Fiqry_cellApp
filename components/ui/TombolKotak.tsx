import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Radius } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  ikon: IoniconName
  onPress: () => void
  label: string
  ukuran?: number
}

/** Tombol ikon kotak putih membulat (menu/kembali/bantuan) seperti di tema 1 */
export default function TombolKotak({ ikon, onPress, label, ukuran = 42 }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tombol, { width: ukuran, height: ukuran }, pressed && styles.tekan]}
    >
      <Ionicons name={ikon} size={Math.round(ukuran * 0.5)} color={colors.textPrimary} />
    </Pressable>
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
  })
