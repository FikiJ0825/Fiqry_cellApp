import { ReactNode } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import { useTourTarget } from '../../lib/tour/useTour'

interface Props {
  /** Harus sama dengan `id` pada langkah di constants/tour.ts */
  id: string
  children: ReactNode
  /** Radius sudut elemen (dp); cutout spotlight mengikutinya. Pakai angka besar (mis. 999) untuk pil/lingkaran. */
  radius?: number
  /** Elemen yang menempel di layar (tab bar/header) */
  tetap?: boolean
  style?: StyleProp<ViewStyle>
}

/** Pembungkus deklaratif: <TourTarget id="beranda.topup" radius={999}>...</TourTarget> */
export default function TourTarget({ id, children, radius, tetap, style }: Props) {
  const target = useTourTarget(id, { radius, tetap })
  return (
    <View {...target} style={style}>
      {children}
    </View>
  )
}
