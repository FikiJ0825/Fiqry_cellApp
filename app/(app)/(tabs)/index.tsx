import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { ComponentProps, useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import BannerCarousel from '../../../components/BannerCarousel'
import PromoPopup from '../../../components/PromoPopup'
import { Colors, FontSize, Radius } from '../../../constants/theme'
import { BannerAktif, ambilBannerAktif, jalankanAksiBanner } from '../../../lib/banner'
import { formatRupiah } from '../../../lib/format'
import { ambilProfilSaya, ProfilSaya } from '../../../lib/profil'
import { supabase } from '../../../lib/supabase'
import { bukaTopupWa } from '../../../lib/topup'
import { awalHariIniIso } from '../../../lib/transaksi'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface RingkasanHariIni {
  total: number
  berhasil: number
  diproses: number
  gagal: number
  omset: number
}

const RINGKASAN_KOSONG: RingkasanHariIni = { total: 0, berhasil: 0, diproses: 0, gagal: 0, omset: 0 }

export default function BerandaScreen() {
  const router = useRouter()
  const [profil, setProfil] = useState<ProfilSaya | null>(null)
  const [ringkasan, setRingkasan] = useState<RingkasanHariIni>(RINGKASAN_KOSONG)
  const [carousel, setCarousel] = useState<BannerAktif[]>([])
  const [popup, setPopup] = useState<BannerAktif | null>(null)
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

      // Banner opsional: kegagalan memuatnya tidak boleh menutup seluruh Beranda
      try {
        const banners = await ambilBannerAktif()
        setCarousel(banners.filter((b) => b.tampilan !== 'popup'))
        setPopup(banners.find((b) => b.tampilan === 'popup') ?? null)
      } catch {
        setCarousel([])
        setPopup(null)
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!profil) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMessage || 'Profil tidak tersedia'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => muat()}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isMaster = profil.tier === 'master'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} />}
    >
      <View style={styles.saldoCard}>
        <Text style={styles.salam}>Halo, {profil.nama ?? 'Agen'}</Text>
        <Text style={styles.saldoLabel}>Saldo Anda</Text>
        <Text style={styles.saldoValue}>{formatRupiah(profil.saldo)}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{isMaster ? 'Agen Master' : 'Agen Biasa'}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.actions}>
        <Aksi ikon="cart-outline" label="Beli Produk" onPress={() => router.push('/(app)/(tabs)/produk')} />
        <Aksi ikon="receipt-outline" label="Riwayat" onPress={() => router.push('/(app)/(tabs)/riwayat')} />
        <Aksi ikon="add-circle-outline" label="Top-up" onPress={() => bukaTopupWa(profil.nama, profil.nomor_wa)} />
      </View>

      {carousel.length > 0 ? (
        <View style={styles.section}>
          <BannerCarousel banners={carousel} onPressBanner={onPressBanner} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaksi Hari Ini</Text>
        <View style={styles.statRow}>
          <Stat label="Total" nilai={ringkasan.total} warna={Colors.textPrimary} />
          <Stat label="Berhasil" nilai={ringkasan.berhasil} warna={Colors.success} />
          <Stat label="Diproses" nilai={ringkasan.diproses} warna={Colors.warning} />
          <Stat label="Gagal" nilai={ringkasan.gagal} warna={Colors.error} />
        </View>
        {isMaster ? (
          <View style={styles.omsetCard}>
            <Text style={styles.omsetLabel}>Total Omset Hari Ini</Text>
            <Text style={styles.omsetValue}>{formatRupiah(ringkasan.omset)}</Text>
          </View>
        ) : null}
      </View>

      <PromoPopup banner={popup} onPressBanner={onPressBanner} />
    </ScrollView>
  )
}

function Aksi({ ikon, label, onPress }: { ikon: IoniconName; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.aksi} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.aksiIcon}>
        <Ionicons name={ikon} size={26} color={Colors.primary} />
      </View>
      <Text style={styles.aksiLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function Stat({ label, nilai, warna }: { label: string; nilai: number; warna: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: warna }]}>{nilai}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginBottom: 12 },
  retryButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '600' },
  saldoCard: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 20, marginBottom: 20 },
  salam: { color: Colors.primaryLight, fontSize: FontSize.sm, marginBottom: 12 },
  saldoLabel: { color: Colors.primaryLight, fontSize: FontSize.sm },
  saldoValue: { color: Colors.textWhite, fontSize: FontSize.xxl + 4, fontWeight: 'bold', marginTop: 2 },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
  },
  tierText: { color: Colors.textWhite, fontSize: FontSize.xs, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  aksi: { alignItems: 'center', width: 90 },
  aksiIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  aksiLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  omsetCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 12,
  },
  omsetLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  omsetValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary, marginTop: 2 },
})
