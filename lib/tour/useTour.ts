import { useCallback, useContext, useEffect, useRef } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { ScrollRef, TourApi, TourContext, ViewRef } from './context'

/** API tur: mulai(), mulaiOtomatis(), berikutnya(), kembali(), lewati(), mintaMulai() */
export function useTour(): TourApi {
  return useContext(TourContext)
}

interface OpsiTarget {
  /** Radius sudut elemen (dp); cutout spotlight mengikutinya. Default 14. */
  radius?: number
  /** Elemen yang menempel di layar (tab bar/header), bukan bagian dari konten yang bisa digulung */
  tetap?: boolean
}

/**
 * Daftarkan elemen apa pun sebagai target tur lewat `id`:
 *   const target = useTourTarget('beranda.topup', { radius: 999 })
 *   <View {...target}>...</View>
 */
export function useTourTarget(id: string, { radius = 14, tetap = false }: OpsiTarget = {}) {
  const { daftarTarget } = useTour()
  const ref = useRef<ViewRef>(null)

  useEffect(() => daftarTarget(id, { ref, radius, tetap }), [daftarTarget, id, radius, tetap])

  // collapsable=false: Android tidak membuang View pembungkus, sehingga bisa diukur
  return { ref, collapsable: false } as const
}

/**
 * Pasang pada ScrollView layar yang memuat target, agar langkah tur bisa menggulung
 * elemen yang belum terlihat ke area layar:
 *   const scroll = useTourScroll()
 *   <ScrollView {...scroll}>
 */
export function useTourScroll() {
  const { daftarScroll } = useTour()
  const ref = useRef<ScrollRef>(null)
  const offset = useRef(0)

  useEffect(() => daftarScroll({ ref, offset }), [daftarScroll])

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y
  }, [])

  return { ref, onScroll, scrollEventThrottle: 16 } as const
}
