import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KATEGORI_PRODUK, getKategoriLabel } from '../../../../constants/produk'
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

export default function KatalogListScreen() {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const router = useRouter()
  const [produk, setProduk] = useState<ProdukRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState<string | null>(null)

  const fetchProduk = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('produk')
        .select('id, kode_produk, nama, kategori, harga_jual_biasa, harga_jual_master, aktif')
        .order('kategori', { ascending: true })
        .order('nama', { ascending: true })

      if (error) {
        throw new Error(`Gagal memuat produk: ${error.message}`)
      }

      setProduk((data ?? []) as ProdukRow[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat produk'
      Alert.alert('Gagal', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchProduk()
    }, [fetchProduk]),
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return produk.filter((p) => {
      if (kategoriFilter && p.kategori !== kategoriFilter) return false
      if (!q) return true
      return p.nama.toLowerCase().includes(q) || p.kode_produk.toLowerCase().includes(q)
    })
  }, [produk, search, kategoriFilter])

  const kategoriTersedia = useMemo(() => {
    const dipakai = new Set(produk.map((p) => p.kategori).filter((k): k is string => Boolean(k)))
    const urut = KATEGORI_PRODUK.map((k) => k.value as string).filter((v) => dipakai.has(v))
    const lainnya = [...dipakai].filter((v) => !urut.includes(v)).sort()
    return [...urut, ...lainnya]
  }, [produk])

  const navigateToCreate = () => {
    router.push('/(app)/(admin)/katalog/form')
  }

  const navigateToEdit = (id: string) => {
    router.push({ pathname: '/(app)/(admin)/katalog/form', params: { id } })
  }

  const toggleAktif = async (item: ProdukRow, nilaiBaru: boolean) => {
    setTogglingId(item.id)
    // update optimistis supaya switch terasa responsif
    setProduk((prev) => prev.map((p) => (p.id === item.id ? { ...p, aktif: nilaiBaru } : p)))

    const { error } = await supabase.from('produk').update({ aktif: nilaiBaru }).eq('id', item.id)

    if (error) {
      setProduk((prev) => prev.map((p) => (p.id === item.id ? { ...p, aktif: item.aktif } : p)))
      Alert.alert('Gagal', `Gagal mengubah status produk: ${error.message}`)
    }
    setTogglingId(null)
  }

  const renderItem = ({ item }: { item: ProdukRow }) => (
    <View style={[styles.card, !item.aktif && styles.cardInactive]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.nama}
          </Text>
          <Text style={styles.cardCode}>{item.kode_produk}</Text>
        </View>
        <Switch
          value={item.aktif}
          onValueChange={(v) => toggleAktif(item, v)}
          disabled={togglingId === item.id}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={item.aktif ? colors.primary : colors.grey}
        />
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.badgeKategori}>
          <Text style={styles.badgeKategoriText}>{getKategoriLabel(item.kategori)}</Text>
        </View>
        <View style={[styles.badge, item.aktif ? styles.badgeActive : styles.badgeInactive]}>
          <Text
            style={[styles.badgeText, item.aktif ? styles.badgeActiveText : styles.badgeInactiveText]}
          >
            {item.aktif ? 'Aktif' : 'Nonaktif'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Biasa</Text>
            <Text style={styles.priceValue}>{formatRupiah(item.harga_jual_biasa)}</Text>
          </View>
          <View>
            <Text style={styles.priceLabel}>Master</Text>
            <Text style={styles.priceValue}>{formatRupiah(item.harga_jual_master)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigateToEdit(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderEmpty = () => {
    if (loading) return null

    const adaFilter = search.trim() !== '' || kategoriFilter !== null
    if (adaFilter && produk.length > 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Tidak ada produk yang cocok</Text>
          <Text style={styles.emptySubtitle}>Ubah kata kunci atau filter kategori.</Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="cube-outline" size={56} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>Belum ada produk</Text>
        <Text style={styles.emptySubtitle}>
          Tambahkan produk pertama dengan kode sesuai JW Administrasi
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={navigateToCreate} activeOpacity={0.85}>
          <Text style={styles.emptyButtonText}>Tambah Produk Pertama</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Katalog Produk</Text>
          <Text style={styles.headerSubtitle}>
            {produk.length > 0
              ? `${produk.filter((p) => p.aktif).length} aktif dari ${produk.length} produk`
              : 'Kelola produk dan harga agen'}
          </Text>
        </View>
      </View>

      {produk.length > 0 ? (
        <View style={styles.filterWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau kode produk"
            placeholderTextColor={colors.grey}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <TouchableOpacity
              style={[styles.chip, kategoriFilter === null && styles.chipSelected]}
              onPress={() => setKategoriFilter(null)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, kategoriFilter === null && styles.chipTextSelected]}>
                Semua
              </Text>
            </TouchableOpacity>
            {kategoriTersedia.map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.chip, kategoriFilter === k && styles.chipSelected]}
                onPress={() => setKategoriFilter(kategoriFilter === k ? null : k)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, kategoriFilter === k && styles.chipTextSelected]}>
                  {getKategoriLabel(k)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading && produk.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProduk(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {produk.length > 0 ? (
        <TouchableOpacity style={styles.fab} onPress={navigateToCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color={colors.textWhite} />
        </TouchableOpacity>
      ) : null}
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
  android: { elevation: 3 },
  default: {},
})

const shadowFab = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  android: { elevation: 6 },
  default: {},
})

const buatStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.surface },
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
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: FontSize.xl, fontFamily: Font.bold, color: t.colors.textPrimary },
  headerSubtitle: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, marginTop: 2 },
  filterWrap: {
    backgroundColor: t.colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    gap: 10,
  },
  searchInput: { fontFamily: Font.regular,
    backgroundColor: t.colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: t.colors.textPrimary,
  },
  chipRow: { gap: 8, paddingRight: 16 },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  chipText: { fontSize: FontSize.sm, color: t.colors.textSecondary, fontFamily: Font.semibold },
  chipTextSelected: { color: t.colors.textWhite },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: Font.regular, fontSize: FontSize.md, color: t.colors.textSecondary },
  listContent: { padding: 16, paddingBottom: 88, gap: 12 },
  listContentEmpty: { flexGrow: 1 },
  card: {
    backgroundColor: t.colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 14,
    gap: 10,
    ...shadowCard,
  },
  cardInactive: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textPrimary },
  cardCode: { fontFamily: Font.regular,
    fontSize: FontSize.sm,
    color: t.colors.textSecondary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: FontSize.xs, fontFamily: Font.semibold },
  badgeActive: { backgroundColor: t.pastel.mint.bg },
  badgeActiveText: { color: t.colors.success },
  badgeInactive: { backgroundColor: t.colors.surface },
  badgeInactiveText: { color: t.colors.grey },
  badgeKategori: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: t.colors.primaryLight,
  },
  badgeKategoriText: { fontSize: FontSize.xs, fontFamily: Font.semibold, color: t.colors.primaryDark },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceRow: { flexDirection: 'row', gap: 24 },
  priceLabel: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary },
  priceValue: { fontSize: FontSize.md, fontFamily: Font.bold, color: t.colors.textPrimary, marginTop: 2 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 112,
    height: 112,
    borderRadius: Radius.full,
    backgroundColor: t.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Font.bold,
    color: t.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: { fontFamily: Font.regular,
    fontSize: FontSize.sm,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: t.colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
    ...shadowCard,
  },
  emptyButtonText: { color: t.colors.textWhite, fontSize: FontSize.md, fontFamily: Font.bold },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowFab,
  },
})
