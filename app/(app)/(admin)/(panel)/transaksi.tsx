import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors, FontSize, Radius } from '../../../../constants/theme'
import { formatRupiah } from '../../../../lib/format'
import { supabase } from '../../../../lib/supabase'
import { formatWaktu, getStatusColor, getStatusLabel, STATUS_TRANSAKSI } from '../../../../lib/transaksi'

interface TransaksiRow {
  id: string
  agen_id: string
  kode_produk: string
  nomor_tujuan: string
  status: string
  saldo_sebelum: number
  saldo_sesudah: number
  dibuat_pada: string
}

const BATAS = 200

export default function AdminTransaksiScreen() {
  const [data, setData] = useState<TransaksiRow[]>([])
  const [namaAgen, setNamaAgen] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setErrorMessage('')

    const [trx, profil] = await Promise.all([
      supabase
        .from('transaksi')
        .select('id, agen_id, kode_produk, nomor_tujuan, status, saldo_sebelum, saldo_sesudah, dibuat_pada')
        .order('dibuat_pada', { ascending: false })
        .limit(BATAS),
      supabase.from('profiles').select('id, nama'),
    ])

    if (trx.error) {
      setErrorMessage(`Gagal memuat transaksi: ${trx.error.message}`)
    } else {
      setData((trx.data ?? []) as TransaksiRow[])
      setNamaAgen(Object.fromEntries((profil.data ?? []).map((p) => [p.id, (p.nama as string | null) ?? ''])))
    }

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
    return data.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.nomor_tujuan.toLowerCase().includes(q) ||
        t.kode_produk.toLowerCase().includes(q) ||
        (namaAgen[t.agen_id] ?? '').toLowerCase().includes(q)
      )
    })
  }, [data, statusFilter, search, namaAgen])

  const selesaikan = (item: TransaksiRow, status: 'berhasil' | 'gagal') => {
    const pesan =
      status === 'gagal'
        ? `Tandai GAGAL dan kembalikan ${formatRupiah(item.saldo_sebelum - item.saldo_sesudah)} ke saldo agen?`
        : 'Tandai BERHASIL? Pastikan pulsa/produk sudah benar-benar masuk.'

    Alert.alert('Selesaikan transaksi', pesan, [
      { text: 'Batal', style: 'cancel' },
      {
        text: status === 'gagal' ? 'Gagal + Refund' : 'Berhasil',
        style: status === 'gagal' ? 'destructive' : 'default',
        onPress: async () => {
          const { error } = await supabase.rpc('selesaikan_transaksi_admin', {
            p_transaksi_id: item.id,
            p_status: status,
          })
          if (error) {
            Alert.alert('Gagal', error.message)
            return
          }
          await muat()
        },
      },
    ])
  }

  const bukaAksi = (item: TransaksiRow) => {
    if (item.status !== 'pending' && item.status !== 'diproses') return
    Alert.alert('Transaksi belum selesai', `${item.kode_produk} → ${item.nomor_tujuan}`, [
      { text: 'Tandai Berhasil', onPress: () => selesaikan(item, 'berhasil') },
      { text: 'Tandai Gagal (refund)', style: 'destructive', onPress: () => selesaikan(item, 'gagal') },
      { text: 'Batal', style: 'cancel' },
    ])
  }

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
        placeholder="Cari agen, kode produk, atau nomor tujuan"
        placeholderTextColor={Colors.grey}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Semua" selected={statusFilter === null} onPress={() => setStatusFilter(null)} />
          {STATUS_TRANSAKSI.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              selected={statusFilter === s.value}
              onPress={() => setStatusFilter(statusFilter === s.value ? null : s.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={tampil}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} />}
        ListEmptyComponent={
          <Text style={errorMessage ? styles.errorText : styles.emptyText}>
            {errorMessage || 'Tidak ada transaksi.'}
          </Text>
        }
        renderItem={({ item }) => {
          const warna = getStatusColor(item.status)
          const belumSelesai = item.status === 'pending' || item.status === 'diproses'
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={belumSelesai ? 0.8 : 1}
              onPress={() => bukaAksi(item)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.judul}>
                  {item.kode_produk} → {item.nomor_tujuan}
                </Text>
                <Text style={[styles.status, { color: warna, borderColor: warna }]}>{getStatusLabel(item.status)}</Text>
              </View>
              <Text style={styles.sub}>{namaAgen[item.agen_id] || 'Agen'}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.sub}>{formatWaktu(item.dibuat_pada)}</Text>
                <Text style={styles.harga}>{formatRupiah(item.saldo_sebelum - item.saldo_sesudah)}</Text>
              </View>
              {belumSelesai ? <Text style={styles.hint}>Ketuk untuk menyelesaikan manual</Text> : null}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
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
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: Colors.textWhite },
  list: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40 },
  errorText: { textAlign: 'center', color: Colors.error, marginTop: 40 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  judul: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  status: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  harga: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  hint: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 6 },
})
