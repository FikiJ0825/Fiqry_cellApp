import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getKategoriLabel } from '../../../constants/produk'
import { Colors, FontSize, Radius } from '../../../constants/theme'
import { formatRupiah } from '../../../lib/format'
import { ambilProfilSaya, hargaUntukTier } from '../../../lib/profil'
import { supabase } from '../../../lib/supabase'

interface ProdukRow {
  kode_produk: string
  nama: string
  harga_jual_biasa: number
  harga_jual_master: number
}

export default function ProdukPerKategoriScreen() {
  const router = useRouter()
  const { kategori } = useLocalSearchParams<{ kategori: string }>()
  const [produk, setProduk] = useState<ProdukRow[]>([])
  const [tier, setTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setErrorMessage('')

      try {
        const [profil, hasil] = await Promise.all([
          ambilProfilSaya(),
          supabase
            .from('produk')
            .select('kode_produk, nama, harga_jual_biasa, harga_jual_master')
            .eq('aktif', true)
            .eq('kategori', kategori)
            .order('nama', { ascending: true }),
        ])

        if (hasil.error) throw new Error(`Gagal memuat produk: ${hasil.error.message}`)

        setTier(profil.tier)
        setProduk((hasil.data ?? []) as ProdukRow[])
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat produk')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [kategori],
  )

  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: getKategoriLabel(kategori) }} />

      {loading && produk.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={produk}
          keyExtractor={(item) => item.kode_produk}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} />}
          ListEmptyComponent={
            <Text style={errorMessage ? styles.errorText : styles.emptyText}>
              {errorMessage || 'Belum ada produk aktif di kategori ini.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                router.push({ pathname: '/(app)/produk/beli', params: { kode: item.kode_produk } })
              }
            >
              <View style={styles.cardText}>
                <Text style={styles.nama} numberOfLines={2}>
                  {item.nama}
                </Text>
                <Text style={styles.kode}>{item.kode_produk}</Text>
              </View>
              <Text style={styles.harga}>{formatRupiah(hargaUntukTier(tier, item))}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, fontSize: FontSize.md, marginTop: 40 },
  errorText: { textAlign: 'center', color: Colors.error, fontSize: FontSize.sm, marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  cardText: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  kode: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  harga: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
})
