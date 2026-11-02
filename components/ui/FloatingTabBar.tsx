import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg'
import { buatPathCekungan } from '../../lib/notchPath'
import { Theme, useStyles, useTheme } from '../../lib/theme'

const MARGIN_SAMPING = 14
const TINGGI_BAR = 62
/** Ruang di atas bar tempat bubble menonjol */
const RUANG_ATAS = 28
const RADIUS_BAR = 28
const DIAMETER_BUBBLE = 52
const SETENGAH_LEBAR_CEKUNGAN = 46
const KEDALAMAN_CEKUNGAN = 33
const KEDALAMAN_DANGKAL = 0.2
const TURUN_BUBBLE = 30

/**
 * Tab bar gelap-merah dengan cekungan tempat bubble ikon aktif (gaya tema 1).
 * Pindah tab mengikuti video contoh: bubble tenggelam ke bar → cekungan meluncur → bubble naik di tab baru.
 * Cekungan dibuat dengan mask SVG sehingga benar-benar transparan (tidak menimpa warna latar).
 */
export default function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: lebarLayar } = useWindowDimensions()
  const idGradien = useId().replace(/[^A-Za-z0-9]/g, '')
  const [keyboardTampil, setKeyboardTampil] = useState(false)

  // Hanya tab yang tampil (tab tersembunyi memakai options.href === null)
  const rute = state.routes
    .map((route, indexAsli) => ({ route, indexAsli }))
    .filter(({ route }) => (descriptors[route.key].options as { href?: unknown }).href !== null)
  const jumlah = Math.max(rute.length, 1)
  const posisiAktif = Math.max(
    0,
    rute.findIndex((r) => r.indexAsli === state.index),
  )

  const lebarBar = lebarLayar - MARGIN_SAMPING * 2
  const lebarItem = lebarBar / jumlah
  const pusat = (i: number) => lebarItem * (i + 0.5)

  const cx = useRef(new Animated.Value(pusat(posisiAktif))).current
  const dalam = useRef(new Animated.Value(1)).current
  const skala = useRef(new Animated.Value(1)).current
  const turun = useRef(new Animated.Value(0)).current
  const opIkon = useRef(rute.map((_, i) => new Animated.Value(i === posisiAktif ? 0 : 1))).current

  const cxNilai = useRef(pusat(posisiAktif))
  const dalamNilai = useRef(1)
  const target = useRef(posisiAktif)
  const animasi = useRef<Animated.CompositeAnimation | null>(null)
  const [ikonIdx, setIkonIdx] = useState(posisiAktif)

  const buatD = () =>
    buatPathCekungan({
      cx: cxNilai.current,
      atas: RUANG_ATAS,
      setengahLebar: SETENGAH_LEBAR_CEKUNGAN,
      kedalaman: dalamNilai.current * KEDALAMAN_CEKUNGAN,
    })
  const [d, setD] = useState(buatD)

  // Path cekungan dihitung ulang tiap frame dari nilai animasi (state, bukan setNativeProps, agar aman di Fabric)
  useEffect(() => {
    const l1 = cx.addListener(({ value }) => {
      cxNilai.current = value
      setD(buatD())
    })
    const l2 = dalam.addListener(({ value }) => {
      dalamNilai.current = value
      setD(buatD())
    })
    return () => {
      cx.removeListener(l1)
      dalam.removeListener(l2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, dalam])

  // Ikon tab di bar memudar saat bubble menutupinya, dan muncul lagi saat bubble pergi
  useEffect(() => {
    opIkon.forEach((nilai, i) => {
      Animated.timing(nilai, { toValue: i === ikonIdx ? 0 : 1, duration: 160, useNativeDriver: false }).start()
    })
  }, [ikonIdx, opIkon])

  // Urutan animasi saat tab berpindah
  useEffect(() => {
    if (posisiAktif === target.current) return
    target.current = posisiAktif
    animasi.current?.stop()

    const tujuan = posisiAktif
    const fase1 = Animated.parallel([
      Animated.timing(dalam, { toValue: KEDALAMAN_DANGKAL, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      Animated.timing(skala, { toValue: 0.35, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      Animated.timing(turun, { toValue: 1, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ])
    animasi.current = fase1
    fase1.start(({ finished }) => {
      if (!finished) return
      setIkonIdx(tujuan)
      const fase2 = Animated.timing(cx, {
        toValue: pusat(tujuan),
        duration: 230,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      })
      animasi.current = fase2
      fase2.start(({ finished: selesai }) => {
        if (!selesai) return
        const fase3 = Animated.parallel([
          Animated.timing(dalam, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.spring(skala, { toValue: 1, friction: 5, tension: 150, useNativeDriver: false }),
          Animated.spring(turun, { toValue: 0, friction: 6, tension: 140, useNativeDriver: false }),
        ])
        animasi.current = fase3
        fase3.start()
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posisiAktif])

  useEffect(() => {
    const tampil = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setKeyboardTampil(true)
    })
    const sembunyi = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardTampil(false)
    })
    return () => {
      tampil.remove()
      sembunyi.remove()
    }
  }, [])

  // Saat keyboard terbuka, bar disembunyikan agar tidak menutupi kolom isian
  if (keyboardTampil) return null

  const tinggiTotal = RUANG_ATAS + TINGGI_BAR
  const optionsAktif = rute[ikonIdx]?.route ? descriptors[rute[ikonIdx].route.key].options : undefined

  return (
    <View style={[styles.wadah, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
      <View style={{ width: lebarBar, height: tinggiTotal }}>
        <Svg width={lebarBar} height={tinggiTotal} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`bar${idGradien}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.navBar} />
              <Stop offset="1" stopColor={colors.navBarEnd} />
            </LinearGradient>
            <Mask id={`m${idGradien}`} x="0" y="0" width={lebarBar} height={tinggiTotal} maskUnits="userSpaceOnUse">
              <Rect x="0" y={RUANG_ATAS} width={lebarBar} height={TINGGI_BAR} rx={RADIUS_BAR} fill="white" />
              <Path d={d} fill="black" />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y={RUANG_ATAS}
            width={lebarBar}
            height={TINGGI_BAR}
            rx={RADIUS_BAR}
            fill={`url(#bar${idGradien})`}
            mask={`url(#m${idGradien})`}
          />
        </Svg>

        <View style={styles.baris}>
          {rute.map(({ route, indexAsli }, i) => {
            const { options } = descriptors[route.key]
            const fokus = indexAsli === state.index
            const label =
              typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name)

            const onPress = () => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!fokus && !event.defaultPrevented) navigateToTab(route.key)
            }
            const onLongPress = () => {
              emitter.emit({ type: 'tabLongPress', target: route.key })
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: fokus }}
                style={styles.item}
              >
                <Animated.View style={{ opacity: opIkon[i] }}>
                  {options.tabBarIcon?.({ focused: false, color: colors.navIcon, size: 24 }) as ReactNode}
                </Animated.View>
              </Pressable>
            )
          })}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              opacity: skala.interpolate({ inputRange: [0.35, 0.65, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
              transform: [
                { translateX: Animated.subtract(cx, DIAMETER_BUBBLE / 2) },
                { translateY: turun.interpolate({ inputRange: [0, 1], outputRange: [0, TURUN_BUBBLE] }) },
                { scale: skala },
              ],
            },
          ]}
        >
          {optionsAktif?.tabBarIcon?.({ focused: true, color: colors.navBubbleIcon, size: 24 }) as ReactNode}
        </Animated.View>
      </View>
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    // Latar sama dengan ujung bawah gradien layar supaya tidak ada sambungan yang terlihat
    wadah: { backgroundColor: t.colors.bgTo, alignItems: 'center' },
    baris: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      paddingTop: RUANG_ATAS,
    },
    // Memakai ruang tata letak nyata (bukan absolute di luar induk) supaya ketukan di Android selalu diterima
    item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    bubble: {
      position: 'absolute',
      left: 0,
      top: RUANG_ATAS - DIAMETER_BUBBLE / 2 + 3,
      width: DIAMETER_BUBBLE,
      height: DIAMETER_BUBBLE,
      borderRadius: DIAMETER_BUBBLE / 2,
      backgroundColor: t.colors.navBubble,
      borderWidth: 3,
      borderColor: t.colors.navRing,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
