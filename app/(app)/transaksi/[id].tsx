import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import IconTile from '../../../components/ui/IconTile'
import Screen from '../../../components/ui/Screen'
import Skeleton from '../../../components/ui/Skeleton'
import StatusPill from '../../../components/ui/StatusPill'
import { Font, FontSize, Radius, Spacing } from '../../../constants/theme'
import { formatRupiah } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import { Theme, useStyles, useTheme } from '../../../lib/theme'
import { catatanBawaan, formatWaktu, getStatusIkon, getStatusPastel } from '../../../lib/transaksi'

interface DetailTransaksi {
  id: string
  kode_produk: string
  nomor_tujuan: string
  status: string
  saldo_sebelum: number
  saldo_sesudah: number
  dibuat_pada: string
  sn?: string | null
  catatan?: string | null
}

const KOLOM_DASAR = 'id, kode_produk, nomor_tujuan, status, saldo_sebelum, saldo_sesudah, dibuat_pada'

export default function DetailTransaksiScreen() {
  const styles = useStyles(buatStyles)
  const { colors, pastel } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [data, setData] = useState<DetailTransaksi | null>(null)
  const [namaProduk, setNamaProduk] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [tersalin, setTersalin] = useState(false)
  const timerSalin = useRef<ReturnType<typeof setTimeout> | null>(null)

  const muat = useCallback(async () => {
    if (!id) return
    setErrorMessage('')

    try {
      let hasil = await supabase.from('transaksi').select(`${KOLOM_DASAR}, sn, catatan`).eq('id', id).maybeSingle()
      // Kolom sn/catatan baru ada setelah migrasi 010; sebelum itu tetap tampilkan detail dasarnya
      if (hasil.error) {
        hasil = await supabase.from('transaksi').select(KOLOM_DASAR).eq('id', id).maybeSingle()
      }
      if (hasil.error) throw new Error(`Gagal memuat detail: ${hasil.error.message}`)
      if (!hasil.data) throw new Error('Transaksi tidak ditemukan')

      const baris = hasil.data as unknown as DetailTransaksi
      setData(baris)

      const produk = await supabase.from('produk').select('nama').eq('kode_produk', baris.kode_produk).maybeSingle()
      setNamaProduk((produk.data?.nama as string | undefined) ?? null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat detail')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    muat()
  }, [muat])

  // Status/SN berubah live saat balasan WA Center masuk (butuh Realtime aktif untuk tabel transaksi)
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`detail-transaksi-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transaksi', filter: `id=eq.${id}` }, () => {
        muat()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, muat])

  useEffect(
    () => () => {
      if (timerSalin.current) clearTimeout(timerSalin.current)
    },
    [],
  )

  const salinSn = async (sn: string) => {
    await Clipboard.setStringAsync(sn)
    setTersalin(true)
    if (timerSalin.current) clearTimeout(timerSalin.current)
    timerSalin.current = setTimeout(() => setTersalin(false), 2000)
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.isi}>
          <Skeleton height={150} radius={Radius.lg} />
          <Skeleton height={220} radius={Radius.lg} />
        </View>
      </Screen>
    )
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState
          ikon="alert-circle-outline"
          judul="Detail belum bisa dimuat"
          keterangan={errorMessage || 'Transaksi tidak ditemukan'}
          aksiLabel="Coba Lagi"
          onAksi={muat}
        />
      </Screen>
    )
  }

  const harga = data.saldo_sebelum - data.saldo_sesudah
  const gagal = data.status === 'gagal'
  const berhasil = data.status === 'berhasil'
  const warna = pastel[getStatusPastel(data.status)]
  const catatan = data.catatan?.trim() || catatanBawaan(data.status)

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.isi} showsVerticalScrollIndicator={false}>
        <Card style={styles.kepala}>
          <IconTile ikon={getStatusIkon(data.status)} warna={getStatusPastel(data.status)} size={64} />
          <Text style={styles.harga}>{formatRupiah(harga)}</Text>
          <StatusPill status={data.status} />
          <Text style={styles.produk}>{namaProduk ?? data.kode_produk}</Text>
        </Card>

        {berhasil && data.sn ? (
          <Card style={styles.snKartu}>
            <Text style={styles.snLabel}>Serial Number (SN)</Text>
            <Text style={styles.snNilai} selectable>
              {data.sn}
            </Text>
            <TouchableOpacity style={styles.salin} onPress={() => salinSn(data.sn!)} activeOpacity={0.75}>
              <Ionicons name={tersalin ? 'checkmark' : 'copy-outline'} size={16} color={colors.accent} />
              <Text style={styles.salinTeks}>{tersalin ? 'Tersalin' : 'Salin SN'}</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        <Card style={styles.catatanKartu}>
          <View style={[styles.catatanIkon, { backgroundColor: warna.bg }]}>
            <Ionicons name="information-circle-outline" size={20} color={warna.fg} />
          </View>
          <View style={styles.catatanTeksWrap}>
            <Text style={styles.catatanJudul}>Catatan</Text>
            <Text style={styles.catatanTeks}>{catatan}</Text>
          </View>
        </Card>

        <Card style={styles.rincian}>
          <Baris label="Produk" nilai={namaProduk ?? data.kode_produk} />
          <Baris label="Nomor tujuan" nilai={data.nomor_tujuan} />
          <Baris label="Harga" nilai={formatRupiah(harga)} />
          <Baris label="Tanggal" nilai={formatWaktu(data.dibuat_pada)} />
          {gagal ? (
            <Baris label="Saldo dikembalikan" nilai={formatRupiah(harga)} hijau />
          ) : (
            <Baris label="Sisa saldo" nilai={formatRupiah(data.saldo_sesudah)} />
          )}
          <Baris label="ID transaksi" nilai={data.id.slice(0, 8).toUpperCase()} terakhir />
        </Card>
      </ScrollView>
    </Screen>
  )
}

function Baris({ label, nilai, hijau = false, terakhir = false }: { label: string; nilai: string; hijau?: boolean; terakhir?: boolean }) {
  const styles = useStyles(buatStyles)
  return (
    <View style={[styles.baris, !terakhir && styles.garis]}>
      <Text style={styles.barisLabel}>{label}</Text>
      <Text style={[styles.barisNilai, hijau && styles.barisHijau]} numberOfLines={2}>
        {nilai}
      </Text>
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  isi: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 40 },
  kepala: { alignItems: 'center', gap: Spacing.sm },
  harga: { fontSize: FontSize.xxl, fontFamily: Font.bold, color: t.colors.textPrimary, marginTop: Spacing.sm },
  produk: { fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
  snKartu: { gap: Spacing.sm, backgroundColor: t.pastel.mint.bg, borderColor: t.pastel.mint.bg },
  snLabel: { fontSize: FontSize.sm, fontFamily: Font.semibold, color: t.pastel.mint.teks },
  snNilai: { fontSize: FontSize.lg, fontFamily: Font.bold, color: t.colors.textPrimary, letterSpacing: 0.5 },
  salin: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  salinTeks: { fontSize: FontSize.sm, fontFamily: Font.semibold, color: t.colors.accent },
  catatanKartu: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  catatanIkon: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  catatanTeksWrap: { flex: 1 },
  catatanJudul: { fontSize: FontSize.sm, fontFamily: Font.semibold, color: t.colors.textSecondary },
  catatanTeks: { fontSize: FontSize.md, fontFamily: Font.regular, color: t.colors.textPrimary, marginTop: 2, lineHeight: 21 },
  rincian: { paddingVertical: Spacing.xs },
  baris: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.lg, paddingVertical: Spacing.md },
  garis: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  barisLabel: { fontSize: FontSize.sm, fontFamily: Font.regular, color: t.colors.textSecondary },
  barisNilai: { flexShrink: 1, fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textPrimary, textAlign: 'right' },
  barisHijau: { color: t.pastel.mint.teks },
})
