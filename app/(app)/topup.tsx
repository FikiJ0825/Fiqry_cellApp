import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Chip from '../../components/ui/Chip'
import Input from '../../components/ui/Input'
import Loading from '../../components/ui/Loading'
import ResultSheet from '../../components/ui/ResultSheet'
import Screen from '../../components/ui/Screen'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { formatRupiah } from '../../lib/format'
import { panggilFungsi } from '../../lib/functions'
import { ambilProfilSaya, ProfilSaya } from '../../lib/profil'
import { supabase } from '../../lib/supabase'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import { bukaTopupWa, TOPUP_MAKSIMAL, TOPUP_MINIMAL, TOPUP_PILIHAN } from '../../lib/topup'
import { formatWaktu } from '../../lib/transaksi'

interface TopupAktif {
  id: string
  jumlah: number
  qr_string: string | null
  payment_url: string | null
  kadaluarsa_pada: string
}

interface TopupRow extends TopupAktif {
  status: 'pending' | 'berhasil' | 'gagal' | 'kadaluarsa'
  dibuat_pada: string
}

const JEDA_CEK_DETIK = 20

function sisaDetik(kadaluarsaPada: string): number {
  return Math.max(0, Math.floor((new Date(kadaluarsaPada).getTime() - Date.now()) / 1000))
}

function formatSisa(detik: number): string {
  const m = Math.floor(detik / 60)
  const s = detik % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TopupScreen() {
  const styles = useStyles(buatStyles)
  const { colors, pastel } = useTheme()
  const router = useRouter()

  const [profil, setProfil] = useState<ProfilSaya | null>(null)
  const [riwayat, setRiwayat] = useState<TopupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [nominal, setNominal] = useState('')
  const [membuat, setMembuat] = useState(false)
  const [pesanError, setPesanError] = useState('')

  const [aktif, setAktif] = useState<TopupAktif | null>(null)
  const [sisa, setSisa] = useState(0)
  const [mengecek, setMengecek] = useState(false)
  const [jedaCek, setJedaCek] = useState(0)
  const [infoCek, setInfoCek] = useState('')
  const [berhasilJumlah, setBerhasilJumlah] = useState<number | null>(null)

  const aktifId = useRef<string | null>(null)
  aktifId.current = aktif?.id ?? null

  const jumlah = Number(nominal.replace(/\D/g, '')) || 0
  const jumlahValid = jumlah >= TOPUP_MINIMAL && jumlah <= TOPUP_MAKSIMAL

  const muat = useCallback(async () => {
    try {
      const [profilSaya, hasil] = await Promise.all([
        ambilProfilSaya(),
        supabase
          .from('topup_otomatis')
          .select('id, jumlah, status, qr_string, payment_url, kadaluarsa_pada, dibuat_pada')
          .order('dibuat_pada', { ascending: false })
          .limit(5),
      ])
      if (hasil.error) throw new Error(`Gagal memuat riwayat top up: ${hasil.error.message}`)
      setProfil(profilSaya)
      setRiwayat(((hasil.data ?? []) as TopupRow[]).map((r) => ({ ...r, jumlah: Number(r.jumlah) })))
      setErrorMessage('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  // Status top up & saldo berubah live saat callback Duitku masuk (butuh Realtime aktif).
  const profilId = profil?.id
  useEffect(() => {
    if (!profilId) return
    const channel = supabase
      .channel(`topup-${profilId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'topup_otomatis', filter: `agen_id=eq.${profilId}` },
        (payload) => {
          const baru = payload.new as { id?: string; status?: string; jumlah?: number }
          if (baru?.id && baru.id === aktifId.current && baru.status === 'berhasil') {
            setBerhasilJumlah(Number(baru.jumlah))
            setAktif(null)
          }
          muat()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profilId, muat])

  // Hitung mundur masa berlaku QR
  useEffect(() => {
    if (!aktif) return
    setSisa(sisaDetik(aktif.kadaluarsa_pada))
    const timer = setInterval(() => setSisa(sisaDetik(aktif.kadaluarsa_pada)), 1000)
    return () => clearInterval(timer)
  }, [aktif])

  // Jeda tombol "Cek status" (server juga membatasi)
  useEffect(() => {
    if (jedaCek <= 0) return
    const timer = setTimeout(() => setJedaCek((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [jedaCek])

  const buatQr = async () => {
    setPesanError('')
    setInfoCek('')
    setMembuat(true)
    const respons = await panggilFungsi<{
      topup_id: string
      jumlah: number
      qr_string: string | null
      payment_url: string | null
      kadaluarsa_pada: string
    }>('buat-topup', { jumlah })
    setMembuat(false)

    if (respons.error || !respons.data) {
      setPesanError(respons.error ?? 'Gagal membuat top up')
      return
    }

    setAktif({
      id: respons.data.topup_id,
      jumlah: Number(respons.data.jumlah),
      qr_string: respons.data.qr_string,
      payment_url: respons.data.payment_url,
      kadaluarsa_pada: respons.data.kadaluarsa_pada,
    })
    muat()
  }

  const cekStatus = async () => {
    if (!aktif) return
    setMengecek(true)
    setInfoCek('')
    const respons = await panggilFungsi<{ status: string; ditunda?: boolean }>('cek-topup', { topup_id: aktif.id })
    setMengecek(false)
    setJedaCek(JEDA_CEK_DETIK)

    if (respons.error || !respons.data) {
      setInfoCek(respons.error ?? 'Gagal memeriksa status')
      return
    }

    if (respons.data.status === 'berhasil') {
      setBerhasilJumlah(aktif.jumlah)
      setAktif(null)
      muat()
    } else if (respons.data.status === 'kadaluarsa' || respons.data.status === 'gagal') {
      setInfoCek('Top up ini sudah kedaluwarsa atau gagal. Buat QR baru.')
    } else {
      setInfoCek('Pembayaran belum diterima. Saldo bertambah otomatis setelah Anda membayar.')
    }
  }

  const tutupQr = () => {
    setAktif(null)
    setInfoCek('')
  }

  const bukaDariRiwayat = (r: TopupRow) => {
    if (r.status === 'pending' && r.qr_string && sisaDetik(r.kadaluarsa_pada) > 0) {
      setInfoCek('')
      setAktif(r)
    }
  }

  const labelStatus = (r: TopupRow): { teks: string; warna: 'mint' | 'rose' | 'butter' | 'sky' } => {
    if (r.status === 'berhasil') return { teks: 'Berhasil', warna: 'mint' }
    if (r.status === 'gagal') return { teks: 'Gagal', warna: 'rose' }
    if (r.status === 'kadaluarsa' || sisaDetik(r.kadaluarsa_pada) === 0) return { teks: 'Kedaluwarsa', warna: 'sky' }
    return { teks: 'Menunggu bayar', warna: 'butter' }
  }

  if (loading) return <Loading />

  const kedaluwarsa = aktif !== null && sisa === 0

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              muat()
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Card style={styles.saldoKartu}>
          <Text style={styles.label}>Saldo Anda</Text>
          <Text style={styles.saldo}>{formatRupiah(profil?.saldo ?? 0)}</Text>
        </Card>

        {errorMessage ? (
          <View style={styles.peringatan}>
            <Ionicons name="alert-circle" size={20} color={pastel.rose.fg} />
            <Text style={styles.peringatanTeks}>{errorMessage}</Text>
          </View>
        ) : null}

        {aktif ? (
          <Card style={styles.qrKartu}>
            <Text style={styles.label}>Bayar dengan QRIS</Text>
            <Text style={styles.qrJumlah}>{formatRupiah(aktif.jumlah)}</Text>

            {aktif.qr_string && !kedaluwarsa ? (
              <View style={styles.qrKotak}>
                <QRCode value={aktif.qr_string} size={220} backgroundColor="#FFFFFF" color="#000000" />
              </View>
            ) : (
              <View style={styles.qrKotak}>
                <Ionicons name="time-outline" size={64} color={colors.grey} />
              </View>
            )}

            <Text style={[styles.hitung, kedaluwarsa && styles.hitungHabis]}>
              {kedaluwarsa ? 'QR sudah kedaluwarsa' : `Berlaku ${formatSisa(sisa)}`}
            </Text>
            <Text style={styles.petunjuk}>
              Scan dengan aplikasi e-wallet atau mobile banking apa pun yang mendukung QRIS. Saldo bertambah otomatis
              setelah pembayaran berhasil.
            </Text>

            {infoCek ? <Text style={styles.info}>{infoCek}</Text> : null}

            {kedaluwarsa ? (
              <Button label="Buat QR Baru" icon="refresh-outline" onPress={tutupQr} style={styles.tombolPenuh} />
            ) : (
              <Button
                label={jedaCek > 0 ? `Cek status (${jedaCek})` : 'Saya sudah bayar, cek status'}
                icon="checkmark-done-outline"
                variant="soft"
                onPress={cekStatus}
                loading={mengecek}
                disabled={jedaCek > 0}
                style={styles.tombolPenuh}
              />
            )}
            {!kedaluwarsa ? <Button label="Batalkan" variant="outline" onPress={tutupQr} style={styles.tombolPenuh} /> : null}
          </Card>
        ) : (
          <Card style={styles.formKartu}>
            <Text style={styles.judul}>Top up otomatis</Text>
            <Text style={styles.petunjuk}>
              Pilih nominal, bayar lewat QRIS, saldo masuk otomatis. Minimal {formatRupiah(TOPUP_MINIMAL)}.
            </Text>

            <View style={styles.pilihan}>
              {TOPUP_PILIHAN.map((p) => (
                <Chip
                  key={p}
                  label={formatRupiah(p)}
                  selected={jumlah === p}
                  onPress={() => {
                    setNominal(String(p))
                    setPesanError('')
                  }}
                />
              ))}
            </View>

            <Input
              label="Nominal lain"
              ikon="cash-outline"
              value={nominal ? jumlah.toLocaleString('id-ID') : ''}
              onChangeText={(v) => {
                setNominal(v.replace(/\D/g, '').slice(0, 8))
                setPesanError('')
              }}
              placeholder="Contoh: 75.000"
              keyboardType="number-pad"
              editable={!membuat}
              error={nominal && !jumlahValid ? `Nominal ${formatRupiah(TOPUP_MINIMAL)} - ${formatRupiah(TOPUP_MAKSIMAL)}` : undefined}
            />

            {pesanError ? <Text style={styles.error}>{pesanError}</Text> : null}

            <Button
              label="Buat QRIS"
              icon="qr-code-outline"
              onPress={buatQr}
              disabled={!jumlahValid}
              loading={membuat}
              style={styles.tombolPenuh}
            />
          </Card>
        )}

        <Pressable
          style={styles.manual}
          onPress={() => bukaTopupWa(profil?.nama ?? null, profil?.nomor_wa ?? null)}
          accessibilityRole="button"
        >
          <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
          <Text style={styles.manualTeks}>Top up manual lewat WhatsApp Admin</Text>
        </Pressable>

        <Text style={styles.bagian}>Top up terakhir</Text>
        {riwayat.length === 0 ? (
          <Text style={styles.kosong}>Belum ada top up otomatis.</Text>
        ) : (
          riwayat.map((r) => {
            const status = labelStatus(r)
            const bisaDibuka = r.status === 'pending' && !!r.qr_string && sisaDetik(r.kadaluarsa_pada) > 0
            return (
              <Pressable key={r.id} onPress={() => bukaDariRiwayat(r)} disabled={!bisaDibuka}>
                <Card style={styles.baris}>
                  <View style={styles.barisKiri}>
                    <Text style={styles.barisJumlah}>{formatRupiah(r.jumlah)}</Text>
                    <Text style={styles.barisWaktu}>{formatWaktu(r.dibuat_pada)}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pastel[status.warna].bg }]}>
                    <Text style={[styles.pillTeks, { color: pastel[status.warna].teks }]}>{status.teks}</Text>
                  </View>
                </Card>
              </Pressable>
            )
          })
        )}
      </ScrollView>

      <ResultSheet
        visible={berhasilJumlah !== null}
        ikon="checkmark-circle-outline"
        warna="mint"
        judul="Top up berhasil"
        pesan={`Saldo bertambah ${formatRupiah(berhasilJumlah ?? 0)}.`}
        aksi={{ label: 'Selesai', onPress: () => router.back() }}
        aksiKedua={{ label: 'Top up lagi', onPress: () => setBerhasilJumlah(null) }}
        onTutup={() => setBerhasilJumlah(null)}
      />
    </Screen>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxl },
    saldoKartu: { gap: 2 },
    label: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary },
    saldo: { fontFamily: Font.bold, fontSize: FontSize.xxl, color: t.colors.primaryDark },
    judul: { fontFamily: Font.bold, fontSize: FontSize.lg, color: t.colors.textPrimary },
    petunjuk: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, lineHeight: 20 },
    formKartu: { gap: Spacing.md },
    pilihan: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    error: { fontFamily: Font.semibold, fontSize: FontSize.sm, color: t.colors.error },
    tombolPenuh: { alignSelf: 'stretch' },
    qrKartu: { gap: Spacing.md, alignItems: 'center' },
    qrJumlah: { fontFamily: Font.bold, fontSize: FontSize.xxl, color: t.colors.primaryDark },
    qrKotak: {
      width: 252,
      height: 252,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    hitung: { fontFamily: Font.bold, fontSize: FontSize.md, color: t.colors.textPrimary },
    hitungHabis: { color: t.colors.error },
    info: { fontFamily: Font.semibold, fontSize: FontSize.sm, color: t.colors.textPrimary, textAlign: 'center' },
    peringatan: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: t.pastel.rose.bg,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    peringatanTeks: { flex: 1, fontSize: FontSize.sm, color: t.pastel.rose.teks, fontFamily: Font.semibold },
    manual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
    manualTeks: { fontFamily: Font.semibold, fontSize: FontSize.sm, color: t.colors.primary },
    bagian: { fontFamily: Font.bold, fontSize: FontSize.md, color: t.colors.textPrimary, marginTop: Spacing.sm },
    kosong: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary },
    baris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    barisKiri: { flex: 1 },
    barisJumlah: { fontFamily: Font.bold, fontSize: FontSize.md, color: t.colors.textPrimary },
    barisWaktu: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, marginTop: 2 },
    pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
    pillTeks: { fontSize: FontSize.xs, fontFamily: Font.bold },
  })
