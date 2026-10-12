import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, FontSize, Radius } from '../../../../constants/theme'
import { supabase } from '../../../../lib/supabase'
import { BannerTampilan, deleteBannerImage } from '../../../../lib/uploadBanner'

const BUCKET_NAME = 'banner-promo'

interface BannerPromoRow {
  id: string
  judul: string
  gambar_url: string
  tampilan: BannerTampilan
  urutan: number
  aktif: boolean
}

const TAMPILAN_LABELS: Record<BannerTampilan, string> = {
  carousel_tetap: 'Carousel Tetap',
  carousel_promo: 'Carousel Promo',
  popup: 'Pop-up',
}

const TAMPILAN_BADGE_COLORS: Record<BannerTampilan, { bg: string; text: string }> = {
  carousel_tetap: { bg: '#E3F2FD', text: '#1565C0' },
  carousel_promo: { bg: '#FFF3E0', text: '#E65100' },
  popup: { bg: '#F3E5F5', text: '#7B1FA2' },
}

function extractStoragePathFromUrl(gambarUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
  const idx = gambarUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(gambarUrl.slice(idx + marker.length))
}

export default function BannerListScreen() {
  const router = useRouter()
  const [banners, setBanners] = useState<BannerPromoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchBanners = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('banner_promo')
        .select('id, judul, gambar_url, tampilan, urutan, aktif')
        .order('urutan', { ascending: true })

      if (error) {
        throw new Error(`Gagal memuat daftar banner: ${error.message}`)
      }

      setBanners((data ?? []) as BannerPromoRow[])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat banner'
      Alert.alert('Gagal', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchBanners()
    }, [fetchBanners]),
  )

  const handleRefresh = useCallback(() => {
    fetchBanners(true)
  }, [fetchBanners])

  const navigateToCreate = () => {
    router.push('/(app)/(admin)/banner/form')
  }

  const navigateToEdit = (id: string) => {
    router.push({
      pathname: '/(app)/(admin)/banner/form',
      params: { id },
    })
  }

  const performDelete = async (banner: BannerPromoRow) => {
    setDeletingId(banner.id)

    let storageWarning: string | null = null

    const storagePath = extractStoragePathFromUrl(banner.gambar_url)
    if (storagePath) {
      try {
        await deleteBannerImage(storagePath)
      } catch (err) {
        storageWarning =
          err instanceof Error ? err.message : 'Gagal menghapus file gambar dari storage'
      }
    }

    try {
      const { error } = await supabase.from('banner_promo').delete().eq('id', banner.id)

      if (error) {
        throw new Error(`Gagal menghapus banner: ${error.message}`)
      }

      await fetchBanners(true)

      if (storageWarning) {
        Alert.alert(
          'Banner Dihapus',
          `Banner berhasil dihapus dari database, namun file gambar mungkin belum terhapus: ${storageWarning}`,
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus banner'
      Alert.alert('Gagal', message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDelete = (banner: BannerPromoRow) => {
    Alert.alert(
      'Hapus Banner?',
      `Banner '${banner.judul}' akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => performDelete(banner),
        },
      ],
    )
  }

  const renderBannerCard = ({ item }: { item: BannerPromoRow }) => {
    const tampilanColors = TAMPILAN_BADGE_COLORS[item.tampilan]
    const isDeleting = deletingId === item.id

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.gambar_url }} style={styles.thumbnail} resizeMode="cover" />

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.judul}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: tampilanColors.bg }]}>
              <Text style={[styles.badgeText, { color: tampilanColors.text }]}>
                {TAMPILAN_LABELS[item.tampilan]}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                item.aktif ? styles.badgeActive : styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  item.aktif ? styles.badgeActiveText : styles.badgeInactiveText,
                ]}
              >
                {item.aktif ? 'Aktif' : 'Nonaktif'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.urutanWrap}>
              <Text style={styles.urutanLabel}>Urutan</Text>
              <Text style={styles.urutanValue}>{item.urutan}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigateToEdit(item.id)}
                disabled={isDeleting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={18} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item)}
                disabled={isDeleting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderEmpty = () => {
    if (loading) return null

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="images-outline" size={56} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Belum ada banner promo</Text>
        <Text style={styles.emptySubtitle}>
          Tambahkan banner pertama untuk ditampilkan di aplikasi
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={navigateToCreate}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyButtonText}>Tambah Banner Pertama</Text>
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
          <Text style={styles.headerTitle}>Kelola Banner Promo</Text>
          <Text style={styles.headerSubtitle}>
            {banners.length > 0
              ? `${banners.length} banner terdaftar`
              : 'Atur banner carousel dan pop-up'}
          </Text>
        </View>
      </View>

      {loading && banners.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat banner...</Text>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id}
          renderItem={renderBannerCard}
          contentContainerStyle={[
            styles.listContent,
            banners.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      {banners.length > 0 ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToCreate}
          activeOpacity={0.85}
          disabled={deletingId !== null}
        >
          <Ionicons name="add" size={28} color={Colors.textWhite} />
        </TouchableOpacity>
      ) : null}

      {deletingId !== null ? (
        <View style={styles.deleteOverlay}>
          <ActivityIndicator size="large" color={Colors.textWhite} />
          <Text style={styles.deleteOverlayText}>Menghapus banner...</Text>
        </View>
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
  android: {
    elevation: 3,
  },
  default: {},
})

const shadowFab = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  android: {
    elevation: 6,
  },
  default: {},
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 88,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 12,
    ...shadowCard,
  },
  thumbnail: {
    width: 80,
    height: 50,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeActiveText: {
    color: Colors.success,
  },
  badgeInactive: {
    backgroundColor: Colors.surface,
  },
  badgeInactiveText: {
    color: Colors.grey,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urutanWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urutanLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  urutanValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
    ...shadowCard,
  },
  emptyButtonText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowFab,
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deleteOverlayText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
})
