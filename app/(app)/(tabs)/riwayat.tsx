import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Card from '../../../components/ui/Card'
import Chip from '../../../components/ui/Chip'
import EmptyState from '../../../components/ui/EmptyState'
import IconTile from '../../../components/ui/IconTile'
import ScreenHeader from '../../../components/ui/ScreenHeader'
import Skeleton from '../../../components/ui/Skeleton'
import StatusPill from '../../../components/ui/StatusPill'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../../constants/theme'
import { formatRupiah } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import {
  formatWaktu,
  getStatusIkon,
  getStatusPastel,
  STATUS_TRANSAKSI,
} from '../../../lib/transaksi'

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

  return (
    <View style={styles.container}>
      <ScreenHeader judul="Riwayat" keterangan="Semua transaksi pembelian Anda" />

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

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={92} radius={Radius.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={tampil}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} colors={[Colors.primary]} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            errorMessage ? (
              <EmptyState
                ikon="alert-circle-outline"
                judul="Riwayat belum bisa dimuat"
                keterangan={errorMessage}
                aksiLabel="Coba Lagi"
                onAksi={() => muat()}
              />
            ) : (
              <EmptyState
                ikon="receipt-outline"
                judul={statusFilter ? 'Tidak ada transaksi dengan status ini' : 'Belum ada transaksi'}
                keterangan={statusFilter ? 'Coba pilih status lain.' : 'Transaksi Anda akan tampil di sini.'}
              />
            )
          }
          renderItem={({ item }) => (
            <Card style={styles.kartu}>
              <IconTile ikon={getStatusIkon(item.status)} warna={getStatusPastel(item.status)} size={44} />
              <View style={styles.tengah}>
                <Text style={styles.nama} numberOfLines={2}>
                  {namaProduk[item.kode_produk] ?? item.kode_produk}
                </Text>
                <Text style={styles.tujuan} numberOfLines={1}>
                  {item.nomor_tujuan}
                </Text>
                <Text style={styles.waktu}>{formatWaktu(item.dibuat_pada)}</Text>
                {item.status === 'gagal' ? <Text style={styles.refund}>Saldo dikembalikan</Text> : null}
              </View>
              <View style={styles.kanan}>
                <Text style={styles.harga}>{formatRupiah(item.saldo_sebelum - item.saldo_sesudah)}</Text>
                <StatusPill status={item.status} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterWrap: { paddingTop: Spacing.md },
  chipRow: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
  kartu: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  tengah: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  tujuan: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  waktu: { fontSize: FontSize.xs, color: Colors.grey, marginTop: 4 },
  refund: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Pastel.mint.teks, marginTop: 4 },
  kanan: { alignItems: 'flex-end', gap: 6 },
  harga: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
})
