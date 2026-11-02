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
import { FontSize, Radius, Font } from '../../../../constants/theme'
import { formatRupiah } from '../../../../lib/format'
import { supabase } from '../../../../lib/supabase'
import { Theme, useStyles, useTheme } from '../../../../lib/theme'

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
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
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
          <ActivityIndicator size="large" color={colors.accent} />
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
              placeholderTextColor={colors.grey}
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
              placeholderTextColor={colors.grey}
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
              placeholderTextColor={colors.grey}
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
              placeholderTextColor={colors.grey}
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
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={aktif ? colors.primary : colors.grey}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isBusy && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.textWhite} />
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

const buatStyles = (t: Theme) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: t.colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: { fontSize: FontSize.xl, color: t.colors.accent, fontFamily: Font.semibold },
  headerTitle: { fontSize: FontSize.xl, fontFamily: Font.bold, color: t.colors.textPrimary },
  formContent: { padding: 16, paddingBottom: 40, gap: 18 },
  fieldGroup: { gap: 6 },
  label: { fontSize: FontSize.sm, fontFamily: Font.semibold, color: t.colors.textPrimary },
  hint: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, lineHeight: 16 },
  input: { fontFamily: Font.regular,
    backgroundColor: t.colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: t.colors.textPrimary,
  },
  inputLocked: { backgroundColor: t.colors.surface, color: t.colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  chipText: { fontSize: FontSize.sm, color: t.colors.textSecondary, fontFamily: Font.semibold },
  chipTextSelected: { color: t.colors.textWhite },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saveButton: {
    backgroundColor: t.colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: t.colors.textWhite, fontSize: FontSize.md, fontFamily: Font.bold },
})
