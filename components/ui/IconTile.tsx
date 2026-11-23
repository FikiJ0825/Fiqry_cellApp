import { Ionicons } from '@expo/vector-icons'
import { StyleProp, View, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { PastelNama } from '../../constants/theme'
import { s } from '../../lib/skala'
import { useTheme } from '../../lib/theme'
import IkonProduk, { adalahIkonProduk, NamaIkonProduk } from './IkonProduk'

interface Props {
  /** Ionicons, atau nama ikon produk khas (SVG) */
  ikon: IoniconName | NamaIkonProduk
  warna: PastelNama
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Kotak ikon berwarna pastel (menu kategori, baris transaksi, dll.) */
export default function IconTile({ ikon, warna, size: sizeDasar = 40, style }: Props) {
  const size = s(sizeDasar)
  const { pastel } = useTheme()
  const isiIkon = adalahIkonProduk(ikon) ? (
    <IkonProduk nama={ikon} warna={pastel[warna].fg} ukuran={Math.round(size * 0.56)} />
  ) : (
    <Ionicons name={ikon} size={Math.round(size * 0.5)} color={pastel[warna].fg} />
  )
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: pastel[warna].bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {isiIkon}
    </View>
  )
}
