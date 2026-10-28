import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import IconTile from '../../../components/ui/IconTile'
import Input from '../../../components/ui/Input'
import Loading from '../../../components/ui/Loading'
import PinInput from '../../../components/ui/PinInput'
import ResultSheet from '../../../components/ui/ResultSheet'
import { IoniconName, KategoriProduk, TAMPILAN_KATEGORI } from '../../../constants/produk'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../../constants/theme'
import { formatRupiah } from '../../../lib/format'
import { panggilFungsi } from '../../../lib/functions'
import { ambilProfilSaya, hargaUntukTier, ProfilSaya } from '../../../lib/profil'
import { supabase } from '../../../lib/supabase'
import { bukaTopupWa } from '../../../lib/topup'

interface ProdukRow {
  kode_produk: string
  nama: string
  kategori: string | null
  harga_jual_biasa: number
  harga_jual_master: number
}

type HasilTransaksi = { tipe: 'sukses' } | { tipe: 'gagal'; pesan: string }

// Pulsa, data, e-wallet, listrik, dll. memakai angka; game bisa memakai ID huruf+angka.
function bersihkanTujuan(value: string, kategori: string | null): string {
  return kategori === 'game' ? value.replace(/[^A-Za-z0-9]/g, '') : value.replace(/\D/g, '')
}

function ikonTujuan(kategori: string | null): IoniconName {
  if (kategori === 'game') return 'game-controller-outline'
  if (kategori === 'pulsa' || kategori === 'paket_data' || kategori === 'e_wallet') return 'call-outline'
  return 'keypad-outline'
}

export default function BeliScreen() {
  const router = useRouter()
  const { kode } = useLocalSearchParams<{ kode: string }>()

  const [produk, setProduk] = useState<ProdukRow | null>(null)
  const [profil, setProfil] = useState<ProfilSaya | null>(null)
  const [punyaPin, setPunyaPin] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [tujuan, setTujuan] = useState('')
  const [pin, setPin] = useState('')
  const [konfirmasiTampil, setKonfirmasiTampil] = useState(false)
  const [hasil, setHasil] = useState<HasilTransaksi | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const [profilSaya, hasilProduk, hasilPin] = await Promise.all([
        ambilProfilSaya(),
        supabase
          .from('produk')
          .select('kode_produk, nama, kategori, harga_jual_biasa, harga_jual_master')
          .eq('kode_produk', kode)
          .eq('aktif', true)
          .maybeSingle(),
        supabase.rpc('punya_pin'),
      ])

      if (hasilProduk.error) throw new Error(`Gagal memuat produk: ${hasilProduk.error.message}`)
      if (!hasilProduk.data) throw new Error('Produk tidak ditemukan atau tidak aktif')

      setProfil(profilSaya)
      setProduk(hasilProduk.data as ProdukRow)
      setPunyaPin(hasilPin.data === true)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }, [kode])

  // Dimuat ulang saat kembali dari layar PIN supaya status PIN terbaru terbaca
  useFocusEffect(
    useCallback(() => {
      muat()
    }, [muat]),
  )

  const harga = produk ? hargaUntukTier(profil?.tier ?? null, produk) : 0
  const saldoKurang = profil ? profil.saldo < harga : false
  const tujuanValid = /^[A-Za-z0-9]{4,30}$/.test(tujuan)
  const siapKirim = tujuanValid && /^\d{6}$/.test(pin) && !saldoKurang && punyaPin && !submitting

  const kirim = async () => {
    if (!produk) return
    setKonfirmasiTampil(false)
    setSubmitting(true)

    const respons = await panggilFungsi<{ transaksi_id: string }>('create-transaction', {
      kode_produk: produk.kode_produk,
      nomor_tujuan: tujuan,
      pin,
    })

    setSubmitting(false)
    setPin('')

    if (respons.error) {
      if (respons.kode === 'PIN_BELUM_ADA') setPunyaPin(false)
      setHasil({ tipe: 'gagal', pesan: respons.error })
      return
    }

    setHasil({ tipe: 'sukses' })
  }

  if (loading && !produk) return <Loading />

  if (!produk || !profil) {
    return (
      <View style={styles.pusat}>
        <EmptyState
          ikon="alert-circle-outline"
          judul="Produk belum bisa dimuat"
          keterangan={errorMessage || 'Produk tidak tersedia'}
          aksiLabel="Coba Lagi"
          onAksi={muat}
        />
      </View>
    )
  }

  const tampilan = produk.kategori ? TAMPILAN_KATEGORI[produk.kategori as KategoriProduk] : undefined

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.ringkasan}>
          <View style={styles.produkBaris}>
            <IconTile ikon={tampilan?.ikon ?? 'cube-outline'} warna={tampilan?.warna ?? 'rose'} size={52} />
            <View style={styles.produkTeks}>
              <Text style={styles.produkNama}>{produk.nama}</Text>
              <Text style={styles.produkKode}>{produk.kode_produk}</Text>
            </View>
          </View>
          <View style={styles.garis} />
          <BarisRincian label="Harga" nilai={formatRupiah(harga)} tebal />
          <BarisRincian label="Saldo Anda" nilai={formatRupiah(profil.saldo)} merah={saldoKurang} />
        </Card>

        {saldoKurang ? (
          <View style={styles.peringatan}>
            <Ionicons name="alert-circle" size={20} color={Pastel.rose.fg} />
            <Text style={styles.peringatanTeks}>Saldo tidak mencukupi untuk produk ini.</Text>
            <Button
              label="Top-up"
              size="sm"
              icon="add-circle-outline"
              onPress={() => bukaTopupWa(profil.nama, profil.nomor_wa)}
            />
          </View>
        ) : null}

        <Input
          label="Nomor / ID Tujuan"
          ikon={ikonTujuan(produk.kategori)}
          value={tujuan}
          onChangeText={(v) => setTujuan(bersihkanTujuan(v, produk.kategori))}
          placeholder="Contoh: 081234567890"
          keyboardType={produk.kategori === 'game' ? 'default' : 'number-pad'}
          autoCapitalize="none"
          maxLength={30}
          editable={!submitting}
          wadah={styles.field}
        />

        {punyaPin ? (
          <PinInput label="PIN Transaksi" value={pin} onChange={setPin} editable={!submitting} />
        ) : (
          <View style={styles.peringatan}>
            <Ionicons name="lock-closed" size={20} color={Pastel.rose.fg} />
            <Text style={styles.peringatanTeks}>Buat PIN transaksi dulu sebelum bisa membeli.</Text>
            <Button label="Buat PIN" size="sm" onPress={() => router.push('/(app)/pin')} />
          </View>
        )}

        <Button
          label="Beli Sekarang"
          icon="cart-outline"
          onPress={() => setKonfirmasiTampil(true)}
          disabled={!siapKirim}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>

      <ResultSheet
        visible={konfirmasiTampil}
        ikon="cart-outline"
        warna="rose"
        judul="Konfirmasi pembelian"
        pesan="Pastikan nomor tujuan sudah benar."
        aksi={{ label: 'Beli Sekarang', onPress: kirim }}
        aksiKedua={{ label: 'Batal', onPress: () => setKonfirmasiTampil(false) }}
        onTutup={() => setKonfirmasiTampil(false)}
      >
        <Card padded style={styles.rincianSheet}>
          <BarisRincian label="Produk" nilai={produk.nama} />
          <BarisRincian label="Tujuan" nilai={tujuan} />
          <BarisRincian label="Harga" nilai={formatRupiah(harga)} tebal />
        </Card>
      </ResultSheet>

      <ResultSheet
        visible={hasil !== null}
        ikon={hasil?.tipe === 'sukses' ? 'checkmark-circle-outline' : 'close-circle-outline'}
        warna={hasil?.tipe === 'sukses' ? 'mint' : 'rose'}
        judul={hasil?.tipe === 'sukses' ? 'Transaksi diproses' : 'Transaksi gagal'}
        pesan={hasil?.tipe === 'sukses' ? 'Pantau statusnya di menu Riwayat.' : hasil?.pesan}
        aksi={
          hasil?.tipe === 'sukses'
            ? {
                label: 'Lihat Riwayat',
                onPress: () => {
                  setHasil(null)
                  router.replace('/(app)/(tabs)/riwayat')
                },
              }
            : { label: 'Mengerti', onPress: () => setHasil(null) }
        }
        aksiKedua={hasil?.tipe === 'sukses' ? { label: 'Tutup', onPress: () => setHasil(null) } : undefined}
        onTutup={() => setHasil(null)}
      />
    </KeyboardAvoidingView>
  )
}

function BarisRincian({ label, nilai, tebal = false, merah = false }: { label: string; nilai: string; tebal?: boolean; merah?: boolean }) {
  return (
    <View style={styles.rincian}>
      <Text style={styles.rincianLabel}>{label}</Text>
      <Text style={[styles.rincianNilai, tebal && styles.rincianTebal, merah && styles.rincianMerah]} numberOfLines={2}>
        {nilai}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 40, gap: Spacing.lg },
  pusat: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  ringkasan: { gap: Spacing.sm },
  produkBaris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  produkTeks: { flex: 1 },
  produkNama: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  produkKode: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  garis: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  rincian: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.lg },
  rincianLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rincianNilai: { flexShrink: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'right' },
  rincianTebal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primaryDark },
  rincianMerah: { color: Colors.error },
  rincianSheet: { gap: Spacing.sm, backgroundColor: Colors.background },
  peringatan: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: Pastel.rose.bg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  peringatanTeks: { flex: 1, minWidth: 140, fontSize: FontSize.sm, color: Pastel.rose.teks, fontWeight: FontWeight.semibold },
  field: { marginTop: Spacing.xs },
  submit: { marginTop: Spacing.sm },
})
