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
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { mapSupabaseError, normalizeNomorWa } from '../../lib/auth-utils'
import { supabase } from '../../lib/supabase'
import { Theme, useStyles } from '../../lib/theme'

const TINGGI_TUMPANG_TINDIH = 36

export default function LoginScreen() {
  const styles = useStyles(buatStyles)
  const router = useRouter()

  const [nomorWa, setNomorWa] = useState('')
  const [password, setPassword] = useState('')
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
        <CurvedHeader ruangBawah={TINGGI_TUMPANG_TINDIH + Spacing.xxl}>
          <View style={styles.hero}>
            <Logo terang ukuran={64} />
            <Text style={styles.subtitle}>Masuk ke akun agen Anda</Text>
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
              placeholder="Masukkan password"
              kataSandi
              autoCapitalize="none"
              editable={!loading}
            />

            <Button label="Masuk" onPress={handleLogin} loading={loading} />
          </Card>

          <Pressable
            style={styles.link}
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.linkTeks}>
              Belum punya akun? <Text style={styles.linkSorot}>Daftar di sini</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  subtitle: { fontFamily: Font.regular, color: t.pastel.rose.bg, fontSize: FontSize.md },
  formWrap: { marginTop: -TINGGI_TUMPANG_TINDIH, paddingHorizontal: Spacing.xl },
  form: { gap: Spacing.lg },
  errorBox: { backgroundColor: t.pastel.rose.bg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: t.pastel.rose.teks, fontSize: FontSize.sm, fontFamily: Font.semibold, textAlign: 'center' },
  link: { marginTop: Spacing.xl, alignItems: 'center' },
  linkTeks: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary },
  linkSorot: { color: t.colors.accent, fontFamily: Font.bold },
})
