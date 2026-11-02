import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { Font } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  ukuran?: number
  /** Versi putih untuk dipasang di atas header merah */
  terang?: boolean
}

// Sementara memakai ikon + tulisan; ganti dengan gambar logo AdePulsa setelah file logo tersedia di assets/
export default function Logo({ ukuran = 56, terang = false }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  return (
    <View style={styles.wadah}>
      <View
        style={[
          styles.ubin,
          {
            width: ukuran,
            height: ukuran,
            borderRadius: Math.round(ukuran * 0.3),
            backgroundColor: terang ? colors.surface : colors.primary,
          },
        ]}
      >
        <Ionicons name="phone-portrait" size={Math.round(ukuran * 0.5)} color={terang ? colors.primary : colors.textWhite} />
      </View>
      <Text style={[styles.nama, { fontSize: Math.round(ukuran * 0.42), color: terang ? colors.textWhite : colors.textPrimary }]}>
        Ade Pulsa
      </Text>
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  wadah: { alignItems: 'center', gap: 10 },
  ubin: { alignItems: 'center', justifyContent: 'center' },
  nama: { fontFamily: Font.bold },
})
