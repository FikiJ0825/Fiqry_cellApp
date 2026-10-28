import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import BannerCarousel from '../../../components/BannerCarousel'
import PromoPopup from '../../../components/PromoPopup'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import CurvedHeader from '../../../components/ui/CurvedHeader'
import EmptyState from '../../../components/ui/EmptyState'
import IconTile from '../../../components/ui/IconTile'
import SectionHeader from '../../../components/ui/SectionHeader'
import Skeleton from '../../../components/ui/Skeleton'
import StatusPill from '../../../components/ui/StatusPill'
import { IoniconName, KATEGORI_PRODUK, TAMPILAN_KATEGORI } from '../../../constants/produk'
import { Colors, FontSize, FontWeight, Pastel, PastelNama, Radius, Spacing } from '../../../constants/theme'
import { BannerAktif, ambilBannerAktif, jalankanAksiBanner } from '../../../lib/banner'
import { formatRupiah } from '../../../lib/format'
import { ambilProfilSaya, ProfilSaya } from '../../../lib/profil'
import { supabase } from '../../../lib/supabase'
import { bukaTopupWa } from '../../../lib/topup'
import { awalHariIniIso, formatWaktu, getStatusIkon, getStatusPastel } from '../../../lib/transaksi'

interface RingkasanHariIni {
  total: number
  berhasil: number
  diproses: number
  gagal: number
  omset: number
}

interface TransaksiTerakhir {
  id: string
  kode_produk: string
  nomor_tujuan: string
  status: string
  saldo_sebelum: number
  saldo_sesudah: number
  dibuat_pada: string
}

const RINGKASAN_KOSONG: RingkasanHariIni = { total: 0, berhasil: 0, diproses: 0, gagal: 0, omset: 0 }

// Grid menu 4 kolom x 2 baris; kalau kategori lebih banyak, slot terakhir menjadi "Lainnya"
const SLOT_MENU = 8
const TINGGI_TUMPANG_TINDIH = 44

async function ambilKategoriAktif(): Promise<string[]> {
  const { data, error } = await supabase.from('produk').select('kategori').eq('aktif', true)
  if (error) throw new Error(error.message)
  return [...new Set((data ?? []).map((row) => row.kategori as string | null).filter((k): k is string => !!k))]
}

async function ambilTransaksiTerakhir(agenId: string) {
  const { data, error } = await supabase
    .from('transaksi')
    .select('id, kode_produk, nomor_tujuan, status, saldo_sebelum, saldo_sesudah, dibuat_pada')
    .eq('agen_id', agenId)
    .order('dibuat_pada', { ascending: false })
    .limit(3)
  if (error) throw new Error(error.message)

  const baris = (data ?? []) as TransaksiTerakhir[]
  const kode = [...new Set(baris.map((t) => t.kode_produk))]
  let nama: Record<string, string> = {}
  if (kode.length > 0) {
    const { data: produk } = await supabase.from('produk').select('kode_produk, nama').in('kode_produk', kode)
    nama = Object.fromEntries((produk ?? []).map((p) => [p.kode_produk, p.nama as string]))
  }
  return { baris, nama }
}

export default function BerandaScreen() {
  const router = useRouter()
  const [profil, setProfil] = useState<ProfilSaya | null>(null)
  const [ringkasan, setRingkasan] = useState<RingkasanHariIni>(RINGKASAN_KOSONG)
  const [carousel, setCarousel] = useState<BannerAktif[]>([])
  const [popup, setPopup] = useState<BannerAktif | null>(null)
  const [kategoriAktif, setKategoriAktif] = useState<string[] | null>(null)
  const [terakhir, setTerakhir] = useState<TransaksiTerakhir[]>([])
  const [namaProduk, setNamaProduk] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setErrorMessage('')

    try {
      const profilSaya = await ambilProfilSaya()
      setProfil(profilSaya)

      const { data, error } = await supabase
        .from('transaksi')
        .select('status, saldo_sebelum, saldo_sesudah')
        .eq('agen_id', profilSaya.id)
        .gte('dibuat_pada', awalHariIniIso())

      if (error) throw new Error(`Gagal memuat ringkasan: ${error.message}`)

      const hasil = { ...RINGKASAN_KOSONG }
      for (const t of data ?? []) {
        hasil.total += 1
        if (t.status === 'berhasil') {
          hasil.berhasil += 1
          hasil.omset += Number(t.saldo_sebelum) - Number(t.saldo_sesudah)
        } else if (t.status === 'gagal') {
          hasil.gagal += 1
        } else {
          hasil.diproses += 1
        }
      }
      setRingkasan(hasil)

      // Bagian opsional: kegagalan memuatnya tidak boleh menutup seluruh Beranda
      const [banners, kategori, transaksi] = await Promise.all([
        ambilBannerAktif().catch(() => null),
        ambilKategoriAktif().catch(() => null),
        ambilTransaksiTerakhir(profilSaya.id).catch(() => null),
      ])
      setCarousel(banners ? banners.filter((b) => b.tampilan !== 'popup') : [])
      setPopup(banners ? (banners.find((b) => b.tampilan === 'popup') ?? null) : null)
      setKategoriAktif(kategori)
      if (transaksi) {
        setTerakhir(transaksi.baris)
        setNamaProduk(transaksi.nama)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan, silakan coba lagi')
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

  // Saldo & status transaksi berubah live (butuh Realtime aktif; pull-to-refresh sebagai cadangan)
  const profilId = profil?.id
  useEffect(() => {
    if (!profilId) return
    const channel = supabase
      .channel(`beranda-${profilId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profilId}` }, () => {
        muat()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi', filter: `agen_id=eq.${profilId}` }, () => {
        muat()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profilId, muat])

  const onPressBanner = async (banner: BannerAktif) => {
    const kode = await jalankanAksiBanner(banner)
    if (kode) router.push({ pathname: '/(app)/produk/beli', params: { kode } })
  }

  if (loading) return <BerandaSkeleton />

  if (!profil) {
    return (
      <View style={styles.container}>
        <CurvedHeader>
          <Text style={styles.wordmark}>Ade Pulsa</Text>
        </CurvedHeader>
        <EmptyState
          ikon="alert-circle-outline"
          judul="Beranda belum bisa dimuat"
          keterangan={errorMessage || 'Profil tidak tersedia'}
          aksiLabel="Coba Lagi"
          onAksi={() => muat()}
        />
      </View>
    )
  }

  const isMaster = profil.tier === 'master'
  const tierWarna: PastelNama = isMaster ? 'butter' : 'sky'

  const kategoriTersedia = kategoriAktif
    ? KATEGORI_PRODUK.filter((k) => kategoriAktif.includes(k.value))
    : KATEGORI_PRODUK
  const perluLainnya = kategoriTersedia.length > SLOT_MENU
  const menuKategori = perluLainnya ? kategoriTersedia.slice(0, SLOT_MENU - 1) : kategoriTersedia

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} colors={[Colors.primary]} tintColor={Colors.primary} />
      }
    >
      <CurvedHeader ruangBawah={TINGGI_TUMPANG_TINDIH + Spacing.xl}>
        <View style={styles.headerBaris}>
          <View style={styles.headerSalam}>
            <Text style={styles.salamKecil}>Selamat datang,</Text>
            <Text style={styles.nama} numberOfLines={1}>
              {profil.nama ?? 'Agen'}
            </Text>
          </View>
          <Text style={styles.wordmark}>Ade Pulsa</Text>
        </View>
      </CurvedHeader>

      <View style={styles.saldoWrap}>
        <Card>
          <View style={styles.saldoBaris}>
            <View style={styles.saldoKolom}>
              <Text style={styles.saldoLabel}>Saldo Anda</Text>
              <Text style={styles.saldoValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatRupiah(profil.saldo)}
              </Text>
            </View>
            <View style={[styles.tierPill, { backgroundColor: Pastel[tierWarna].bg }]}>
              <Ionicons name={isMaster ? 'ribbon' : 'person'} size={13} color={Pastel[tierWarna].fg} />
              <Text style={[styles.tierText, { color: Pastel[tierWarna].teks }]}>
                {isMaster ? 'Agen Master' : 'Agen Biasa'}
              </Text>
            </View>
          </View>
          <View style={styles.saldoAksi}>
            <Button
              label="Top-up"
              icon="add-circle-outline"
              size="sm"
              style={styles.saldoTombol}
              onPress={() => bukaTopupWa(profil.nama, profil.nomor_wa)}
            />
            <Button
              label="Riwayat"
              icon="receipt-outline"
              variant="soft"
              size="sm"
              style={styles.saldoTombol}
              onPress={() => router.push('/(app)/(tabs)/riwayat')}
            />
          </View>
        </Card>
      </View>

      <View style={styles.body}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View>
          <SectionHeader judul="Beli Produk" />
          <Card>
            {kategoriTersedia.length === 0 ? (
              <Text style={styles.kosongText}>Belum ada produk yang tersedia.</Text>
            ) : (
              <View style={styles.menuGrid}>
                {menuKategori.map((k) => (
                  <MenuItem
                    key={k.value}
                    label={k.label}
                    ikon={TAMPILAN_KATEGORI[k.value].ikon}
                    warna={TAMPILAN_KATEGORI[k.value].warna}
                    onPress={() =>
                      router.push({ pathname: '/(app)/produk/[kategori]', params: { kategori: k.value } })
                    }
                  />
                ))}
                {perluLainnya ? (
                  <MenuItem
                    label="Lainnya"
                    ikon="apps-outline"
                    warna="rose"
                    onPress={() => router.push('/(app)/(tabs)/produk')}
                  />
                ) : null}
              </View>
            )}
          </Card>
        </View>

        {carousel.length > 0 ? <BannerCarousel banners={carousel} onPressBanner={onPressBanner} /> : null}

        <View>
          <SectionHeader judul="Transaksi Hari Ini" />
          <View style={styles.statBaris}>
            <StatTile label="Total" nilai={ringkasan.total} warna="sky" />
            <StatTile label="Berhasil" nilai={ringkasan.berhasil} warna="mint" />
            <StatTile label="Diproses" nilai={ringkasan.diproses} warna="butter" />
            <StatTile label="Gagal" nilai={ringkasan.gagal} warna="rose" />
          </View>
          {isMaster ? (
            <Card style={styles.omsetCard}>
              <IconTile ikon="cash-outline" warna="mint" size={44} />
              <View>
                <Text style={styles.omsetLabel}>Total Omset Hari Ini</Text>
                <Text style={styles.omsetValue}>{formatRupiah(ringkasan.omset)}</Text>
              </View>
            </Card>
          ) : null}
        </View>

        <View>
          <SectionHeader
            judul="Transaksi Terakhir"
            aksiLabel={terakhir.length > 0 ? 'Lihat semua' : undefined}
            onAksi={() => router.push('/(app)/(tabs)/riwayat')}
          />
          <Card padded={false}>
            {terakhir.length === 0 ? (
              <EmptyState
                ikon="receipt-outline"
                judul="Belum ada transaksi"
                keterangan="Transaksi Anda akan tampil di sini setelah membeli produk."
              />
            ) : (
              terakhir.map((t, i) => (
                <View key={t.id} style={[styles.trxBaris, i > 0 && styles.trxGaris]}>
                  <IconTile ikon={getStatusIkon(t.status)} warna={getStatusPastel(t.status)} size={42} />
                  <View style={styles.trxTengah}>
                    <Text style={styles.trxNama} numberOfLines={1}>
                      {namaProduk[t.kode_produk] ?? t.kode_produk}
                    </Text>
                    <Text style={styles.trxSub} numberOfLines={1}>
                      {t.nomor_tujuan} · {formatWaktu(t.dibuat_pada)}
                    </Text>
                  </View>
                  <View style={styles.trxKanan}>
                    <Text style={styles.trxHarga}>{formatRupiah(t.saldo_sebelum - t.saldo_sesudah)}</Text>
                    <StatusPill status={t.status} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </View>

      <PromoPopup banner={popup} onPressBanner={onPressBanner} />
    </ScrollView>
  )
}

function MenuItem({
  label,
  ikon,
  warna,
  onPress,
}: {
  label: string
  ikon: IoniconName
  warna: PastelNama
  onPress: () => void
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemTekan]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <IconTile ikon={ikon} warna={warna} size={52} />
      <Text style={styles.menuLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  )
}

function StatTile({ label, nilai, warna }: { label: string; nilai: number; warna: PastelNama }) {
  return (
    <View style={[styles.stat, { backgroundColor: Pastel[warna].bg }]}>
      <Text style={[styles.statValue, { color: Pastel[warna].teks }]}>{nilai}</Text>
      <Text style={[styles.statLabel, { color: Pastel[warna].teks }]}>{label}</Text>
    </View>
  )
}

function BerandaSkeleton() {
  return (
    <View style={styles.container}>
      <CurvedHeader ruangBawah={TINGGI_TUMPANG_TINDIH + Spacing.xl}>
        <Skeleton width={110} height={12} />
        <Skeleton width={190} height={20} style={styles.skeletonNama} />
      </CurvedHeader>
      <View style={styles.saldoWrap}>
        <Card>
          <Skeleton width={90} height={12} />
          <Skeleton width={170} height={28} style={styles.skeletonNama} />
          <Skeleton height={38} radius={Radius.full} style={styles.skeletonNama} />
        </Card>
      </View>
      <View style={styles.body}>
        <Skeleton height={150} radius={Radius.lg} />
        <Skeleton height={80} radius={Radius.lg} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  headerBaris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  headerSalam: { flex: 1 },
  salamKecil: { color: Pastel.rose.bg, fontSize: FontSize.sm },
  nama: { color: Colors.textWhite, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 2 },
  wordmark: { color: Colors.textWhite, fontSize: FontSize.md, fontWeight: FontWeight.bold, opacity: 0.9 },
  saldoWrap: { marginTop: -TINGGI_TUMPANG_TINDIH, marginHorizontal: Spacing.xl },
  saldoBaris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  saldoKolom: { flex: 1 },
  saldoLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  saldoValue: { color: Colors.textPrimary, fontSize: FontSize.xxl + 4, fontWeight: FontWeight.bold, marginTop: 2 },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tierText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  saldoAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  saldoTombol: { flex: 1 },
  body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xl },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },
  kosongText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.lg },
  menuItem: { width: '25%', alignItems: 'center', gap: 6 },
  menuItemTekan: { opacity: 0.6 },
  menuLabel: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold, textAlign: 'center' },
  statBaris: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  omsetCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  omsetLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  omsetValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 2 },
  trxBaris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  trxGaris: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  trxTengah: { flex: 1 },
  trxNama: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  trxSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  trxKanan: { alignItems: 'flex-end', gap: 4 },
  trxHarga: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  skeletonNama: { marginTop: Spacing.sm },
})
