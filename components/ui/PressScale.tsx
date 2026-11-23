import { ReactNode } from 'react'
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { getaranPilih, getaranRingan, MOTION_UI } from '../../lib/motion'

const PressableAnimasi = Animated.createAnimatedComponent(Pressable)

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  /** ringan = getaran standar; pilih = getaran halus untuk chip/tab; none = tanpa getaran */
  haptik?: 'ringan' | 'pilih' | 'none'
  skala?: number
}

/**
 * Pressable yang membesar-mengecil dengan pegas saat ditekan, plus getaran tipis saat diaktifkan.
 * Pengganti Pressable biasa untuk tombol dan kartu aksi.
 */
export default function PressScale({
  style,
  children,
  haptik = 'ringan',
  skala = MOTION_UI.tekanSkala,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: Props) {
  const nilai = useSharedValue(1)
  const gaya = useAnimatedStyle(() => ({ transform: [{ scale: nilai.value }] }))

  return (
    <PressableAnimasi
      {...rest}
      disabled={disabled}
      style={[gaya, style]}
      onPressIn={(e) => {
        nilai.value = withSpring(skala, MOTION_UI.tekanPegas)
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        nilai.value = withSpring(1, MOTION_UI.tekanPegas)
        onPressOut?.(e)
      }}
      onPress={(e) => {
        if (!disabled) {
          if (haptik === 'ringan') getaranRingan()
          if (haptik === 'pilih') getaranPilih()
        }
        onPress?.(e)
      }}
    >
      {children}
    </PressableAnimasi>
  )
}
