import { Ionicons } from '@expo/vector-icons'
import { ReactNode, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { IoniconName } from '../../constants/produk'
import { FontSize, PastelNama, Spacing, Font } from '../../constants/theme'
import { getaranRingan, MOTION_UI } from '../../lib/motion'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import Card from './Card'
import IconTile from './IconTile'
import PressScale from './PressScale'

interface Props {
  judul: string
  ikon?: IoniconName
  warna?: PastelNama
  terbukaAwal?: boolean
  children: ReactNode
}

const KURVA = Easing.bezier(MOTION_UI.easing[0], MOTION_UI.easing[1], MOTION_UI.easing[2], MOTION_UI.easing[3])

/** Kartu yang bisa dibuka-tutup: tinggi isi dan chevron dianimasikan, isi memudar masuk */
export default function Accordion({ judul, ikon, warna = 'rose', terbukaAwal = false, children }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const [terbuka, setTerbuka] = useState(terbukaAwal)

  // 0 = tertutup, 1 = terbuka; tinggi isi terukur dari konten nyata
  const progres = useSharedValue(terbukaAwal ? 1 : 0)
  const tinggiIsi = useSharedValue(0)

  const gayaIsi = useAnimatedStyle(() => ({
    height: tinggiIsi.value * progres.value,
    opacity: progres.value,
  }))
  const gayaChevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progres.value * 180}deg` }],
  }))

  const toggle = () => {
    const ke = terbuka ? 0 : 1
    setTerbuka(!terbuka)
    progres.value = withTiming(ke, { duration: MOTION_UI.durasi, easing: KURVA })
    getaranRingan()
  }

  return (
    <Card padded={false}>
      <PressScale
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: terbuka }}
        haptik="none"
        skala={0.99}
        style={styles.kepala}
      >
        {ikon ? <IconTile ikon={ikon} warna={warna} size={36} /> : null}
        <Text style={styles.judul}>{judul}</Text>
        <Animated.View style={gayaChevron}>
          <Ionicons name="chevron-down" size={18} color={colors.grey} />
        </Animated.View>
      </PressScale>
      <Animated.View style={[styles.wadahIsi, gayaIsi]}>
        <View
          style={styles.isi}
          onLayout={(e) => {
            tinggiIsi.value = e.nativeEvent.layout.height
          }}
        >
          {children}
        </View>
      </Animated.View>
    </Card>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    kepala: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
    judul: { flex: 1, fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textPrimary },
    wadahIsi: { overflow: 'hidden' },
    isi: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md },
  })
