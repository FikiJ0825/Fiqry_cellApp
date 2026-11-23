import { useEffect, useRef, useState } from 'react'
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, Mask, Rect } from 'react-native-svg'
import { MOTION } from '../../constants/motion'
import { LangkahTour } from '../../constants/tour'
import { Rect as Persegi } from '../../lib/tour/context'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import TourTooltip, { UKURAN_PANAH } from './TourTooltip'

const MARGIN = 16
const LEBAR_TOOLTIP = 360
const JARAK = UKURAN_PANAH + 6
const WARNA_BACKDROP = 'rgba(29,16,21,0.82)'

interface Props {
  tampil: boolean
  rect: Persegi
  radius: number
  langkah: LangkahTour
  index: number
  total: number
  ukuran: { w: number; h: number }
  onBerikutnya: () => void
  onKembali: () => void
  onLewati: () => void
}

interface Potongan extends Persegi {
  radius: number
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const batasi = (n: number, min: number, maks: number) => Math.min(Math.max(n, min), Math.max(min, maks))

/** Persegi target + padding, dengan radius yang tidak melebihi setengah sisi terpendek */
function keCutout(r: Persegi, radius: number): Potongan {
  const p = MOTION.paddingSpotlight
  const w = r.w + p * 2
  const h = r.h + p * 2
  return { x: r.x - p, y: r.y - p, w, h, radius: Math.min(radius + p, w / 2, h / 2) }
}

/**
 * Backdrop gelap dengan lubang (spotlight) yang meluncur & berubah ukuran/radius antar langkah,
 * cincin cahaya berdenyut di tepinya, dan tooltip yang menempatkan diri di atas/bawah target.
 * Digambar dengan SVG mask; koordinat state-per-frame (pola sama dengan FloatingTabBar) agar aman di Fabric.
 */
export default function TourOverlay({
  tampil,
  rect,
  radius,
  langkah,
  index,
  total,
  ukuran,
  onBerikutnya,
  onKembali,
  onLewati,
}: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const idMask = useRef(`tour${Math.random().toString(36).slice(2, 8)}`).current

  // ---- Spotlight: satu driver progres 0→1 menginterpolasi posisi, ukuran, dan radius ----
  const [potong, setPotong] = useState<Potongan>(() => {
    const awal = keCutout(rect, radius)
    // Muncul pertama: lubang "menutup" dari lebih besar ke ukuran target
    return { x: awal.x - 28, y: awal.y - 28, w: awal.w + 56, h: awal.h + 56, radius: awal.radius + 28 }
  })
  const potongSekarang = useRef(potong)
  const dari = useRef(potong)
  const ke = useRef(keCutout(rect, radius))
  const progres = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const id = progres.addListener(({ value: p }) => {
      const a = dari.current
      const b = ke.current
      const baru = {
        x: lerp(a.x, b.x, p),
        y: lerp(a.y, b.y, p),
        w: lerp(a.w, b.w, p),
        h: lerp(a.h, b.h, p),
        radius: lerp(a.radius, b.radius, p),
      }
      potongSekarang.current = baru
      setPotong(baru)
    })
    return () => progres.removeListener(id)
  }, [progres])

  useEffect(() => {
    dari.current = potongSekarang.current
    ke.current = keCutout(rect, radius)
    progres.setValue(0)
    Animated.timing(progres, {
      toValue: 1,
      duration: MOTION.pindahSpotlight,
      easing: MOTION.easingPindah,
      useNativeDriver: false,
    }).start()
  }, [rect, radius, progres])

  // ---- Backdrop fade ----
  const fadeBackdrop = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(fadeBackdrop, {
      toValue: tampil ? 1 : 0,
      duration: tampil ? MOTION.backdropMasuk : MOTION.backdropKeluar,
      useNativeDriver: true,
    }).start()
  }, [tampil, fadeBackdrop])

  // ---- Cincin cahaya berdenyut ----
  const denyut = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(denyut, { toValue: 1, duration: MOTION.denyut / 2, useNativeDriver: true }),
        Animated.timing(denyut, { toValue: 0, duration: MOTION.denyut / 2, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [denyut])

  // ---- Tooltip: ukur tingginya dulu (tak terlihat), lalu tempatkan di sisi yang muat ----
  const [tinggi, setTinggi] = useState(0)
  const onLayoutKartu = (e: LayoutChangeEvent) => {
    const t = Math.round(e.nativeEvent.layout.height)
    setTinggi((lama) => (lama === t ? lama : t))
  }

  const tip = useRef(new Animated.Value(0)).current
  useEffect(() => {
    // Tiap langkah/penampilan baru: sembunyikan, lalu pegas masuk setelah spotlight hampir tiba
    tip.stopAnimation()
    tip.setValue(0)
    if (!tampil) return
    const timer = setTimeout(() => {
      Animated.spring(tip, {
        toValue: 1,
        speed: MOTION.tooltipPegas.speed,
        bounciness: MOTION.tooltipPegas.bounciness,
        useNativeDriver: true,
      }).start()
    }, MOTION.tooltipJeda)
    return () => clearTimeout(timer)
  }, [index, rect, tampil, tip])

  useEffect(() => {
    if (tampil) return
    Animated.timing(tip, { toValue: 0, duration: MOTION.tooltipFadeKeluar, useNativeDriver: true }).start()
  }, [tampil, tip])

  const lebar = Math.max(220, Math.min(ukuran.w - MARGIN * 2, LEBAR_TOOLTIP))
  const cutout = keCutout(rect, radius)
  const pusatX = cutout.x + cutout.w / 2
  const atasTarget = cutout.y
  const bawahTarget = cutout.y + cutout.h

  const ruangBawah = ukuran.h - insets.bottom - 8 - (bawahTarget + JARAK)
  const ruangAtas = atasTarget - JARAK - (insets.top + 8)
  const dibawah = ruangBawah >= tinggi || ruangBawah >= ruangAtas
  const top = batasi(
    dibawah ? bawahTarget + JARAK : atasTarget - JARAK - tinggi,
    insets.top + 8,
    ukuran.h - insets.bottom - 8 - tinggi,
  )
  const left = batasi(pusatX - lebar / 2, MARGIN, ukuran.w - MARGIN - lebar)
  const panahX = batasi(pusatX - left - UKURAN_PANAH / 2, 20, lebar - 20 - UKURAN_PANAH)

  const siap = tinggi > 0 && ukuran.w > 0

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {/* Backdrop + lubang spotlight; juga menelan ketukan agar layar di belakang tidak terpencet */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: fadeBackdrop }]}
        onStartShouldSetResponder={() => true}
      >
        <Svg width={ukuran.w} height={ukuran.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id={idMask} x="0" y="0" width={ukuran.w} height={ukuran.h} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={ukuran.w} height={ukuran.h} fill="white" />
              <Rect x={potong.x} y={potong.y} width={potong.w} height={potong.h} rx={potong.radius} ry={potong.radius} fill="black" />
            </Mask>
          </Defs>
          <Rect x="0" y="0" width={ukuran.w} height={ukuran.h} fill={WARNA_BACKDROP} mask={`url(#${idMask})`} />
        </Svg>

        {/* Cincin tepi spotlight + gema yang berdenyut keluar */}
        <View pointerEvents="none" style={[styles.cincinWadah, boxDari(potong)]}>
          <Animated.View
            style={[
              styles.gema,
              { borderRadius: potong.radius + 4 },
              {
                opacity: denyut.interpolate({
                  inputRange: [0, 1],
                  outputRange: [MOTION.denyutOpasitasMaks * 0.6, 0],
                }),
                transform: [{ scale: denyut.interpolate({ inputRange: [0, 1], outputRange: [1, MOTION.denyutSkala + 0.05] }) }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.cincin,
              { borderRadius: potong.radius },
              {
                opacity: denyut.interpolate({
                  inputRange: [0, 1],
                  outputRange: [MOTION.denyutOpasitasMaks, MOTION.denyutOpasitasMin + 0.3],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Tooltip */}
      {siap ? (
        <Animated.View
          pointerEvents={tampil ? 'auto' : 'none'}
          style={[
            styles.tooltip,
            {
              top,
              left,
              opacity: tip.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: tip.interpolate({ inputRange: [0, 1], outputRange: [dibawah ? MOTION.tooltipGeser : -MOTION.tooltipGeser, 0] }) },
                { scale: tip.interpolate({ inputRange: [0, 1], outputRange: [MOTION.tooltipSkalaAwal, 1] }) },
              ],
            },
          ]}
        >
          <TourTooltip
            langkah={langkah}
            index={index}
            total={total}
            lebar={lebar}
            panah={dibawah ? 'atas' : 'bawah'}
            panahX={panahX}
            onLayoutKartu={onLayoutKartu}
            onBerikutnya={onBerikutnya}
            onKembali={onKembali}
            onLewati={onLewati}
          />
        </Animated.View>
      ) : (
        // Render tak terlihat sekali untuk mengukur tinggi kartu
        <View style={[styles.tooltip, styles.tersembunyi]} pointerEvents="none">
          <TourTooltip
            langkah={langkah}
            index={index}
            total={total}
            lebar={lebar}
            panah="atas"
            panahX={20}
            onLayoutKartu={onLayoutKartu}
            onBerikutnya={onBerikutnya}
            onKembali={onKembali}
            onLewati={onLewati}
          />
        </View>
      )}
    </View>
  )
}

const boxDari = (p: Potongan) => ({ left: p.x, top: p.y, width: p.w, height: p.h })

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    cincinWadah: { position: 'absolute' },
    cincin: {
      ...StyleSheet.absoluteFill,
      borderWidth: 2,
      borderColor: t.isDark ? t.colors.accent : '#FF94B2',
    },
    gema: {
      ...StyleSheet.absoluteFill,
      borderWidth: 2,
      borderColor: t.colors.primary,
    },
    tooltip: { position: 'absolute' },
    tersembunyi: { opacity: 0, top: 0, left: 0 },
  })
