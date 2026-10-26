import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors, FontSize, Radius } from '../../../constants/theme'
import { formatRupiah } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import { formatWaktu, getStatusColor, getStatusLabel, STATUS_TRANSAKSI } from '../../../lib/transaksi'

interface TransaksiRow {
  id: string
  kode_produk: string
  nomor_tujuan: string
  status: string
  saldo_sebelum: number
  saldo_sesudah: number
  dibuat_pada: string
}

const BATAS_RIWAYAT = 100

export default function RiwayatScreen() {
  const [data, setData] = useState<TransaksiRow[]>([])
  const [namaProduk, setNamaProduk] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setErrorMessage('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak valid, silakan masuk kembali')
      setUserId(user.id)

      const [hasilTransaksi, hasilProduk] = await Promise.all([
        supabase
          .from('transaksi')
          .select('id, kode_produk, nomor_tujuan, status, saldo_sebelum, saldo_sesudah, dibuat_pada')
          .eq('agen_id', user.id)
          .order('dibuat_pada', { ascending: false })
          .limit(BATAS_RIWAYAT),
        supabase.from('produk').select('kode_produk, nama'),
      ])

      if (hasilTransaksi.error) throw new Error(`Gagal memuat riwayat: ${hasilTransaksi.error.message}`)

      setData((hasilTransaksi.data ?? []) as TransaksiRow[])
      setNamaProduk(
        Object.fromEntries((hasilProduk.data ?? []).map((p) => [p.kode_produk, p.nama as string])),
      )
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat riwayat')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  // Status berubah live saat balasan JW masuk (butuh Realtime aktif untuk tabel transaksi;
  // kalau belum aktif, tarik layar ke bawah untuk memuat ulang).
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`riwayat-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaksi', filter: `agen_id=eq.${userId}` },
        () => {
          muat()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, muat])

  const tampil = useMemo(
    () => (statusFilter ? data.filter((t) => t.status === statusFilter) : data),
    [data, statusFilter],
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterWrap}>
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
            {errorMessage || 'Belum ada transaksi.'}
          </Text>
        }
        renderItem={({ item }) => {
          const warna = getStatusColor(item.status)
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.nama} numberOfLines={2}>
                  {namaProduk[item.kode_produk] ?? item.kode_produk}
                </Text>
                <Text style={[styles.status, { color: warna, borderColor: warna }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
              <Text style={styles.tujuan}>{item.nomor_tujuan}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.waktu}>{formatWaktu(item.dibuat_pada)}</Text>
                <Text style={styles.harga}>{formatRupiah(item.saldo_sebelum - item.saldo_sesudah)}</Text>
              </View>
              {item.status === 'gagal' ? <Text style={styles.refund}>Saldo dikembalikan</Text> : null}
            </View>
          )
        }}
      />
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  filterWrap: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: Colors.textWhite },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, fontSize: FontSize.md, marginTop: 40 },
  errorText: { textAlign: 'center', color: Colors.error, fontSize: FontSize.sm, marginTop: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  nama: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  status: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tujuan: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  waktu: { fontSize: FontSize.xs, color: Colors.textSecondary },
  harga: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  refund: { fontSize: FontSize.xs, color: Colors.success, marginTop: 6 },
})
