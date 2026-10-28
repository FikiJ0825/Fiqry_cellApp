import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { Colors, FontWeight } from '../../constants/theme'

interface Props {
  ukuran?: number
  /** Versi putih untuk dipasang di atas header merah */
  terang?: boolean
}

// Sementara memakai ikon + tulisan; ganti dengan gambar logo AdePulsa setelah file logo tersedia di assets/
export default function Logo({ ukuran = 56, terang = false }: Props) {
  return (
    <View style={styles.wadah}>
      <View
        style={[
          styles.ubin,
          {
            width: ukuran,
            height: ukuran,
            borderRadius: Math.round(ukuran * 0.3),
            backgroundColor: terang ? Colors.surface : Colors.primary,
          },
        ]}
      >
        <Ionicons name="phone-portrait" size={Math.round(ukuran * 0.5)} color={terang ? Colors.primary : Colors.textWhite} />
      </View>
      <Text style={[styles.nama, { fontSize: Math.round(ukuran * 0.42), color: terang ? Colors.textWhite : Colors.primaryDark }]}>
        Ade Pulsa
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wadah: { alignItems: 'center', gap: 10 },
  ubin: { alignItems: 'center', justifyContent: 'center' },
  nama: { fontWeight: FontWeight.bold },
})
