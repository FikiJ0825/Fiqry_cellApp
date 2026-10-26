import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Colors, FontSize, Radius } from '../constants/theme'
import type { BannerAktif } from '../lib/banner'

const KEY_TERAKHIR = 'popup_promo_terakhir'

function hariIni(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

interface Props {
  banner: BannerAktif | null
  onPressBanner: (banner: BannerAktif) => void
}

/** Pop-up promo: tampil maksimal 1x per hari per perangkat, bisa ditutup. */
export default function PromoPopup({ banner, onPressBanner }: Props) {
  const { width } = useWindowDimensions()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!banner) return
    let aktif = true

    async function putuskan() {
      try {
        const terakhir = await AsyncStorage.getItem(KEY_TERAKHIR)
        if (terakhir === hariIni()) return
        if (aktif) setVisible(true)
      } catch {
        // storage gagal dibaca: lebih baik tidak menampilkan daripada muncul terus
      }
    }

    void putuskan()
    return () => {
      aktif = false
    }
  }, [banner])

  const tutup = async () => {
    setVisible(false)
    try {
      await AsyncStorage.setItem(KEY_TERAKHIR, hariIni())
    } catch {
      // abaikan
    }
  }

  if (!banner) return null

  const lebar = Math.min(width - 48, 360)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={tutup}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={tutup} />
        <View style={{ width: lebar }}>
          <TouchableOpacity
            activeOpacity={banner.tipe_aksi === 'tidak_ada' ? 1 : 0.9}
            onPress={async () => {
              await tutup()
              onPressBanner(banner)
            }}
          >
            <Image
              source={{ uri: banner.gambar_url }}
              style={{ width: lebar, height: lebar * 1.25, borderRadius: Radius.lg, backgroundColor: Colors.surface }}
              resizeMode="cover"
              accessibilityLabel={banner.judul}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={tutup} activeOpacity={0.8}>
            <Text style={styles.closeText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  closeButton: {
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  closeText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
})
