import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg'
import { buatPathCekungan, buatPathGaris } from '../../lib/notchPath'
import { Theme, useStyles, useTheme } from '../../lib/theme'

const MARGIN_SAMPING = 14
const TINGGI_BAR = 62
/** Ruang di atas bar tempat bubble menonjol */
const RUANG_ATAS = 28
const RADIUS_BAR = 28
const DIAMETER_BUBBLE = 52
const SETENGAH_LEBAR_CEKUNGAN = 56
const KEDALAMAN_CEKUNGAN = 34
const KEDALAMAN_DANGKAL = 0.2
const SKALA_MIN = 0.35
const TURUN_BUBBLE = 30
const DURASI_PINDAH = 420
const EASING_PINDAH = Easing.bezier(0.4, 0, 0.2, 1)
const TEBAL_RIM = 2

/** Seberapa dalam bubble "tenggelam" (0..1) pada progres p (0..1): naik cepat, bertahan sebentar, lalu naik lagi */
const lengkungTenggelam = (p: number) => Math.min(1, Math.sin(Math.PI * p) * 1.3)

interface LatarBarProps {
  cx: Animated.Value
  dalam: Animated.Value
  cxAwal: number
  lebarBar: number
  tinggiTotal: number
  id: string
}

/**
 * Latar bar + cekungan. State path dipisah di sini supaya tiap frame animasi hanya
 * menggambar ulang SVG ini, bukan seluruh tab bar (ikon, bubble).
 */
function LatarBar({ cx, dalam, cxAwal, lebarBar, tinggiTotal, id }: LatarBarProps) {
  const { colors } = useTheme()
  const cxNilai = useRef(cxAwal)
  const dalamNilai = useRef(1)

  const hitung = useCallback(() => {
    const c = cxNilai.current
    // Cekungan dipersempit di tab paling ujung agar tidak keluar dari bar
    const setengahLebar = Math.max(24, Math.min(SETENGAH_LEBAR_CEKUNGAN, c + 8, lebarBar - c + 8))
    const param = {
      cx: c,
      atas: RUANG_ATAS,
      setengahLebar,
      kedalaman: dalamNilai.current * KEDALAMAN_CEKUNGAN,
    }
    const opasitasRim = (dalamNilai.current - KEDALAMAN_DANGKAL) / (1 - KEDALAMAN_DANGKAL)
    return {
      d: buatPathCekungan(param),
      garis: buatPathGaris(param),
      opasitasRim: Math.min(1, Math.max(0, opasitasRim)),
    }
  }, [lebarBar])

  const [bentuk, setBentuk] = useState(hitung)

  // Path dihitung ulang tiap frame dari nilai animasi (state, bukan setNativeProps, agar aman di Fabric)
  useEffect(() => {
    const l1 = cx.addListener(({ value }) => {
      cxNilai.current = value
      setBentuk(hitung())
    })
    const l2 = dalam.addListener(({ value }) => {
      dalamNilai.current = value
      setBentuk(hitung())
    })
    setBentuk(hitung())
    return () => {
      cx.removeListener(l1)
      dalam.removeListener(l2)
    }
  }, [cx, dalam, hitung])

  return (
    <Svg width={lebarBar} height={tinggiTotal} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`bar${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.navBar} />
          <Stop offset="1" stopColor={colors.navBarEnd} />
        </LinearGradient>
        <Mask id={`m${id}`} x="0" y="0" width={lebarBar} height={tinggiTotal} maskUnits="userSpaceOnUse">
          <Rect x="0" y={RUANG_ATAS} width={lebarBar} height={TINGGI_BAR} rx={RADIUS_BAR} fill="white" />
          <Path d={bentuk.d} fill="black" />
        </Mask>
        {/* Garis tepi hanya boleh tampil di atas badan bar (tidak melayang di sudut membulat) */}
        <Mask id={`r${id}`} x="0" y="0" width={lebarBar} height={tinggiTotal} maskUnits="userSpaceOnUse">
          <Rect
            x="0"
            y={RUANG_ATAS - TEBAL_RIM}
            width={lebarBar}
            height={TINGGI_BAR + TEBAL_RIM}
            rx={RADIUS_BAR}
            fill="white"
          />
        </Mask>
      </Defs>
      <Rect
        x="0"
        y={RUANG_ATAS}
        width={lebarBar}
        height={TINGGI_BAR}
        rx={RADIUS_BAR}
        fill={`url(#bar${id})`}
        mask={`url(#m${id})`}
      />
      <Path
        d={bentuk.garis}
        fill="none"
        stroke={colors.navRim}
        strokeWidth={TEBAL_RIM}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={bentuk.opasitasRim}
        mask={`url(#r${id})`}
      />
    </Svg>
  )
}

/**
 * Tab bar gelap-merah dengan cekungan tempat bubble ikon aktif (gaya tema 1).
 * Pindah tab memakai SATU driver progres (0→1): bubble menunduk ke bar, cekungan meluncur,
 * lalu bubble naik di tab baru — semuanya menyambung tanpa jeda antar fase.
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

  const progres = useRef(new Animated.Value(1)).current
  const cx = useRef(new Animated.Value(pusat(posisiAktif))).current
  const dalam = useRef(new Animated.Value(1)).current
  const skala = useRef(new Animated.Value(1)).current
  const turun = useRef(new Animated.Value(0)).current
  const opIkon = useRef(rute.map((_, i) => new Animated.Value(i === posisiAktif ? 0 : 1))).current

  const target = useRef(posisiAktif)
  const animasi = useRef<Animated.CompositeAnimation | null>(null)
  const tenggelamSekarang = useRef(0)
  const cxSekarang = useRef(pusat(posisiAktif))
  const fase = useRef({ dari: pusat(posisiAktif), ke: pusat(posisiAktif), awal: 0, tujuan: posisiAktif, ikonSudahGanti: true })
  const [ikonIdx, setIkonIdx] = useState(posisiAktif)

  // Satu listener menurunkan semua nilai dari progres yang sudah ter-easing
  useEffect(() => {
    const id = progres.addListener(({ value: p }) => {
      const f = fase.current
      // Bila dipotong di tengah animasi, kedalaman awal meluruh pelan agar tidak melompat
      const s = Math.max(lengkungTenggelam(p), f.awal * (1 - p))
      tenggelamSekarang.current = s
      // Sedikit "pop" di ujung saat bubble muncul kembali
      const pop = p > 0.7 ? 0.07 * Math.sin((Math.PI * (p - 0.7)) / 0.3) : 0

      cxSekarang.current = f.dari + (f.ke - f.dari) * p
      cx.setValue(cxSekarang.current)
      dalam.setValue(1 - (1 - KEDALAMAN_DANGKAL) * s)
      skala.setValue(1 - (1 - SKALA_MIN) * s + pop)
      turun.setValue(s)

      if (p >= 0.5 && !f.ikonSudahGanti) {
        f.ikonSudahGanti = true
        setIkonIdx(f.tujuan)
      }
    })
    return () => progres.removeListener(id)
  }, [progres, cx, dalam, skala, turun])

  // Ikon tab di bar memudar saat bubble menutupinya, dan muncul lagi saat bubble pergi
  useEffect(() => {
    opIkon.forEach((nilai, i) => {
      Animated.timing(nilai, { toValue: i === ikonIdx ? 0 : 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()
    })
  }, [ikonIdx, opIkon])

  // Mulai perpindahan setiap kali tab aktif berganti (dan sambung mulus bila dipotong)
  useEffect(() => {
    if (posisiAktif === target.current) return
    target.current = posisiAktif
    animasi.current?.stop()

    fase.current = {
      dari: cxSekarang.current,
      ke: pusat(posisiAktif),
      awal: tenggelamSekarang.current,
      tujuan: posisiAktif,
      ikonSudahGanti: false,
    }
    progres.setValue(0)
    animasi.current = Animated.timing(progres, {
      toValue: 1,
      duration: DURASI_PINDAH,
      easing: EASING_PINDAH,
      useNativeDriver: false,
    })
    animasi.current.start()
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
        <LatarBar
          cx={cx}
          dalam={dalam}
          cxAwal={pusat(posisiAktif)}
          lebarBar={lebarBar}
          tinggiTotal={tinggiTotal}
          id={idGradien}
        />

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
              opacity: skala.interpolate({ inputRange: [SKALA_MIN, 0.65, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
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
