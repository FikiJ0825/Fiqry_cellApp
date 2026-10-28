import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Colors, Radius, Shadow } from '../constants/theme'
import type { BannerAktif } from '../lib/banner'

// Pop-up tampil sekali setiap aplikasi dibuka (per banner). Disimpan di memori, jadi mulai lagi saat aplikasi dibuka ulang.
const sudahTampilSesiIni = new Set<string>()

const RASIO_AWAL = 4 / 5
const RASIO_MIN = 0.55
const RASIO_MAKS = 1.8
const LEBAR_MAKS = 360
const TINGGI_MAKS_PERSEN = 0.7

interface Props {
  banner: BannerAktif | null
  onPressBanner: (banner: BannerAktif) => void
}

export default function PromoPopup({ banner, onPressBanner }: Props) {
  const { width, height } = useWindowDimensions()
  const [visible, setVisible] = useState(false)
  const [rasio, setRasio] = useState(RASIO_AWAL)
  const anim = useRef(new Animated.Value(0)).current

  const bannerId = banner?.id
  const gambarUrl = banner?.gambar_url

  // Pop-up baru tampil setelah ukuran gambar diketahui, supaya mengikuti rasio asli poster dan tidak melompat
  useEffect(() => {
    if (!bannerId || !gambarUrl || sudahTampilSesiIni.has(bannerId)) return
    let aktif = true

    const tampilkan = (rasioGambar: number) => {
      if (!aktif) return
      sudahTampilSesiIni.add(bannerId)
      setRasio(rasioGambar)
      setVisible(true)
    }

    Image.getSize(
      gambarUrl,
      (w, h) => tampilkan(w > 0 && h > 0 ? Math.min(RASIO_MAKS, Math.max(RASIO_MIN, w / h)) : RASIO_AWAL),
      () => tampilkan(RASIO_AWAL),
    )

    return () => {
      aktif = false
    }
  }, [bannerId, gambarUrl])

  useEffect(() => {
    if (!visible) {
      anim.setValue(0)
      return
    }
    Animated.spring(anim, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start()
  }, [visible, anim])

  const tutup = () => setVisible(false)

  if (!banner) return null

  // Batasi tinggi supaya poster tegak tetap muat di layar kecil
  const lebar = Math.min(width - 48, LEBAR_MAKS, height * TINGGI_MAKS_PERSEN * rasio)
  const tinggi = lebar / rasio

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={tutup} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={tutup} accessibilityLabel="Tutup" />
        <Animated.View
          style={{
            width: lebar,
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          }}
        >
          <Pressable
            style={styles.kartu}
            disabled={banner.tipe_aksi === 'tidak_ada'}
            onPress={() => {
              tutup()
              onPressBanner(banner)
            }}
          >
            <Image
              source={{ uri: banner.gambar_url }}
              style={{ width: lebar, height: tinggi, backgroundColor: Colors.primaryLight }}
              resizeMode="cover"
              accessibilityLabel={banner.judul}
            />
          </Pressable>
          <Pressable
            style={styles.tutup}
            onPress={tutup}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Tutup pop-up"
          >
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(43,30,32,0.6)', alignItems: 'center', justifyContent: 'center' },
  kartu: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, ...Shadow.float },
  tutup: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
