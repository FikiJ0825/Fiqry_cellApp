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
import { mapSupabaseError, normalizeNomorWa } from '../../lib/auth-utils'
import { Colors, FontSize, Radius } from '../../constants/theme'

export default function LoginScreen() {
  const router = useRouter()

  const [nomorWa, setNomorWa] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const showError = (message: string) => {
    setErrorMessage(message)
    Alert.alert('Gagal', message)
  }

  const handleLogin = async () => {
    setErrorMessage('')

    const trimmedNomorWa = nomorWa.trim()

    if (!trimmedNomorWa) {
      showError('Nomor WhatsApp wajib diisi')
      return
    }

    if (!password) {
      showError('Password wajib diisi')
      return
    }

    const normalizedWa = normalizeNomorWa(trimmedNomorWa)

    if (!normalizedWa || normalizedWa.length < 9) {
      showError('Nomor WhatsApp tidak valid')
      return
    }

    setLoading(true)

    try {
      const { data: emailAuth, error: lookupError } = await supabase.rpc(
        'get_email_by_nomor_wa',
        { input_nomor_wa: normalizedWa },
      )

      if (lookupError || !emailAuth) {
        showError('Nomor WhatsApp tidak terdaftar')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailAuth,
        password,
      })

      if (signInError) {
        showError(mapSupabaseError(signInError.message))
        return
      }
    } catch {
      showError('Terjadi kesalahan, coba lagi')
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
        <Text style={styles.subtitle}>Masuk ke akun agen Anda</Text>

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
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Masukkan password"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              disabled={loading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.togglePasswordText}>
                {showPassword ? 'Sembunyikan' : 'Tampilkan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color={Colors.textWhite} size="small" />
              <Text style={styles.buttonText}>Memproses...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Masuk</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/(auth)/register')}
          disabled={loading}
        >
          <Text style={styles.registerLinkText}>
            Belum punya akun?{' '}
            <Text style={styles.registerLinkHighlight}>Daftar di sini</Text>
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
    marginBottom: 8,
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  togglePasswordText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 8,
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
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  registerLinkHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
