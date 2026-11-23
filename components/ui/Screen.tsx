import { LinearGradient } from 'expo-linear-gradient'
import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { s } from '../../lib/skala'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/** Latar layar bergaya tema 1: gradien blush lembut dengan dua lingkaran besar transparan di sudut */
export default function Screen({ children, style }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()

  return (
    <View style={[styles.wadah, style]}>
      <LinearGradient colors={[colors.bgFrom, colors.bgTo]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.blob, styles.blobAtas]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBawah]} />
      {children}
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    wadah: { flex: 1, backgroundColor: t.colors.background },
    blob: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: t.isDark ? 'rgba(240,112,127,0.07)' : 'rgba(139,13,26,0.06)',
    },
    blobAtas: { width: s(340), height: s(340), top: -s(150), right: -s(120) },
    blobBawah: { width: s(280), height: s(280), bottom: s(80), left: -s(140) },
  })
