import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import IconTile from '../../components/ui/IconTile'
import Loading from '../../components/ui/Loading'
import PinInput from '../../components/ui/PinInput'
import ResultSheet from '../../components/ui/ResultSheet'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../constants/theme'
import { panggilFungsi } from '../../lib/functions'
import { supabase } from '../../lib/supabase'

export default function PinScreen() {
  const router = useRouter()
  const [punyaPin, setPunyaPin] = useState<boolean | null>(null)
  const [pinLama, setPinLama] = useState('')
  const [pinBaru, setPinBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [berhasil, setBerhasil] = useState(false)

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

    setBerhasil(true)
  }

  if (punyaPin === null) return <Loading />

  const siap =
    !saving && pinBaru.length === 6 && konfirmasi.length === 6 && (!punyaPin || pinLama.length === 6)

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.judulBaris}>
          <IconTile ikon="shield-checkmark-outline" warna="sky" size={52} />
          <View style={styles.judulTeks}>
            <Text style={styles.heading}>{punyaPin ? 'Ubah PIN Transaksi' : 'Buat PIN Transaksi'}</Text>
            <Text style={styles.hint}>
              PIN 6 digit dipakai setiap kali membeli produk. Jangan bagikan PIN ke siapa pun.
            </Text>
          </View>
        </View>

        <Card style={styles.form}>
          {punyaPin ? <PinInput label="PIN Lama" value={pinLama} onChange={setPinLama} editable={!saving} /> : null}
          <PinInput label="PIN Baru" value={pinBaru} onChange={setPinBaru} editable={!saving} />
          <PinInput label="Ulangi PIN Baru" value={konfirmasi} onChange={setKonfirmasi} editable={!saving} />
        </Card>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Button label="Simpan PIN" onPress={simpan} disabled={!siap} loading={saving} />
      </ScrollView>

      <ResultSheet
        visible={berhasil}
        ikon="checkmark-circle-outline"
        warna="mint"
        judul="PIN tersimpan"
        pesan="PIN transaksi berhasil disimpan."
        aksi={{
          label: 'Selesai',
          onPress: () => {
            setBerhasil(false)
            router.back()
          },
        }}
        onTutup={() => {
          setBerhasil(false)
          router.back()
        }}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 40, gap: Spacing.lg },
  judulBaris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  judulTeks: { flex: 1 },
  heading: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  form: { gap: Spacing.lg },
  errorBox: { backgroundColor: Pastel.rose.bg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: Pastel.rose.teks, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'center' },
})
