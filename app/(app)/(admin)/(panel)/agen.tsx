import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors, FontSize, Radius } from '../../../../constants/theme'
import { formatNomorWaDisplay } from '../../../../lib/auth-utils'
import { formatRupiah } from '../../../../lib/format'
import { supabase } from '../../../../lib/supabase'

interface AgenRow {
  id: string
  nama: string | null
  nomor_wa: string | null
  saldo: number
  tier: string | null
  aktif: boolean | null
}

export default function AdminAgenScreen() {
  const router = useRouter()
  const [agen, setAgen] = useState<AgenRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nama, nomor_wa, saldo, tier, aktif')
      .neq('role', 'admin')
      .order('nama', { ascending: true })

    if (error) setErrorMessage(`Gagal memuat agen: ${error.message}`)
    else setAgen((data ?? []) as AgenRow[])

    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  const tampil = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agen
    return agen.filter(
      (a) => (a.nama ?? '').toLowerCase().includes(q) || (a.nomor_wa ?? '').includes(q.replace(/\D/g, '') || q),
    )
  }, [agen, search])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Cari nama atau nomor WA"
        placeholderTextColor={Colors.grey}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList
        data={tampil}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} />}
        ListEmptyComponent={
          <Text style={errorMessage ? styles.errorText : styles.emptyText}>
            {errorMessage || 'Tidak ada agen.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.aktif === false && styles.cardNonaktif]}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(app)/(admin)/agen-detail', params: { id: item.id } })}
          >
            <View style={styles.cardText}>
              <Text style={styles.nama}>{item.nama ?? '(tanpa nama)'}</Text>
              <Text style={styles.sub}>
                {item.nomor_wa ? formatNomorWaDisplay(item.nomor_wa) : '-'} ·{' '}
                {item.tier === 'master' ? 'Master' : 'Biasa'}
                {item.aktif === false ? ' · Nonaktif' : ''}
              </Text>
            </View>
            <Text style={styles.saldo}>{formatRupiah(Number(item.saldo ?? 0))}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  search: {
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FontSize.md,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40 },
  errorText: { textAlign: 'center', color: Colors.error, marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  cardNonaktif: { opacity: 0.6 },
  cardText: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  saldo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
})
