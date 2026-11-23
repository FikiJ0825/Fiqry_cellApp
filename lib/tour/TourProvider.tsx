import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TourOverlay from '../../components/tour/TourOverlay'
import { MOTION } from '../../constants/motion'
import { LangkahTour } from '../../constants/tour'
import { EntriScroll, EntriTarget, Rect, TourApi, TourContext, ViewRef } from './context'
import { sudahTur, tandaiTur } from './storage'

interface Sesi {
  langkah: LangkahTour[]
  userId?: string
}

const tunggu = (ms: number) => new Promise<void>((selesai) => setTimeout(selesai, ms))

function ukurDiLayar(node: ViewRef): Promise<Rect | null> {
  return new Promise((selesai) => {
    try {
      node.measureInWindow((x, y, w, h) => {
        selesai(Number.isFinite(x) && Number.isFinite(y) ? { x, y, w, h } : null)
      })
    } catch {
      selesai(null)
    }
  })
}

/**
 * Pusat tur: menyimpan registry target & scroll, mengukur target, mengatur langkah, dan merender overlay.
 * Pasang SEKALI di atas navigator (mis. app/(app)/_layout.tsx) agar overlay menutup header & tab bar.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const insetsRef = useRef(insets)
  insetsRef.current = insets

  const [sesi, setSesi] = useState<Sesi | null>(null)
  const [aktif, setAktif] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [radius, setRadius] = useState(14)
  const [ukuran, setUkuran] = useState({ w: 0, h: 0 })
  const [mulaiTertunda, setMulaiTertunda] = useState(false)

  const akarRef = useRef<ViewRef>(null)
  const targets = useRef(new Map<string, EntriTarget>())
  const scrollEntri = useRef<EntriScroll | null>(null)
  const token = useRef(0)
  const sesiRef = useRef<Sesi | null>(null)
  const indexRef = useRef(0)
  const aktifRef = useRef(false)
  const pernahTampil = useRef(false)
  const ukuranRef = useRef(ukuran)
  ukuranRef.current = ukuran
  const bersihkan = useRef<ReturnType<typeof setTimeout> | null>(null)

  const daftarTarget = useCallback((id: string, entri: EntriTarget) => {
    targets.current.set(id, entri)
    return () => {
      if (targets.current.get(id) === entri) targets.current.delete(id)
    }
  }, [])

  const daftarScroll = useCallback((entri: EntriScroll) => {
    scrollEntri.current = entri
    return () => {
      if (scrollEntri.current === entri) scrollEntri.current = null
    }
  }, [])

  /** Posisi target relatif terhadap lapisan overlay (konsisten di Android/iOS/web, juga bila ada offset status bar) */
  const ukurTarget = useCallback(async (id: string): Promise<{ rect: Rect; radius: number; tetap: boolean } | null> => {
    const entri = targets.current.get(id)
    const node = entri?.ref.current
    const akar = akarRef.current
    if (!entri || !node || !akar) return null
    const [t, a] = await Promise.all([ukurDiLayar(node), ukurDiLayar(akar)])
    if (!t || !a || t.w <= 0 || t.h <= 0) return null
    return { rect: { x: t.x - a.x, y: t.y - a.y, w: t.w, h: t.h }, radius: entri.radius, tetap: entri.tetap }
  }, [])

  /** Gulung konten bila target di luar area nyaman (terpotong atas, atau terlalu dekat bawah sehingga tooltip tak muat) */
  const pastikanTerlihat = useCallback(
    async (id: string, hasil: { rect: Rect; radius: number; tetap: boolean }) => {
      const scroll = scrollEntri.current
      const tinggi = ukuranRef.current.h
      if (!scroll || !scroll.ref.current || hasil.tetap || tinggi <= 0) return hasil

      const batasAtas = insetsRef.current.top + 16
      const batasBawah = tinggi * 0.7
      const { rect: r } = hasil
      if (r.y >= batasAtas && r.y + r.h <= batasBawah) return hasil

      const tujuan = Math.max(0, scroll.offset.current + r.y - tinggi * 0.28)
      scroll.ref.current.scrollTo({ y: tujuan, animated: true })
      // Gulir beranimasi: ukur berulang sampai posisi target berhenti bergeser (maks ±1,5 dtk)
      let terakhir = hasil
      let sebelumnya: number | null = null
      for (let i = 0; i < 15; i += 1) {
        await tunggu(i === 0 ? MOTION.tungguScroll : 100)
        const ukur = await ukurTarget(id)
        if (!ukur) break
        terakhir = ukur
        if (sebelumnya !== null && Math.abs(ukur.rect.y - sebelumnya) < 0.5) break
        sebelumnya = ukur.rect.y
      }

      // Jaring pengaman: bila gulir beranimasi tidak berjalan (mis. halaman di latar), lompat langsung
      const { rect: akhir } = terakhir
      const diLuar = akhir.y + akhir.h > tinggi - insetsRef.current.bottom || akhir.y < insetsRef.current.top
      if (diLuar && scroll.ref.current) {
        scroll.ref.current.scrollTo({ y: Math.max(0, scroll.offset.current + akhir.y - tinggi * 0.28), animated: false })
        await tunggu(150)
        terakhir = (await ukurTarget(id)) ?? terakhir
      }
      return terakhir
    },
    [ukurTarget],
  )

  const akhiri = useCallback((tandai: boolean) => {
    token.current += 1
    const saat = sesiRef.current
    if (tandai && saat?.userId) void tandaiTur(saat.userId)
    aktifRef.current = false
    setAktif(false)
    // Biarkan overlay selesai memudar sebelum dilepas
    if (bersihkan.current) clearTimeout(bersihkan.current)
    bersihkan.current = setTimeout(() => {
      sesiRef.current = null
      setSesi(null)
      setRect(null)
      setIndex(0)
      indexRef.current = 0
    }, MOTION.backdropKeluar + 80)
  }, [])

  const tampilkan = useCallback(
    async (langkah: LangkahTour[], dari: number, arah: 1 | -1) => {
      const saatIni = ++token.current
      let i = dari
      while (i >= 0 && i < langkah.length) {
        const hasil = await ukurTarget(langkah[i].id)
        if (saatIni !== token.current) return
        if (hasil) {
          const akhir = await pastikanTerlihat(langkah[i].id, hasil)
          if (saatIni !== token.current) return
          indexRef.current = i
          pernahTampil.current = true
          setIndex(i)
          setRect(akhir.rect)
          setRadius(akhir.radius)
          return
        }
        // Target tidak ter-mount / tak punya ukuran: lewati
        i += arah
      }
      // Tak ada target lagi. Maju sampai habis = selesai; bila belum pernah tampil sama sekali, batalkan tanpa menandai.
      if (arah === 1) akhiri(pernahTampil.current)
    },
    [ukurTarget, pastikanTerlihat, akhiri],
  )

  const mulai = useCallback(
    (langkah: LangkahTour[], userId?: string) => {
      if (langkah.length === 0) return
      if (bersihkan.current) clearTimeout(bersihkan.current)
      const baru: Sesi = { langkah, userId }
      sesiRef.current = baru
      setSesi(baru)
      setRect(null)
      pernahTampil.current = false
      aktifRef.current = true
      setAktif(true)
      void tampilkan(langkah, 0, 1)
    },
    [tampilkan],
  )

  const mulaiOtomatis = useCallback(
    async (langkah: LangkahTour[], userId: string) => {
      if (aktifRef.current) return false
      if (await sudahTur(userId)) return false
      if (aktifRef.current) return false
      mulai(langkah, userId)
      return true
    },
    [mulai],
  )

  const berikutnya = useCallback(() => {
    const saat = sesiRef.current
    if (!saat) return
    if (indexRef.current >= saat.langkah.length - 1) akhiri(true)
    else void tampilkan(saat.langkah, indexRef.current + 1, 1)
  }, [akhiri, tampilkan])

  const kembali = useCallback(() => {
    const saat = sesiRef.current
    if (!saat || indexRef.current <= 0) return
    void tampilkan(saat.langkah, indexRef.current - 1, -1)
  }, [tampilkan])

  const lewati = useCallback(() => akhiri(true), [akhiri])

  const mintaMulai = useCallback(() => setMulaiTertunda(true), [])
  const selesaikanTertunda = useCallback(() => setMulaiTertunda(false), [])

  // Tombol Back Android = Lewati (bukan menutup layar di belakang overlay)
  useEffect(() => {
    if (!aktif) return
    const langganan = BackHandler.addEventListener('hardwareBackPress', () => {
      akhiri(true)
      return true
    })
    return () => langganan.remove()
  }, [aktif, akhiri])

  // Ukuran layar berubah (rotasi iPad, jendela web, split-screen): ukur ulang target langkah ini
  const onLayoutAkar = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setUkuran((lama) => (lama.w === width && lama.h === height ? lama : { w: width, h: height }))
  }, [])
  useEffect(() => {
    const saat = sesiRef.current
    if (!aktifRef.current || !saat || ukuran.w === 0) return
    void tampilkan(saat.langkah, indexRef.current, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ukuran.w, ukuran.h])

  useEffect(
    () => () => {
      if (bersihkan.current) clearTimeout(bersihkan.current)
    },
    [],
  )

  const value = useMemo<TourApi>(
    () => ({
      aktif,
      mulai,
      mulaiOtomatis,
      berikutnya,
      kembali,
      lewati,
      mintaMulai,
      mulaiTertunda,
      selesaikanTertunda,
      daftarTarget,
      daftarScroll,
    }),
    [aktif, mulai, mulaiOtomatis, berikutnya, kembali, lewati, mintaMulai, mulaiTertunda, selesaikanTertunda, daftarTarget, daftarScroll],
  )

  return (
    <TourContext.Provider value={value}>
      <View style={styles.wadah}>
        {children}
        {/* Lapisan penuh yang menutup header & tab bar. Selalu terpasang (ringan) supaya bisa dipakai mengukur offset. */}
        <View
          ref={akarRef}
          collapsable={false}
          onLayout={onLayoutAkar}
          pointerEvents={sesi ? 'auto' : 'none'}
          style={styles.lapisan}
        >
          {sesi && rect ? (
            <TourOverlay
              tampil={aktif}
              rect={rect}
              radius={radius}
              langkah={sesi.langkah[index]}
              index={index}
              total={sesi.langkah.length}
              ukuran={ukuran}
              onBerikutnya={berikutnya}
              onKembali={kembali}
              onLewati={lewati}
            />
          ) : null}
        </View>
      </View>
    </TourContext.Provider>
  )
}

const styles = StyleSheet.create({
  wadah: { flex: 1 },
  lapisan: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
})
