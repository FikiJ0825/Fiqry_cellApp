import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors, FontSize, Radius } from '../../../constants/theme'
import { formatNomorWaDisplay } from '../../../lib/auth-utils'
import { formatRupiah } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import { formatWaktu } from '../../../lib/transaksi'

interface AgenDetail {
  id: string
  nama: string | null
  nomor_wa: string | null
  saldo: number
  saldo_bonus_pending: number | null
  tier: string | null
  aktif: boolean | null
  dibuat_pada: string | null
  kode_referral: string | null
}

export default function AgenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [agen, setAgen] = useState<AgenDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [jumlah, setJumlah] = useState('')
  const [catatan, setCatatan] = useState('')

  const muat = useCallback(async () => {
    setErrorMessage('')
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nama, nomor_wa, saldo, saldo_bonus_pending, tier, aktif, dibuat_pada, kode_referral')
      .eq('id', id)
      .single()

    if (error) setErrorMessage(`Gagal memuat agen: ${error.message}`)
    else setAgen({ ...data, saldo: Number(data.saldo ?? 0) } as AgenDetail)
    setLoading(false)
  }, [id])

  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  const ubahSaldo = async (arah: 1 | -1) => {
    const nominal = Number(jumlah.replace(/\D/g, ''))
    if (!nominal) {
      Alert.alert('Jumlah belum diisi', 'Isi nominal dalam rupiah, tanpa titik.')
      return
    }

    const aksi = arah === 1 ? 'Tambah' : 'Kurangi'
    Alert.alert(`${aksi} saldo`, `${aksi} ${formatRupiah(nominal)} untuk ${agen?.nama ?? 'agen ini'}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: aksi,
        onPress: async () => {
          setBusy(true)
          const { error } = await supabase.rpc('tambah_saldo_admin', {
            p_agen_id: id,
            p_jumlah: nominal * arah,
            p_catatan: catatan,
          })
          setBusy(false)

          if (error) {
            Alert.alert('Gagal', error.message)
            return
          }
          setJumlah('')
          setCatatan('')
          await muat()
          Alert.alert('Berhasil', 'Saldo agen diperbarui')
        },
      },
    ])
  }

  const ubahProfil = async (perubahan: { aktif?: boolean; tier?: string }) => {
    setBusy(true)
    const { error } = await supabase.from('profiles').update(perubahan).eq('id', id)
    setBusy(false)

    if (error) {
      Alert.alert('Gagal', error.message)
      return
    }
    await muat()
  }

  const gantiTier = (tierBaru: 'biasa' | 'master') => {
    if (agen?.tier === tierBaru) return
    Alert.alert('Ubah tier', `Ubah tier ${agen?.nama ?? 'agen'} menjadi ${tierBaru === 'master' ? 'Master' : 'Biasa'}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ubah', onPress: () => ubahProfil({ tier: tierBaru }) },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!agen) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMessage || 'Agen tidak ditemukan'}</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: agen.nama ?? 'Detail Agen' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.saldoLabel}>Saldo</Text>
          <Text style={styles.saldoValue}>{formatRupiah(agen.saldo)}</Text>
          <Baris label="Nomor WA" nilai={agen.nomor_wa ? formatNomorWaDisplay(agen.nomor_wa) : '-'} />
          <Baris label="Kode referral" nilai={agen.kode_referral ?? '-'} />
          <Baris label="Bonus menunggu klaim" nilai={formatRupiah(Number(agen.saldo_bonus_pending ?? 0))} />
          <Baris label="Bergabung" nilai={formatWaktu(agen.dibuat_pada) || '-'} />
        </View>

        <Text style={styles.sectionTitle}>Tambah / Kurangi Saldo</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={jumlah}
            onChangeText={(v) => setJumlah(v.replace(/\D/g, ''))}
            placeholder="Nominal (Rp)"
            placeholderTextColor={Colors.grey}
            keyboardType="number-pad"
            editable={!busy}
          />
          <TextInput
            style={styles.input}
            value={catatan}
            onChangeText={setCatatan}
            placeholder="Catatan (mis. top-up transfer BCA)"
            placeholderTextColor={Colors.grey}
            editable={!busy}
          />
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => ubahSaldo(1)} disabled={busy}>
              <Text style={styles.btnPrimaryText}>Tambah</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => ubahSaldo(-1)} disabled={busy}>
              <Text style={styles.btnOutlineText}>Kurangi</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pengaturan Akun</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Akun aktif</Text>
            <Switch
              value={agen.aktif !== false}
              onValueChange={(v) => ubahProfil({ aktif: v })}
              disabled={busy}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={agen.aktif !== false ? Colors.primary : Colors.grey}
            />
          </View>
          <Text style={styles.fieldLabel}>Tier</Text>
          <View style={styles.btnRow}>
            {(['biasa', 'master'] as const).map((t) => {
              const dipilih = (agen.tier === 'master' ? 'master' : 'biasa') === t
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.btn, dipilih ? styles.btnPrimary : styles.btnOutline]}
                  onPress={() => gantiTier(t)}
                  disabled={busy}
                >
                  <Text style={dipilih ? styles.btnPrimaryText : styles.btnOutlineText}>
                    {t === 'master' ? 'Master' : 'Biasa'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.baris}>
      <Text style={styles.barisLabel}>{label}</Text>
      <Text style={styles.barisNilai}>{nilai}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  saldoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  saldoValue: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.primary, marginBottom: 8 },
  baris: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  barisLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  barisNilai: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  btnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  btnPrimaryText: { color: Colors.textWhite, fontWeight: '700', fontSize: FontSize.md },
  btnOutline: { backgroundColor: Colors.background, borderColor: Colors.primary },
  btnOutlineText: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: FontSize.md, color: Colors.textPrimary },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
})
