import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
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
import { Colors, FontSize, Radius } from '../../constants/theme'
import { panggilFungsi } from '../../lib/functions'
import { supabase } from '../../lib/supabase'

function hanya6Digit(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

export default function PinScreen() {
  const router = useRouter()
  const [punyaPin, setPunyaPin] = useState<boolean | null>(null)
  const [pinLama, setPinLama] = useState('')
  const [pinBaru, setPinBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    supabase.rpc('punya_pin').then(({ data }) => setPunyaPin(data === true))
  }, [])

  const simpan = async () => {
    setErrorMessage('')

    if (!/^\d{6}$/.test(pinBaru)) {
      setErrorMessage('PIN harus 6 digit angka')
      return
    }
    if (pinBaru !== konfirmasi) {
      setErrorMessage('Konfirmasi PIN tidak sama')
      return
    }

    setSaving(true)
    const hasil = await panggilFungsi('atur-pin', {
      pin: pinBaru,
      ...(punyaPin ? { pin_lama: pinLama } : {}),
    })
    setSaving(false)

    if (hasil.error) {
      setErrorMessage(hasil.error)
      return
    }

    Alert.alert('Berhasil', 'PIN transaksi berhasil disimpan', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  if (punyaPin === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const siap =
    !saving && pinBaru.length === 6 && konfirmasi.length === 6 && (!punyaPin || pinLama.length === 6)

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{punyaPin ? 'Ubah PIN Transaksi' : 'Buat PIN Transaksi'}</Text>
        <Text style={styles.hint}>
          PIN 6 digit dipakai setiap kali membeli produk. Jangan bagikan PIN ke siapa pun.
        </Text>

        {punyaPin ? (
          <>
            <Text style={styles.fieldLabel}>PIN Lama</Text>
            <TextInput
              style={styles.input}
              value={pinLama}
              onChangeText={(v) => setPinLama(hanya6Digit(v))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              editable={!saving}
            />
          </>
        ) : null}

        <Text style={styles.fieldLabel}>PIN Baru</Text>
        <TextInput
          style={styles.input}
          value={pinBaru}
          onChangeText={(v) => setPinBaru(hanya6Digit(v))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          editable={!saving}
        />

        <Text style={styles.fieldLabel}>Ulangi PIN Baru</Text>
        <TextInput
          style={styles.input}
          value={konfirmasi}
          onChangeText={(v) => setKonfirmasi(hanya6Digit(v))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          editable={!saving}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, !siap && styles.submitDisabled]}
          onPress={simpan}
          disabled={!siap}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitText}>Simpan PIN</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  heading: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.lg,
    letterSpacing: 6,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginTop: 12 },
  submit: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '700' },
})
