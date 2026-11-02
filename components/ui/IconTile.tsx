import { Ionicons } from '@expo/vector-icons'
import { StyleProp, View, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { PastelNama } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

interface Props {
  ikon: IoniconName
  warna: PastelNama
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Kotak ikon berwarna pastel (menu kategori, baris transaksi, dll.) */
export default function IconTile({ ikon, warna, size = 48, style }: Props) {
  const { pastel } = useTheme()
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
      <Ionicons name={ikon} size={Math.round(size * 0.5)} color={pastel[warna].fg} />
    </View>
  )
}
