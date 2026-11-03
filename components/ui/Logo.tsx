import { Image, StyleSheet, View } from 'react-native'
import { useTheme } from '../../lib/theme'

interface Props {
  /** Tinggi logo dasar (px); lebar mengikuti rasio gambar */
  ukuran?: number
  /** Versi putih untuk dipasang di atas header merah / latar gelap */
  terang?: boolean
}

// Rasio lebar : tinggi aset logo-adepulsa(.putih).png (1200 x 210)
const RASIO = 1200 / 210

const LOGO_GELAP = require('../../assets/logo-adepulsa.png')
const LOGO_TERANG = require('../../assets/logo-adepulsa-putih.png')

/** Logo wordmark AdePulsa; otomatis memakai versi putih di mode gelap atau saat `terang` */
export default function Logo({ ukuran = 56, terang = false }: Props) {
  const { isDark } = useTheme()
  // Logo horizontal lebih rendah dari ubin lama, jadi tinggi diperkecil agar tampilannya seimbang
  const tinggi = Math.round(ukuran * 0.62)
  return (
    <View style={styles.wadah}>
      <Image
        source={terang || isDark ? LOGO_TERANG : LOGO_GELAP}
        style={{ width: Math.round(tinggi * RASIO), height: tinggi }}
        resizeMode="contain"
        accessibilityLabel="Ade Pulsa"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wadah: { alignItems: 'center' },
})
