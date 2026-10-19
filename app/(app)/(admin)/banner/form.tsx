import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, FontSize, Radius } from '../../../../constants/theme'
import { supabase } from '../../../../lib/supabase'
import {
  BannerTampilan,
  deleteBannerImage,
  uploadBannerImage,
} from '../../../../lib/uploadBanner'

const BUCKET_NAME = 'banner-promo'

type BannerTipeAksi = 'produk' | 'url_eksternal' | 'tidak_ada'

interface BannerPromoRow {
  id: string
  judul: string
  gambar_url: string
  tampilan: BannerTampilan
  tipe_aksi: BannerTipeAksi
  target_aksi: string | null
  urutan: number
  aktif: boolean
  tanggal_mulai: string | null
  tanggal_berakhir: string | null
}

interface ProdukOption {
  id: string
  nama: string
}

const TAMPILAN_OPTIONS: { value: BannerTampilan; label: string }[] = [
  { value: 'carousel_tetap', label: 'Carousel Tetap' },
  { value: 'carousel_promo', label: 'Carousel Promo' },
  { value: 'popup', label: 'Pop-up' },
]

const TIPE_AKSI_OPTIONS: { value: BannerTipeAksi; label: string }[] = [
  { value: 'produk', label: 'Produk' },
  { value: 'url_eksternal', label: 'URL Eksternal' },
  { value: 'tidak_ada', label: 'Tidak Ada' },
]

function extractStoragePathFromUrl(gambarUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
  const idx = gambarUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(gambarUrl.slice(idx + marker.length))
}

function formatDateLabel(date: Date | null): string {
  if (!date) return 'Pilih tanggal (opsional)'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Picker hanya memberi tanggal; banner harus tayang penuh dari awal hari mulai sampai akhir hari berakhir
function awalHari(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function akhirHari(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.segmentItem,
                selected && styles.segmentItemSelected,
                disabled && styles.segmentItemDisabled,
              ]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.segmentText, selected && styles.segmentTextSelected]}
                numberOfLines={2}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

interface SelectFieldProps {
  label: string
  placeholder: string
  value: string | null
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
}

function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps) {
  const [visible, setVisible] = useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectTrigger, disabled && styles.selectTriggerDisabled]}
        onPress={() => setVisible(true)}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <Text
          style={[styles.selectTriggerText, !selectedLabel && styles.selectPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Text style={styles.selectChevron}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const selected = option.value === value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.modalOption, selected && styles.modalOptionSelected]}
                    onPress={() => {
                      onChange(option.value)
                      setVisible(false)
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}
                    >
                      {option.label}
                    </Text>
                    {selected ? <Text style={styles.modalCheck}>✓</Text> : null}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

interface DateFieldProps {
  label: string
  value: Date | null
  onChange: (value: Date | null) => void
  disabled?: boolean
}

function DateField({ label, value, onChange, disabled = false }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState<Date>(value ?? new Date())

  const openPicker = () => {
    if (disabled) return
    setTempDate(value ?? new Date())
    setShowPicker(true)
  }

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)
    }
    if (selected) {
      setTempDate(selected)
      if (Platform.OS === 'android') {
        onChange(selected)
      }
    }
  }

  const confirmIos = () => {
    onChange(tempDate)
    setShowPicker(false)
  }

  const clearDate = () => onChange(null)

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={[styles.dateTrigger, disabled && styles.selectTriggerDisabled]}
          onPress={openPicker}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={[styles.dateTriggerText, !value && styles.selectPlaceholder]}>
            {formatDateLabel(value)}
          </Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity
            style={styles.dateClearButton}
            onPress={clearDate}
            disabled={disabled}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dateClearText}>Hapus</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      ) : null}

      {showPicker && Platform.OS === 'ios' ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.datePickerSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.datePickerCancel}>Batal</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>{label}</Text>
                <TouchableOpacity onPress={confirmIos}>
                  <Text style={styles.datePickerConfirm}>Selesai</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(_e, selected) => {
                  if (selected) setTempDate(selected)
                }}
                locale="id-ID"
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  )
}

export default function BannerFormScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditMode = Boolean(id)

  const [loadingBanner, setLoadingBanner] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [judul, setJudul] = useState('')
  const [localImageUri, setLocalImageUri] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [hasNewImage, setHasNewImage] = useState(false)

  const [tampilan, setTampilan] = useState<BannerTampilan>('carousel_tetap')
  const [tipeAksi, setTipeAksi] = useState<BannerTipeAksi>('tidak_ada')
  const [targetAksi, setTargetAksi] = useState<string | null>(null)
  const [urlEksternal, setUrlEksternal] = useState('')

  const [kategoriList, setKategoriList] = useState<string[]>([])
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null)
  const [produkList, setProdukList] = useState<ProdukOption[]>([])
  const [loadingKategori, setLoadingKategori] = useState(false)
  const [loadingProduk, setLoadingProduk] = useState(false)

  const [urutan, setUrutan] = useState('0')
  const [aktif, setAktif] = useState(true)
  const [tanggalMulai, setTanggalMulai] = useState<Date | null>(null)
  const [tanggalBerakhir, setTanggalBerakhir] = useState<Date | null>(null)

  const previewUri = localImageUri ?? existingImageUrl
  const isBusy = loadingBanner || saving

  const loadKategori = useCallback(async () => {
    setLoadingKategori(true)
    try {
      const { data, error } = await supabase.from('produk').select('kategori')
      if (error) {
        throw new Error(`Gagal memuat kategori: ${error.message}`)
      }
      const unique = [
        ...new Set(
          (data ?? [])
            .map((row) => row.kategori as string | null)
            .filter((k): k is string => Boolean(k?.trim())),
        ),
      ].sort((a, b) => a.localeCompare(b, 'id'))
      setKategoriList(unique)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat daftar kategori'
      Alert.alert('Gagal', message)
    } finally {
      setLoadingKategori(false)
    }
  }, [])

  const loadProdukByKategori = useCallback(async (kategori: string) => {
    setLoadingProduk(true)
    try {
      const { data, error } = await supabase
        .from('produk')
        .select('id, nama')
        .eq('kategori', kategori)
        .eq('aktif', true)
        .order('nama')

      if (error) {
        throw new Error(`Gagal memuat produk: ${error.message}`)
      }

      setProdukList((data ?? []) as ProdukOption[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat daftar produk'
      Alert.alert('Gagal', message)
      setProdukList([])
    } finally {
      setLoadingProduk(false)
    }
  }, [])

  const loadBanner = useCallback(async (bannerId: string) => {
    setLoadingBanner(true)
    try {
      const { data, error } = await supabase
        .from('banner_promo')
        .select(
          'id, judul, gambar_url, tampilan, tipe_aksi, target_aksi, urutan, aktif, tanggal_mulai, tanggal_berakhir',
        )
        .eq('id', bannerId)
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Banner tidak ditemukan')
      }

      const banner = data as BannerPromoRow
      setJudul(banner.judul)
      setExistingImageUrl(banner.gambar_url)
      setTampilan(banner.tampilan)
      setTipeAksi(banner.tipe_aksi)
      setTargetAksi(banner.target_aksi)
      setUrutan(String(banner.urutan ?? 0))
      setAktif(banner.aktif)
      setTanggalMulai(parseDate(banner.tanggal_mulai))
      setTanggalBerakhir(parseDate(banner.tanggal_berakhir))

      if (banner.tipe_aksi === 'url_eksternal' && banner.target_aksi) {
        setUrlEksternal(banner.target_aksi)
      }

      if (banner.tipe_aksi === 'produk' && banner.target_aksi) {
        const { data: produkData, error: produkError } = await supabase
          .from('produk')
          .select('kategori')
          .eq('id', banner.target_aksi)
          .maybeSingle()

        if (produkError) {
          throw new Error(`Gagal memuat data produk: ${produkError.message}`)
        }

        if (produkData?.kategori) {
          setSelectedKategori(produkData.kategori)
          await loadProdukByKategori(produkData.kategori)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data banner'
      Alert.alert('Gagal', message, [{ text: 'Kembali', onPress: () => router.back() }])
    } finally {
      setLoadingBanner(false)
    }
  }, [loadProdukByKategori, router])

  useEffect(() => {
    if (tipeAksi === 'produk') {
      loadKategori()
    }
  }, [tipeAksi, loadKategori])

  useEffect(() => {
    if (isEditMode && id) {
      loadBanner(id)
    }
  }, [id, isEditMode, loadBanner])

  useEffect(() => {
    if (tipeAksi === 'produk' && selectedKategori) {
      loadProdukByKategori(selectedKategori)
    } else if (tipeAksi !== 'produk') {
      setProdukList([])
    }
  }, [selectedKategori, tipeAksi, loadProdukByKategori])

  const handlePickImage = async () => {
    if (isBusy) return

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Izin Diperlukan', 'Akses galeri diperlukan untuk memilih gambar banner.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    })

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri)
      setHasNewImage(true)
      setErrorMessage('')
    }
  }

  const handleTipeAksiChange = (value: BannerTipeAksi) => {
    setTipeAksi(value)
    setTargetAksi(null)
    setUrlEksternal('')
    setSelectedKategori(null)
    setProdukList([])
    setErrorMessage('')
  }

  const validateForm = (): string | null => {
    if (!judul.trim()) {
      return 'Judul banner wajib diisi'
    }

    const hasImage = hasNewImage || existingImageUrl
    if (!hasImage) {
      return 'Gambar banner wajib dipilih'
    }

    if (!tampilan) {
      return 'Tampilan banner wajib dipilih'
    }

    if (tipeAksi === 'produk' && !targetAksi) {
      return 'Produk tujuan wajib dipilih'
    }

    if (tipeAksi === 'url_eksternal') {
      const trimmedUrl = urlEksternal.trim()
      if (!trimmedUrl) {
        return 'URL eksternal wajib diisi'
      }
      if (!trimmedUrl.startsWith('https://')) {
        return 'URL harus diawali dengan https://'
      }
    }

    const urutanNumber = Number.parseInt(urutan, 10)
    if (Number.isNaN(urutanNumber) || urutanNumber < 0) {
      return 'Urutan harus berupa angka nol atau lebih besar'
    }

    if (tanggalMulai && tanggalBerakhir && tanggalMulai > tanggalBerakhir) {
      return 'Tanggal mulai tidak boleh setelah tanggal berakhir'
    }

    return null
  }

  const handleSave = async () => {
    setErrorMessage('')
    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      Alert.alert('Validasi Gagal', validationError)
      return
    }

    setSaving(true)

    try {
      let gambarUrl = existingImageUrl ?? ''
      const oldGambarUrl = existingImageUrl

      if (hasNewImage && localImageUri) {
        try {
          gambarUrl = await uploadBannerImage(localImageUri, tampilan)
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Gagal mengunggah gambar banner'
          throw new Error(message)
        }

        if (isEditMode && oldGambarUrl) {
          const oldPath = extractStoragePathFromUrl(oldGambarUrl)
          if (oldPath) {
            try {
              await deleteBannerImage(oldPath)
            } catch (err) {
              const message =
                err instanceof Error ? err.message : 'Gagal menghapus gambar lama'
              throw new Error(message)
            }
          }
        }
      }

      const resolvedTarget =
        tipeAksi === 'tidak_ada'
          ? null
          : tipeAksi === 'url_eksternal'
            ? urlEksternal.trim()
            : targetAksi

      const payload = {
        judul: judul.trim(),
        gambar_url: gambarUrl,
        tampilan,
        tipe_aksi: tipeAksi,
        target_aksi: resolvedTarget,
        urutan: Number.parseInt(urutan, 10) || 0,
        aktif,
        tanggal_mulai: tanggalMulai ? awalHari(tanggalMulai).toISOString() : null,
        tanggal_berakhir: tanggalBerakhir ? akhirHari(tanggalBerakhir).toISOString() : null,
      }

      if (isEditMode && id) {
        const { error } = await supabase.from('banner_promo').update(payload).eq('id', id)
        if (error) {
          throw new Error(`Gagal memperbarui banner: ${error.message}`)
        }
      } else {
        const { error } = await supabase.from('banner_promo').insert(payload)
        if (error) {
          throw new Error(`Gagal menambahkan banner: ${error.message}`)
        }
      }

      Alert.alert(
        'Berhasil',
        isEditMode ? 'Banner berhasil diperbarui.' : 'Banner berhasil ditambahkan.',
        [{ text: 'OK', onPress: () => router.back() }],
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan banner'
      setErrorMessage(message)
      Alert.alert('Gagal', message)
    } finally {
      setSaving(false)
    }
  }

  if (loadingBanner) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat data banner...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={saving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Banner' : 'Tambah Banner'}
            </Text>
            <Text style={styles.headerSubtitle}>Kelola banner promo aplikasi</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Banner</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Judul Banner</Text>
              <TextInput
                style={styles.input}
                value={judul}
                onChangeText={setJudul}
                placeholder="Contoh: Promo Pulsa Murah"
                placeholderTextColor={Colors.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Gambar Banner</Text>
              <Text style={styles.helperText}>Rasio 16:9 — carousel atau pop-up</Text>

              {previewUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: previewUri }} style={styles.imagePreview} resizeMode="cover" />
                  {hasNewImage ? (
                    <View style={styles.imageBadge}>
                      <Text style={styles.imageBadgeText}>Baru</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderIcon}>🖼️</Text>
                  <Text style={styles.imagePlaceholderText}>Belum ada gambar dipilih</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.secondaryButton, saving && styles.buttonDisabled]}
                onPress={handlePickImage}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  {previewUri ? 'Ganti Gambar' : 'Pilih dari Galeri'}
                </Text>
              </TouchableOpacity>
            </View>

            <SegmentedControl
              label="Tampilan"
              options={TAMPILAN_OPTIONS}
              value={tampilan}
              onChange={setTampilan}
              disabled={saving}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Aksi Banner</Text>

            <SegmentedControl
              label="Tipe Aksi"
              options={TIPE_AKSI_OPTIONS}
              value={tipeAksi}
              onChange={handleTipeAksiChange}
              disabled={saving}
            />

            {tipeAksi === 'produk' ? (
              <>
                <SelectField
                  label="Kategori Produk"
                  placeholder={loadingKategori ? 'Memuat kategori...' : 'Pilih kategori'}
                  value={selectedKategori}
                  options={kategoriList.map((k) => ({ value: k, label: k }))}
                  onChange={(value) => {
                    setSelectedKategori(value)
                    setTargetAksi(null)
                  }}
                  disabled={saving || loadingKategori}
                />

                {selectedKategori ? (
                  <SelectField
                    label="Produk"
                    placeholder={loadingProduk ? 'Memuat produk...' : 'Pilih produk'}
                    value={targetAksi}
                    options={produkList.map((p) => ({
                      value: p.id,
                      label: p.nama,
                    }))}
                    onChange={setTargetAksi}
                    disabled={saving || loadingProduk}
                  />
                ) : null}
              </>
            ) : null}

            {tipeAksi === 'url_eksternal' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>URL Eksternal</Text>
                <TextInput
                  style={styles.input}
                  value={urlEksternal}
                  onChangeText={setUrlEksternal}
                  placeholder="https://contoh.com/promo"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!saving}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pengaturan Tampilan</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Urutan</Text>
              <TextInput
                style={styles.input}
                value={urutan}
                onChangeText={setUrutan}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={styles.helperText}>Angka lebih kecil tampil lebih dulu di carousel</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.label}>Aktif</Text>
                <Text style={styles.helperText}>Banner ditampilkan ke pengguna</Text>
              </View>
              <Switch
                value={aktif}
                onValueChange={setAktif}
                disabled={saving}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={aktif ? Colors.primary : Colors.grey}
              />
            </View>

            <DateField
              label="Tanggal Mulai"
              value={tanggalMulai}
              onChange={setTanggalMulai}
              disabled={saving}
            />

            <DateField
              label="Tanggal Berakhir"
              value={tanggalBerakhir}
              onChange={setTanggalBerakhir}
              disabled={saving}
            />
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color={Colors.textWhite} size="small" />
                <Text style={styles.primaryButtonText}>Menyimpan...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Simpan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const shadowCard = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {},
})

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
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
  backButtonText: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadowCard,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
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
  helperText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
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
  imagePreviewWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
  },
  imageBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.success,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageBadgeText: {
    color: Colors.textWhite,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  imagePlaceholder: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 6,
  },
  imagePlaceholderIcon: {
    fontSize: 28,
  },
  imagePlaceholderText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  segmentItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  segmentItemDisabled: {
    opacity: 0.6,
  },
  segmentText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.background,
  },
  selectTriggerDisabled: {
    opacity: 0.6,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginRight: 8,
  },
  selectPlaceholder: {
    color: Colors.textSecondary,
  },
  selectChevron: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  modalList: {
    paddingHorizontal: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  modalOptionText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  modalOptionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  modalCheck: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTrigger: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.background,
  },
  dateTriggerText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  dateClearButton: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  dateClearText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  datePickerSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  datePickerTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  datePickerCancel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  datePickerConfirm: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  switchTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  errorBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadowCard,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.textWhite,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
})
