import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { KATEGORI_PRODUK } from '../../../../constants/produk'
import { Colors, FontSize, Radius } from '../../../../constants/theme'
import { formatRupiah } from '../../../../lib/format'
import { supabase } from '../../../../lib/supabase'

interface ProdukRow {
  id: string
  kode_produk: string
  nama: string
  kategori: string | null
  harga_jual_biasa: number
  harga_jual_master: number
  aktif: boolean
}

// Kode dipakai di pesan perintah JW (KODE.TUJUAN.PIN) dan dicocokkan dengan balasan JW,
// jadi hanya huruf besar dan angka.
const KODE_PATTERN = /^[A-Z0-9]{2,20}$/

function hanyaDigit(value: string): string {
  return value.replace(/\D/g, '')
}

export default function KatalogFormScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditMode = Boolean(id)

  const [loadingProduk, setLoadingProduk] = useState(isEditMode)
  const [saving, setSaving] = useState(false)

  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [kategori, setKategori] = useState<string | null>(null)
  const [hargaBiasa, setHargaBiasa] = useState('')
  const [hargaMaster, setHargaMaster] = useState('')
  const [aktif, setAktif] = useState(true)

  const isBusy = loadingProduk || saving

  const loadProduk = useCallback(
    async (produkId: string) => {
      setLoadingProduk(true)
      try {
        const { data, error } = await supabase
          .from('produk')
          .select('id, kode_produk, nama, kategori, harga_jual_biasa, harga_jual_master, aktif')
          .eq('id', produkId)
          .single()

        if (error || !data) {
          throw new Error(error?.message ?? 'Produk tidak ditemukan')
        }

        const row = data as ProdukRow
        setKode(row.kode_produk)
        setNama(row.nama)
        setKategori(row.kategori)
        setHargaBiasa(String(row.harga_jual_biasa ?? ''))
        setHargaMaster(String(row.harga_jual_master ?? ''))
        setAktif(row.aktif)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memuat data produk'
        Alert.alert('Gagal', message, [{ text: 'Kembali', onPress: () => router.back() }])
      } finally {
        setLoadingProduk(false)
      }
    },
    [router],
  )

  useEffect(() => {
    if (id) {
      loadProduk(id)
    }
  }, [id, loadProduk])

  const validate = (): string | null => {
    if (!KODE_PATTERN.test(kode)) {
      return 'Kode produk 2-20 karakter, hanya huruf besar dan angka (sesuai kode di JW Administrasi)'
    }
    if (!nama.trim()) return 'Nama produk wajib diisi'
    if (!kategori) return 'Pilih kategori produk'

    const biasa = Number.parseInt(hargaBiasa, 10)
    const master = Number.parseInt(hargaMaster, 10)

    if (!Number.isFinite(biasa) || biasa <= 0) return 'Harga biasa harus lebih dari 0'
    if (!Number.isFinite(master) || master <= 0) return 'Harga master harus lebih dari 0'

    return null
  }

  const performSave = async () => {
    setSaving(true)
    try {
      const biasa = Number.parseInt(hargaBiasa, 10)
      const master = Number.parseInt(hargaMaster, 10)

      const payload = {
        nama: nama.trim(),
        kategori,
        harga_jual_biasa: biasa,
        harga_jual_master: master,
        aktif,
      }

      if (isEditMode && id) {
        // kode_produk sengaja tidak ikut di-update: transaksi lama mengacu ke kode ini
        const { error } = await supabase.from('produk').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('produk').insert({ ...payload, kode_produk: kode })
        if (error) throw error
      }

      Alert.alert(
        'Berhasil',
        isEditMode ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan',
        [{ text: 'OK', onPress: () => router.back() }],
      )
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code === '23505') {
        Alert.alert('Gagal', `Kode produk ${kode} sudah ada. Gunakan kode lain atau edit produk yang ada.`)
      } else {
        Alert.alert('Gagal', e.message ?? 'Terjadi kesalahan saat menyimpan produk')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    const validationError = validate()
    if (validationError) {
      Alert.alert('Validasi Gagal', validationError)
      return
    }

    const biasa = Number.parseInt(hargaBiasa, 10)
    const master = Number.parseInt(hargaMaster, 10)

    if (master > biasa) {
      Alert.alert(
        'Harga master lebih mahal?',
        `Harga master (${formatRupiah(master)}) lebih tinggi dari harga biasa (${formatRupiah(biasa)}). Biasanya agen master mendapat harga lebih murah. Tetap simpan?`,
        [
          { text: 'Periksa lagi', style: 'cancel' },
          { text: 'Tetap simpan', onPress: performSave },
        ],
      )
      return
    }

    performSave()
  }

  if (loadingProduk) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={saving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Produk' : 'Tambah Produk'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kode Produk (JW Administrasi)</Text>
            <TextInput
              style={[styles.input, isEditMode && styles.inputLocked]}
              value={kode}
              onChangeText={(v) => setKode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="Contoh: TSEL10"
              placeholderTextColor={Colors.grey}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              editable={!isEditMode && !isBusy}
            />
            <Text style={styles.hint}>
              {isEditMode
                ? 'Kode tidak bisa diubah karena dipakai transaksi dan balasan JW. Nonaktifkan produk lalu buat baru bila perlu.'
                : 'Harus sama persis dengan kode produk di JW Administrasi.'}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama Produk</Text>
            <TextInput
              style={styles.input}
              value={nama}
              onChangeText={setNama}
              placeholder="Contoh: Telkomsel 10.000"
              placeholderTextColor={Colors.grey}
              editable={!isBusy}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kategori</Text>
            <View style={styles.chipWrap}>
              {KATEGORI_PRODUK.map((k) => {
                const selected = kategori === k.value
                return (
                  <TouchableOpacity
                    key={k.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setKategori(k.value)}
                    disabled={isBusy}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {k.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Harga Agen Biasa (Rp)</Text>
            <TextInput
              style={styles.input}
              value={hargaBiasa}
              onChangeText={(v) => setHargaBiasa(hanyaDigit(v))}
              placeholder="0"
              placeholderTextColor={Colors.grey}
              keyboardType="number-pad"
              editable={!isBusy}
            />
            {hargaBiasa ? (
              <Text style={styles.hint}>{formatRupiah(Number.parseInt(hargaBiasa, 10))}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Harga Agen Master (Rp)</Text>
            <TextInput
              style={styles.input}
              value={hargaMaster}
              onChangeText={(v) => setHargaMaster(hanyaDigit(v))}
              placeholder="0"
              placeholderTextColor={Colors.grey}
              keyboardType="number-pad"
              editable={!isBusy}
            />
            {hargaMaster ? (
              <Text style={styles.hint}>{formatRupiah(Number.parseInt(hargaMaster, 10))}</Text>
            ) : null}
          </View>

          <View style={[styles.fieldGroup, styles.switchRow]}>
            <View style={styles.flex}>
              <Text style={styles.label}>Produk Aktif</Text>
              <Text style={styles.hint}>Produk nonaktif tidak bisa dibeli agen.</Text>
            </View>
            <Switch
              value={aktif}
              onValueChange={setAktif}
              disabled={isBusy}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={aktif ? Colors.primary : Colors.grey}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isBusy && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Simpan Perubahan' : 'Tambah Produk'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: { fontSize: FontSize.xl, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  formContent: { padding: 16, paddingBottom: 40, gap: 18 },
  fieldGroup: { gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  inputLocked: { backgroundColor: Colors.surface, color: Colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: Colors.textWhite },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '700' },
})
