import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Colors, FontSize, Radius } from '../../constants/theme'

function normalizeNomorWa(input: string): string {
  let digits = input.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1)
  }

  return digits
}

function nomorWaToEmail(nomorWa: string): string {
  return `${normalizeNomorWa(nomorWa)}@apppulsa.app`
}

function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Nomor WhatsApp sudah terdaftar'
  }
  if (lower.includes('password') && lower.includes('6')) {
    return 'Password minimal 6 karakter'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Data login tidak valid'
  }

  return message || 'Terjadi kesalahan, silakan coba lagi'
}

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
    const trimmedKodeReferral = kodeReferral.trim().toUpperCase()

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

      let masterId: string | null = null

      if (trimmedKodeReferral) {
        const { data: masterProfile, error: referralError } = await supabase
          .from('profiles')
          .select('id')
          .eq('kode_referral', trimmedKodeReferral)
          .eq('tier', 'master')
          .maybeSingle()

        if (referralError) {
          showError(mapSupabaseError(referralError.message))
          return
        }

        if (!masterProfile) {
          showError('Kode referral tidak valid')
          return
        }

        masterId = masterProfile.id
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

      const profileUpdate: {
        nomor_wa: string
        direferensikan_oleh?: string
      } = {
        nomor_wa: normalizedWa,
      }

      if (masterId) {
        profileUpdate.direferensikan_oleh = masterId
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)

      if (updateError) {
        showError(mapSupabaseError(updateError.message))
        return
      }

      await supabase.auth.signOut()

      Alert.alert(
        'Berhasil',
        'Akun berhasil dibuat. Silakan masuk dengan nomor WhatsApp dan password Anda.',
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
        <Text style={styles.title}>App Pulsa</Text>
        <Text style={styles.subtitle}>Daftar akun agen baru</Text>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nama Lengkap</Text>
          <TextInput
            style={styles.input}
            value={nama}
            onChangeText={setNama}
            placeholder="Masukkan nama lengkap"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="words"
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nomor WhatsApp</Text>
          <TextInput
            style={styles.input}
            value={nomorWa}
            onChangeText={setNomorWa}
            placeholder="Contoh: 081234567890"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 6 karakter"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Konfirmasi Password</Text>
          <TextInput
            style={styles.input}
            value={konfirmasiPassword}
            onChangeText={setKonfirmasiPassword}
            placeholder="Ulangi password"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Kode Referral (opsional)</Text>
          <TextInput
            style={styles.input}
            value={kodeReferral}
            onChangeText={(text) => setKodeReferral(text.toUpperCase())}
            placeholder="Masukkan kode referral"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="characters"
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleDaftar}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color={Colors.textWhite} size="small" />
              <Text style={styles.buttonText}>Memproses...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Daftar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
          disabled={loading}
        >
          <Text style={styles.loginLinkText}>
            Sudah punya akun?{' '}
            <Text style={styles.loginLinkHighlight}>Masuk di sini</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.textWhite,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  loginLinkHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
