import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
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
import { Colors, FontSize, Radius } from '../../../constants/theme'
import { formatRupiah } from '../../../lib/format'
import { panggilFungsi } from '../../../lib/functions'
import { ambilProfilSaya, hargaUntukTier, ProfilSaya } from '../../../lib/profil'
import { supabase } from '../../../lib/supabase'

interface ProdukRow {
  kode_produk: string
  nama: string
  kategori: string | null
  harga_jual_biasa: number
  harga_jual_master: number
}

// Pulsa, data, e-wallet, listrik, dll. memakai angka; game bisa memakai ID huruf+angka.
function bersihkanTujuan(value: string, kategori: string | null): string {
  return kategori === 'game' ? value.replace(/[^A-Za-z0-9]/g, '') : value.replace(/\D/g, '')
}

export default function BeliScreen() {
  const router = useRouter()
  const { kode } = useLocalSearchParams<{ kode: string }>()

  const [produk, setProduk] = useState<ProdukRow | null>(null)
  const [profil, setProfil] = useState<ProfilSaya | null>(null)
  const [punyaPin, setPunyaPin] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [tujuan, setTujuan] = useState('')
  const [pin, setPin] = useState('')

  const muat = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const [profilSaya, hasilProduk, hasilPin] = await Promise.all([
        ambilProfilSaya(),
        supabase
          .from('produk')
          .select('kode_produk, nama, kategori, harga_jual_biasa, harga_jual_master')
          .eq('kode_produk', kode)
          .eq('aktif', true)
          .maybeSingle(),
        supabase.rpc('punya_pin'),
      ])

      if (hasilProduk.error) throw new Error(`Gagal memuat produk: ${hasilProduk.error.message}`)
      if (!hasilProduk.data) throw new Error('Produk tidak ditemukan atau tidak aktif')

      setProfil(profilSaya)
      setProduk(hasilProduk.data as ProdukRow)
      setPunyaPin(hasilPin.data === true)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }, [kode])

  // Dimuat ulang saat kembali dari layar PIN supaya status PIN terbaru terbaca
  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  const harga = produk ? hargaUntukTier(profil?.tier ?? null, produk) : 0
  const saldoKurang = profil ? profil.saldo < harga : false
  const tujuanValid = /^[A-Za-z0-9]{4,30}$/.test(tujuan)
  const siapKirim = tujuanValid && /^\d{6}$/.test(pin) && !saldoKurang && punyaPin && !submitting

  const kirim = async () => {
    if (!produk) return
    setSubmitting(true)

    const hasil = await panggilFungsi<{ transaksi_id: string }>('create-transaction', {
      kode_produk: produk.kode_produk,
      nomor_tujuan: tujuan,
      pin,
    })

    setSubmitting(false)
    setPin('')

    if (hasil.error) {
      if (hasil.kode === 'PIN_BELUM_ADA') setPunyaPin(false)
      Alert.alert('Transaksi gagal', hasil.error)
      return
    }

    Alert.alert('Transaksi diproses', 'Pantau statusnya di menu Riwayat.', [
      { text: 'Lihat Riwayat', onPress: () => router.replace('/(app)/(tabs)/riwayat') },
    ])
  }

  const konfirmasi = () => {
    if (!produk) return
    Alert.alert(
      'Konfirmasi pembelian',
      `${produk.nama}\nTujuan: ${tujuan}\nHarga: ${formatRupiah(harga)}`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Beli', onPress: kirim },
      ],
    )
  }

  if (loading && !produk) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!produk || !profil) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMessage || 'Produk tidak tersedia'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={muat}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <Text style={styles.produkNama}>{produk.nama}</Text>
          <Text style={styles.produkKode}>{produk.kode_produk}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Harga</Text>
            <Text style={styles.harga}>{formatRupiah(harga)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Saldo Anda</Text>
            <Text style={[styles.value, saldoKurang && styles.valueError]}>{formatRupiah(profil.saldo)}</Text>
          </View>
        </View>

        {saldoKurang ? (
          <Text style={styles.errorText}>Saldo tidak mencukupi. Top-up saldo lewat menu Profil.</Text>
        ) : null}

        <Text style={styles.fieldLabel}>Nomor / ID Tujuan</Text>
        <TextInput
          style={styles.input}
          value={tujuan}
          onChangeText={(v) => setTujuan(bersihkanTujuan(v, produk.kategori))}
          placeholder="Contoh: 081234567890"
          placeholderTextColor={Colors.grey}
          keyboardType={produk.kategori === 'game' ? 'default' : 'number-pad'}
          autoCapitalize="none"
          maxLength={30}
          editable={!submitting}
        />

        {punyaPin ? (
          <>
            <Text style={styles.fieldLabel}>PIN Transaksi</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 digit PIN"
              placeholderTextColor={Colors.grey}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              editable={!submitting}
            />
          </>
        ) : (
          <View style={styles.pinNotice}>
            <Text style={styles.pinNoticeText}>Buat PIN transaksi dulu sebelum bisa membeli.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/(app)/pin')}>
              <Text style={styles.retryText}>Buat PIN</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submit, !siapKirim && styles.submitDisabled]}
          onPress={konfirmasi}
          disabled={!siapKirim}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitText}>Beli Sekarang</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  summary: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  produkNama: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  produkKode: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary },
  harga: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
  value: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  valueError: { color: Colors.error },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginBottom: 12 },
  pinNotice: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 8,
    alignItems: 'center',
    gap: 10,
  },
  pinNoticeText: { color: Colors.primaryDark, fontSize: FontSize.sm, textAlign: 'center' },
  retryButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '600' },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '700' },
})
