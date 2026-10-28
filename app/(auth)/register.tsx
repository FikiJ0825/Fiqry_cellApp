import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
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
import CurvedHeader from '../../components/ui/CurvedHeader'
import Input from '../../components/ui/Input'
import Logo from '../../components/ui/Logo'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../constants/theme'
import { mapSupabaseError, nomorWaToEmail, normalizeNomorWa } from '../../lib/auth-utils'
import { supabase } from '../../lib/supabase'

const TINGGI_TUMPANG_TINDIH = 36

export default function RegisterScreen() {
  const router = useRouter()

  const [nama, setNama] = useState('')
  const [nomorWa, setNomorWa] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')
  const [kodeReferral, setKodeReferral] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const showError = (message: string) => {
    setErrorMessage(message)
    Alert.alert('Gagal', message)
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

      const email = nomorWaToEmail(trimmedNomorWa)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama: trimmedNama,
          },
        },
      })

      if (signUpError) {
        showError(mapSupabaseError(signUpError.message))
        return
      }

      const userId = signUpData.user?.id

      if (!userId) {
        showError('Registrasi gagal, data pengguna tidak ditemukan')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nomor_wa: normalizedWa, email_auth: email })
        .eq('id', userId)

      if (updateError) {
        showError(mapSupabaseError(updateError.message))
        return
      }

      // Akun sudah jadi; kegagalan memasang referral tidak boleh menggagalkan pendaftaran
      let catatanReferral = ''
      if (trimmedKodeReferral) {
        const { error: pasangError } = await supabase.rpc('pasang_referral', { p_kode: trimmedKodeReferral })
        if (pasangError) {
          catatanReferral = ' Kode referral belum tercatat, hubungi admin bila perlu.'
        }
      }

      await supabase.auth.signOut()

      Alert.alert(
        'Berhasil',
        `Akun berhasil dibuat.${catatanReferral} Silakan masuk dengan nomor WhatsApp dan password Anda.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Terjadi kesalahan, silakan coba lagi'
      showError(mapSupabaseError(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader ruangBawah={TINGGI_TUMPANG_TINDIH + Spacing.xxl}>
          <View style={styles.hero}>
            <Logo terang ukuran={52} />
            <Text style={styles.subtitle}>Daftar akun agen baru</Text>
          </View>
        </CurvedHeader>

        <View style={styles.formWrap}>
          <Card style={styles.form}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

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
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  subtitle: { color: Pastel.rose.bg, fontSize: FontSize.md },
  formWrap: { marginTop: -TINGGI_TUMPANG_TINDIH, paddingHorizontal: Spacing.xl },
  form: { gap: Spacing.lg },
  errorBox: { backgroundColor: Pastel.rose.bg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: Pastel.rose.teks, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'center' },
  link: { marginTop: Spacing.xl, alignItems: 'center' },
  linkTeks: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkSorot: { color: Colors.primary, fontWeight: FontWeight.bold },
})
