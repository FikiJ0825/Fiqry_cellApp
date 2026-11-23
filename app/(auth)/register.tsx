import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Logo from '../../components/ui/Logo'
import Screen from '../../components/ui/Screen'
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { formatNomorWaDisplay, mapSupabaseError, normalizeNomorWa } from '../../lib/auth-utils'
import { Alert } from '../../lib/dialog'
import { LEBAR_MAKS } from '../../lib/skala'
import { panggilFungsi } from '../../lib/functions'
import { supabase } from '../../lib/supabase'
import { Theme, useStyles } from '../../lib/theme'


export default function RegisterScreen() {
  const styles = useStyles(buatStyles)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [nama, setNama] = useState('')
  const [nomorWa, setNomorWa] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')
  const [kodeReferral, setKodeReferral] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  // Pendaftaran dua langkah: isi data -> masukkan kode OTP yang dikirim ke WhatsApp
  const [tahap, setTahap] = useState<'form' | 'otp'>('form')
  const [otp, setOtp] = useState('')
  const [jeda, setJeda] = useState(0)

  // Hitung mundur sebelum tombol "Kirim ulang kode" aktif lagi (server juga membatasi 60 detik)
  useEffect(() => {
    if (jeda <= 0) return
    const timer = setTimeout(() => setJeda((j) => j - 1), 1000)
    return () => clearTimeout(timer)
  }, [jeda])

  const showError = (message: string) => {
    setErrorMessage(message)
    Alert.alert('Gagal', message)
  }

  const kirimOtp = async (nomorNormal: string): Promise<boolean> => {
    const { error } = await panggilFungsi('kirim-otp', { nomor_wa: nomorNormal })
    if (error) {
      showError(error)
      return false
    }
    setJeda(60)
    return true
  }

  const handleKirimUlang = async () => {
    if (jeda > 0 || loading) return
    setErrorMessage('')
    setLoading(true)
    try {
      await kirimOtp(normalizeNomorWa(nomorWa.trim()))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifikasi = async () => {
    setErrorMessage('')
    if (!/^\d{6}$/.test(otp.trim())) {
      showError('Masukkan 6 digit kode verifikasi')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await panggilFungsi<{ referral_terpasang?: boolean }>('daftar', {
        nama: nama.trim(),
        nomor_wa: normalizeNomorWa(nomorWa.trim()),
        password,
        kode_referral: kodeReferral.trim(),
        otp: otp.trim(),
      })
      if (error) {
        showError(error)
        return
      }

      const catatanReferral =
        kodeReferral.trim() && data?.referral_terpasang === false
          ? ' Kode referral belum tercatat, hubungi admin bila perlu.'
          : ''

      Alert.alert(
        'Berhasil',
        `Akun berhasil dibuat.${catatanReferral} Silakan masuk dengan nomor WhatsApp dan password Anda.`,
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      )
    } catch (error) {
      showError(mapSupabaseError(error instanceof Error ? error.message : ''))
    } finally {
      setLoading(false)
    }
  }

  const handleDaftar = async () => {
    setErrorMessage('')

    const trimmedNama = nama.trim()
    const trimmedNomorWa = nomorWa.trim()
    // Kode referral dibuat huruf kecil di database; pencocokan tidak peka huruf besar/kecil di server
    const trimmedKodeReferral = kodeReferral.trim()

    if (!trimmedNama) {
      showError('Nama lengkap wajib diisi')
      return
    }

    if (!trimmedNomorWa) {
      showError('Nomor WhatsApp wajib diisi')
      return
    }

    if (!password) {
      showError('Password wajib diisi')
      return
    }

    if (password.length < 6) {
      showError('Password minimal 6 karakter')
      return
    }

    if (!konfirmasiPassword) {
      showError('Konfirmasi password wajib diisi')
      return
    }

    if (password !== konfirmasiPassword) {
      showError('Konfirmasi password tidak cocok')
      return
    }

    const normalizedWa = normalizeNomorWa(trimmedNomorWa)

    if (!normalizedWa || normalizedWa.length < 10) {
      showError('Nomor WhatsApp tidak valid')
      return
    }

    setLoading(true)

    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('nomor_wa', normalizedWa)
        .maybeSingle()

      if (checkError) {
        showError(mapSupabaseError(checkError.message))
        return
      }

      if (existingProfile) {
        showError('Nomor WhatsApp sudah terdaftar')
        return
      }

      // Semua agen (Biasa maupun Master) punya kode referral, jadi kode dari tier mana pun valid.
      // Dicek lewat RPC karena pendaftar belum login dan RLS profiles tidak mengizinkan membaca profil lain.
      if (trimmedKodeReferral) {
        const { data: kodeValid, error: referralError } = await supabase.rpc('cek_kode_referral', {
          p_kode: trimmedKodeReferral,
        })

        if (referralError) {
          showError(mapSupabaseError(referralError.message))
          return
        }

        if (kodeValid !== true) {
          showError('Kode referral tidak valid')
          return
        }
      }

      // Akun baru dibuat server (Edge Function daftar) setelah kode OTP WhatsApp benar
      if (await kirimOtp(normalizedWa)) {
        setOtp('')
        setTahap('otp')
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Terjadi kesalahan, silakan coba lagi'
      showError(mapSupabaseError(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + Spacing.xxl }]}>
          <Logo ukuran={72} />
          <Text style={styles.subtitle}>Daftar akun baru</Text>
        </View>

        <View style={styles.formWrap}>
          <Card style={styles.form}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {tahap === 'otp' ? (
              <>
                <Text style={styles.otpJudul}>Verifikasi nomor WhatsApp</Text>
                <Text style={styles.otpInfo}>
                  Kami mengirim kode 6 digit ke WhatsApp {formatNomorWaDisplay(normalizeNomorWa(nomorWa.trim()))}.
                  Kode berlaku 5 menit.
                </Text>
                <Input
                  label="Kode Verifikasi"
                  ikon="shield-checkmark-outline"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digit kode"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
                <Button label="Verifikasi & Daftar" onPress={handleVerifikasi} loading={loading} />
                <Pressable
                  onPress={handleKirimUlang}
                  disabled={jeda > 0 || loading}
                  accessibilityRole="button"
                  style={styles.otpUlang}
                >
                  <Text style={[styles.linkTeks, (jeda > 0 || loading) && styles.otpUlangMati]}>
                    {jeda > 0 ? `Kirim ulang kode (${jeda} dtk)` : 'Kirim ulang kode'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setTahap('form')
                    setErrorMessage('')
                  }}
                  disabled={loading}
                  accessibilityRole="button"
                  style={styles.otpUlang}
                >
                  <Text style={styles.linkSorot}>Ubah data / nomor</Text>
                </Pressable>
              </>
            ) : (
            <>
            <Input
              label="Nama Lengkap"
              ikon="person-outline"
              value={nama}
              onChangeText={setNama}
              placeholder="Masukkan nama lengkap"
              autoCapitalize="words"
              editable={!loading}
            />

            <Input
              label="Nomor WhatsApp"
              ikon="logo-whatsapp"
              value={nomorWa}
              onChangeText={setNomorWa}
              placeholder="Contoh: 081234567890"
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Input
              label="Password"
              ikon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimal 6 karakter"
              kataSandi
              autoCapitalize="none"
              editable={!loading}
            />

            <Input
              label="Konfirmasi Password"
              ikon="lock-closed-outline"
              value={konfirmasiPassword}
              onChangeText={setKonfirmasiPassword}
              placeholder="Ulangi password"
              kataSandi
              autoCapitalize="none"
              editable={!loading}
            />

            <Input
              label="Kode Referral (opsional)"
              ikon="gift-outline"
              value={kodeReferral}
              onChangeText={setKodeReferral}
              placeholder="Masukkan kode referral"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Button label="Daftar" onPress={handleDaftar} loading={loading} />
            </>
            )}
          </Card>

          <Pressable
            style={styles.link}
            onPress={() => router.push('/(auth)/login')}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.linkTeks}>
              Sudah punya akun? <Text style={styles.linkSorot}>Masuk di sini</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </Screen>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.lg },
  subtitle: { fontFamily: Font.regular, color: t.colors.textSecondary, fontSize: FontSize.md },
  formWrap: { paddingHorizontal: Spacing.xl, width: '100%', maxWidth: LEBAR_MAKS, alignSelf: 'center' },
  form: { gap: Spacing.lg },
  errorBox: { backgroundColor: t.pastel.rose.bg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: t.pastel.rose.teks, fontSize: FontSize.sm, fontFamily: Font.semibold, textAlign: 'center' },
  otpJudul: { fontFamily: Font.bold, fontSize: FontSize.lg, color: t.colors.textPrimary, textAlign: 'center' },
  otpInfo: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, textAlign: 'center' },
  otpUlang: { alignItems: 'center', paddingVertical: Spacing.xs },
  otpUlangMati: { opacity: 0.5 },
  link: { marginTop: Spacing.xl, alignItems: 'center' },
  linkTeks: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary },
  linkSorot: { color: t.colors.accent, fontFamily: Font.bold },
})
