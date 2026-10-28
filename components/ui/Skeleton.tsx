import { useEffect, useRef } from 'react'
import { Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native'
import { Colors, Radius } from '../../constants/theme'

interface Props {
  width?: DimensionValue
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

/** Blok placeholder berdenyut saat data dimuat */
export default function Skeleton({ width = '100%', height = 16, radius = Radius.md, style }: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: Colors.primaryLight, opacity }, style]}
    />
  )
}
