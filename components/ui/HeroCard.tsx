import { LinearGradient } from 'expo-linear-gradient'
import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Radius, Spacing } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/** Kartu hero bergradien crimson (kartu saldo, banner) — teks di dalamnya memakai colors.onHeader / onHeaderSoft */
export default function HeroCard({ children, style }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()

  return (
    <View style={[styles.bayangan, style]}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.kartu}
      >
        <View pointerEvents="none" style={[styles.lingkaran, styles.lingkaranBesar]} />
        <View pointerEvents="none" style={[styles.lingkaran, styles.lingkaranKecil]} />
        {children}
      </LinearGradient>
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    bayangan: { borderRadius: Radius.xl, ...t.shadow.float },
    kartu: { borderRadius: Radius.xl, padding: Spacing.xl, overflow: 'hidden' },
    lingkaran: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
    lingkaranBesar: { width: 190, height: 190, top: -80, right: -50 },
    lingkaranKecil: { width: 110, height: 110, bottom: -50, left: -30, backgroundColor: 'rgba(255,255,255,0.07)' },
  })
