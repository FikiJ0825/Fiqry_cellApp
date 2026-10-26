import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { ComponentProps, useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { KATEGORI_PRODUK } from '../../../constants/produk'
import { Colors, FontSize, Radius } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const IKON_KATEGORI: Record<string, IoniconName> = {
  pulsa: 'phone-portrait-outline',
  paket_data: 'wifi-outline',
  listrik: 'flash-outline',
  e_wallet: 'wallet-outline',
  game: 'game-controller-outline',
  wifi: 'globe-outline',
  bpjs: 'medkit-outline',
  pdam: 'water-outline',
  tv_kabel: 'tv-outline',
}

export default function ProdukKategoriScreen() {
  const router = useRouter()
  const [jumlah, setJumlah] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase.from('produk').select('kategori').eq('aktif', true)

    if (error) {
      setErrorMessage(`Gagal memuat produk: ${error.message}`)
    } else {
      const hitung: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.kategori) hitung[row.kategori] = (hitung[row.kategori] ?? 0) + 1
      }
      setJumlah(hitung)
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  const kategoriTersedia = useMemo(
    () => KATEGORI_PRODUK.filter((k) => (jumlah[k.value] ?? 0) > 0),
    [jumlah],
  )

  if (loading && Object.keys(jumlah).length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} />}
    >
      <Text style={styles.heading}>Pilih Kategori</Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {!errorMessage && kategoriTersedia.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada produk yang tersedia.</Text>
      ) : null}

      <View style={styles.grid}>
        {kategoriTersedia.map((k) => (
          <TouchableOpacity
            key={k.value}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/(app)/produk/[kategori]',
                params: { kategori: k.value },
              })
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name={IKON_KATEGORI[k.value] ?? 'cube-outline'} size={28} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{k.label}</Text>
            <Text style={styles.cardSub}>{jumlah[k.value]} produk</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  heading: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  errorText: { color: Colors.error, fontSize: FontSize.sm, marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', marginTop: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  cardSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
})
