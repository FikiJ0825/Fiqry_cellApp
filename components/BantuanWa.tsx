import { Ionicons } from '@expo/vector-icons'
import { useSegments } from 'expo-router'
import { useState } from 'react'
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NOMOR_ADMIN_BANTUAN } from '../constants/config'
import { Font, FontSize, Radius, Spacing } from '../constants/theme'
import { Alert, bukaTautanLuar } from '../lib/dialog'
import { ambilProfilSaya, ProfilSaya } from '../lib/profil'
import { Theme, useStyles, useTheme } from '../lib/theme'
import { useTour } from '../lib/tour/useTour'

const WARNA_WA = '#25D366'
/** Perkiraan tinggi tab bar (FloatingTabBar) ditambah jarak, agar tombol melayang di atasnya */
const JARAK_DARI_BAWAH = 112
/** Layar yang punya tombol aksi sendiri di bagian bawah atau tidak perlu bantuan melayang */
const SEGMEN_SEMBUNYI = ['onboarding', 'pin', 'beli', 'topup']

/**
 * Tombol WhatsApp melayang untuk agen: bertanya soal transaksi atau kendala.
 * Ditekan -> pilih Admin 1 / Admin 2 -> WhatsApp terbuka dengan pesan berisi nama, nomor WA, dan tier agen.
 * Disembunyikan saat tur aktif, di layar tertentu, dan untuk akun admin.
 */
export default function BantuanWa() {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const segmen: string[] = useSegments()
  const { aktif: turAktif } = useTour()
  const [terbuka, setTerbuka] = useState(false)
  const [profil, setProfil] = useState<ProfilSaya | null>(null)

  const adalahAdmin = segmen.includes('(admin)')
  const sembunyi = turAktif || adalahAdmin || segmen.some((s) => SEGMEN_SEMBUNYI.includes(s))
  if (sembunyi) return null

  const bukaSheet = async () => {
    setTerbuka(true)
    if (!profil) {
      try {
        setProfil(await ambilProfilSaya())
      } catch {
        // Tanpa data profil, pesan tetap bisa dikirim
      }
    }
  }

  const kirim = async (nomor: string) => {
    setTerbuka(false)
    const identitas = profil
      ? `saya ${profil.nama ?? 'pengguna AdePulsa'} (Nomor WA: ${profil.nomor_wa ?? '-'}, ${profil.tier === 'master' ? 'Agen Master' : 'Agen Reguler'})`
      : 'saya pengguna AdePulsa'
    const pesan = `Halo Admin AdePulsa, ${identitas}.\nSaya ingin bertanya tentang transaksi atau kendala di AdePulsa:`
    const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`
    try {
      if (bukaTautanLuar(url)) return
      await Linking.openURL(url)
    } catch {
      Alert.alert('Gagal', 'Tidak bisa membuka WhatsApp. Pastikan aplikasi WhatsApp terpasang.')
    }
  }

  return (
    <>
      <Pressable
        onPress={() => void bukaSheet()}
        accessibilityRole="button"
        accessibilityLabel="Tanya admin lewat WhatsApp"
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + JARAK_DARI_BAWAH },
          pressed && styles.fabTekan,
        ]}
      >
        <Ionicons name="logo-whatsapp" size={26} color="#FFFFFF" />
      </Pressable>

      <Modal visible={terbuka} transparent animationType="fade" onRequestClose={() => setTerbuka(false)}>
        <Pressable style={styles.latar} onPress={() => setTerbuka(false)} accessibilityLabel="Tutup">
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]} onPress={() => undefined}>
            <View style={styles.grip} />
            <Text style={styles.judul}>Hubungi Admin</Text>
            <Text style={styles.keterangan}>Tanyakan transaksi atau kendala di AdePulsa lewat WhatsApp.</Text>

            {NOMOR_ADMIN_BANTUAN.map((admin) => (
              <Pressable
                key={admin.nomor}
                onPress={() => void kirim(admin.nomor)}
                accessibilityRole="button"
                accessibilityLabel={`Chat ${admin.label} di WhatsApp`}
                style={({ pressed }) => [styles.opsi, pressed && styles.opsiTekan]}
              >
                <View style={styles.ikonWa}>
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.opsiTeks}>
                  <Text style={styles.opsiJudul}>{admin.label}</Text>
                  <Text style={styles.opsiNomor}>+{admin.nomor}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.grey} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: Spacing.lg,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: WARNA_WA,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 40,
      elevation: 6,
      shadowColor: '#000000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    fabTekan: { transform: [{ scale: 0.95 }] },
    latar: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
    },
    grip: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.border,
      marginBottom: Spacing.sm,
    },
    judul: { fontFamily: Font.bold, fontSize: FontSize.lg, color: t.colors.textPrimary },
    keterangan: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, marginBottom: Spacing.xs },
    opsi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    opsiTekan: { backgroundColor: t.colors.surfaceAlt },
    ikonWa: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: WARNA_WA,
      alignItems: 'center',
      justifyContent: 'center',
    },
    opsiTeks: { flex: 1 },
    opsiJudul: { fontFamily: Font.semibold, fontSize: FontSize.md, color: t.colors.textPrimary },
    opsiNomor: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, marginTop: 2 },
  })
