import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import ProdukBaris from '../../../components/ProdukBaris'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import IconTile from '../../../components/ui/IconTile'
import Input from '../../../components/ui/Input'
import ScreenHeader from '../../../components/ui/ScreenHeader'
import Skeleton from '../../../components/ui/Skeleton'
import { KATEGORI_PRODUK, TAMPILAN_KATEGORI } from '../../../constants/produk'
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../../constants/theme'
import { ambilProfilSaya, hargaUntukTier } from '../../../lib/profil'
import { supabase } from '../../../lib/supabase'

interface ProdukRow {
  kode_produk: string
  nama: string
  kategori: string | null
  harga_jual_biasa: number
  harga_jual_master: number
}

const MIN_HURUF_CARI = 2
const BATAS_HASIL_CARI = 50

export default function ProdukKategoriScreen() {
  const router = useRouter()
  const [produk, setProduk] = useState<ProdukRow[]>([])
  const [tier, setTier] = useState<string | null>(null)
  const [cari, setCari] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setErrorMessage('')

    const [hasil, profil] = await Promise.all([
      supabase
        .from('produk')
        .select('kode_produk, nama, kategori, harga_jual_biasa, harga_jual_master')
        .eq('aktif', true)
        .order('nama', { ascending: true }),
      // Tier hanya dipakai untuk harga di hasil pencarian; kegagalannya tidak boleh menutup daftar kategori
      ambilProfilSaya().catch(() => null),
    ])

    if (hasil.error) {
      setErrorMessage(`Gagal memuat produk: ${hasil.error.message}`)
    } else {
      setProduk((hasil.data ?? []) as ProdukRow[])
      setTier(profil?.tier ?? null)
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  const jumlah = useMemo(() => {
    const hitung: Record<string, number> = {}
    for (const p of produk) {
      if (p.kategori) hitung[p.kategori] = (hitung[p.kategori] ?? 0) + 1
    }
    return hitung
  }, [produk])

  const kategoriTersedia = useMemo(() => KATEGORI_PRODUK.filter((k) => (jumlah[k.value] ?? 0) > 0), [jumlah])

  const kataCari = cari.trim().toLowerCase()
  const hasilCari = useMemo(() => {
    if (kataCari.length < MIN_HURUF_CARI) return null
    return produk
      .filter((p) => `${p.nama} ${p.kode_produk}`.toLowerCase().includes(kataCari))
      .slice(0, BATAS_HASIL_CARI)
  }, [produk, kataCari])

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        <ScreenHeader judul="Produk" keterangan="Pilih kategori atau cari produk" ruangBawah={44} />

        <View style={styles.cariWrap}>
          <Input
            ikon="search-outline"
            value={cari}
            onChangeText={setCari}
            placeholder="Cari produk, mis. Telkomsel 10.000"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Cari produk"
          />
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.grid}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width="47.5%" height={120} radius={Radius.lg} />
              ))}
            </View>
          ) : errorMessage ? (
            <EmptyState
              ikon="alert-circle-outline"
              judul="Produk belum bisa dimuat"
              keterangan={errorMessage}
              aksiLabel="Coba Lagi"
              onAksi={() => muat()}
            />
          ) : hasilCari ? (
            hasilCari.length === 0 ? (
              <EmptyState
                ikon="search-outline"
                judul="Produk tidak ditemukan"
                keterangan="Coba kata kunci lain, misalnya nama operator atau nominal."
              />
            ) : (
              <View style={styles.daftar}>
                {hasilCari.map((p) => (
                  <ProdukBaris
                    key={p.kode_produk}
                    nama={p.nama}
                    kode={p.kode_produk}
                    kategori={p.kategori}
                    tampilKategori
                    harga={hargaUntukTier(tier, p)}
                    onPress={() => router.push({ pathname: '/(app)/produk/beli', params: { kode: p.kode_produk } })}
                  />
                ))}
              </View>
            )
          ) : kategoriTersedia.length === 0 ? (
            <EmptyState ikon="cube-outline" judul="Belum ada produk" keterangan="Produk akan tampil di sini setelah ditambahkan admin." />
          ) : (
            <View style={styles.grid}>
              {kategoriTersedia.map((k) => (
                <Pressable
                  key={k.value}
                  style={styles.kartuWrap}
                  accessibilityRole="button"
                  accessibilityLabel={`${k.label}, ${jumlah[k.value]} produk`}
                  onPress={() => router.push({ pathname: '/(app)/produk/[kategori]', params: { kategori: k.value } })}
                >
                  {({ pressed }) => (
                    <Card style={[styles.kartu, pressed && styles.tekan]}>
                      <IconTile ikon={TAMPILAN_KATEGORI[k.value].ikon} warna={TAMPILAN_KATEGORI[k.value].warna} size={56} />
                      <Text style={styles.kartuJudul}>{k.label}</Text>
                      <Text style={styles.kartuSub}>{jumlah[k.value]} produk</Text>
                    </Card>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  cariWrap: {
    marginTop: -24,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  body: { padding: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  daftar: { gap: Spacing.md },
  kartuWrap: { width: '47.5%' },
  kartu: { alignItems: 'center', gap: 4 },
  tekan: { opacity: 0.75 },
  kartuJudul: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginTop: Spacing.sm },
  kartuSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
})
