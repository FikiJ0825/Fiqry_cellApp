import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import ProdukBaris from '../../../components/ProdukBaris'
import EmptyState from '../../../components/ui/EmptyState'
import Input from '../../../components/ui/Input'
import Skeleton from '../../../components/ui/Skeleton'
import { getKategoriLabel } from '../../../constants/produk'
import { Colors, Radius, Spacing } from '../../../constants/theme'
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
  const [cari, setCari] = useState('')
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

  const kataCari = cari.trim().toLowerCase()
  const tampil = useMemo(
    () => (kataCari ? produk.filter((p) => `${p.nama} ${p.kode_produk}`.toLowerCase().includes(kataCari)) : produk),
    [produk, kataCari],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: getKategoriLabel(kategori) }} />

      {loading && produk.length === 0 ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={72} radius={Radius.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={tampil}
          keyExtractor={(item) => item.kode_produk}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} colors={[Colors.primary]} tintColor={Colors.primary} />
          }
          ListHeaderComponent={
            produk.length > 0 ? (
              <Input
                ikon="search-outline"
                value={cari}
                onChangeText={setCari}
                placeholder="Cari di kategori ini"
                autoCorrect={false}
                accessibilityLabel="Cari produk di kategori ini"
              />
            ) : undefined
          }
          ListEmptyComponent={
            errorMessage ? (
              <EmptyState
                ikon="alert-circle-outline"
                judul="Produk belum bisa dimuat"
                keterangan={errorMessage}
                aksiLabel="Coba Lagi"
                onAksi={() => muat()}
              />
            ) : (
              <EmptyState
                ikon="cube-outline"
                judul={cari ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                keterangan={cari ? 'Coba kata kunci lain.' : 'Belum ada produk aktif di kategori ini.'}
              />
            )
          }
          renderItem={({ item }) => (
            <ProdukBaris
              nama={item.nama}
              kode={item.kode_produk}
              harga={hargaUntukTier(tier, item)}
              kategori={kategori}
              onPress={() => router.push({ pathname: '/(app)/produk/beli', params: { kode: item.kode_produk } })}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
})
