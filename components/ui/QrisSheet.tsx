import * as Clipboard from 'expo-clipboard'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { QRIS_PAYLOAD_STATIS } from '../../constants/config'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { formatRupiah } from '../../lib/format'
import { buatQrisDinamis } from '../../lib/qris'
import { supabase } from '../../lib/supabase'
import { Theme, useStyles } from '../../lib/theme'
import Button from './Button'

export interface PesananQris {
  transaksiId: string
  namaProduk: string
  harga: number
  kodeUnik: number
  totalBayar: number
  kedaluwarsaAt: string
  /** 'pembelian' (default): transaksi produk. 'topup': top up saldo (transaksiId = id topup_qris, harga = nominal). */
  jenis?: 'pembelian' | 'topup'
}

interface Props {
  /** Tombol "Sudah bayar? Chat admin", hanya ditampilkan untuk top up */
  onChatAdmin?: () => void
  pesanan: PesananQris | null
  /** Pembayaran diterima, pengguna diarahkan melihat riwayat */
  onLihatRiwayat: () => void
  onTutup: () => void
}

type Tahap = 'menunggu' | 'dibayar' | 'berakhir'

const INTERVAL_CEK_MS = 4000

function formatSisa(detik: number): string {
  const m = Math.floor(detik / 60)
  const s = detik % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Pop-up pembayaran QRIS: QR bernominal, tombol salin nominal, hitung mundur, dan cek status otomatis. */
export default function QrisSheet({ pesanan, onLihatRiwayat, onTutup, onChatAdmin }: Props) {
  const styles = useStyles(buatStyles)
  const insets = useSafeAreaInsets()
  const [tahap, setTahap] = useState<Tahap>('menunggu')
  const [sisaDetik, setSisaDetik] = useState(0)
  const [tersalin, setTersalin] = useState(false)
  const [membatalkan, setMembatalkan] = useState(false)

  const id = pesanan?.transaksiId
  const topup = pesanan?.jenis === 'topup'
  const tabel = topup ? 'topup_qris' : 'transaksi'
  const kedaluwarsaMs = pesanan ? new Date(pesanan.kedaluwarsaAt).getTime() : 0

  // Reset tiap pesanan baru
  useEffect(() => {
    setTahap('menunggu')
    setTersalin(false)
    setMembatalkan(false)
  }, [id])

  // Hitung mundur
  useEffect(() => {
    if (!id || tahap !== 'menunggu') return
    const hitung = () => {
      const sisa = Math.max(0, Math.ceil((kedaluwarsaMs - Date.now()) / 1000))
      setSisaDetik(sisa)
      if (sisa === 0) setTahap((t) => (t === 'menunggu' ? 'berakhir' : t))
    }
    hitung()
    const timer = setInterval(hitung, 1000)
    return () => clearInterval(timer)
  }, [id, kedaluwarsaMs, tahap])

  // Cek status ke server: pending/diproses/berhasil = pembayaran sudah diterima; gagal = batal/habis
  useEffect(() => {
    if (!id || tahap !== 'menunggu') return
    let batal = false
    const cek = async () => {
      const { data } = await supabase.from(tabel).select('status').eq('id', id).maybeSingle()
      if (batal || !data) return
      if (data.status === 'menunggu_pembayaran') return
      setTahap(data.status === 'gagal' ? 'berakhir' : 'dibayar')
    }
    const timer = setInterval(cek, INTERVAL_CEK_MS)
    return () => {
      batal = true
      clearInterval(timer)
    }
  }, [id, tahap, tabel])

  const nilaiQr = useMemo(() => {
    if (!pesanan || !QRIS_PAYLOAD_STATIS) return null
    try {
      return buatQrisDinamis(QRIS_PAYLOAD_STATIS, pesanan.totalBayar)
    } catch (err) {
      console.warn('Gagal membuat QRIS dinamis:', err)
      return null
    }
  }, [pesanan])

  if (!pesanan) return null

  const salinNominal = async () => {
    await Clipboard.setStringAsync(String(pesanan.totalBayar))
    setTersalin(true)
    setTimeout(() => setTersalin(false), 2000)
  }

  const batalkan = async () => {
    setMembatalkan(true)
    const { error } = topup
      ? await supabase.rpc('batalkan_topup_qris', { p_id: pesanan.transaksiId })
      : await supabase.rpc('batalkan_bayar_qris', { p_transaksi_id: pesanan.transaksiId })
    setMembatalkan(false)
    if (!error) onTutup()
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onTutup} statusBarTranslucent>
      <View style={styles.wadah}>
        <Pressable style={styles.latar} onPress={onTutup} accessibilityLabel="Tutup" />
        <View style={[styles.lembar, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.pegangan} />

          {tahap === 'dibayar' ? (
            <>
              <Text style={styles.judul}>{topup ? 'Top up berhasil' : 'Pembayaran diterima'}</Text>
              <Text style={styles.pesan}>
                {topup
                  ? `Saldo Anda bertambah ${formatRupiah(pesanan.harga)}.`
                  : `Pesanan ${pesanan.namaProduk} sedang diproses. Pantau di menu Riwayat.`}
              </Text>
              <Button label={topup ? 'Selesai' : 'Lihat Riwayat'} onPress={onLihatRiwayat} style={styles.tombol} />
            </>
          ) : tahap === 'berakhir' ? (
            <>
              <Text style={styles.judul}>Waktu pembayaran habis</Text>
              <Text style={styles.pesan}>
                Pesanan dibatalkan. Jika Anda sudah terlanjur membayar, hubungi admin dengan menyebut nominal {formatRupiah(pesanan.totalBayar)}.
              </Text>
              <Button label="Tutup" onPress={onTutup} style={styles.tombol} />
            </>
          ) : (
            <>
              <Text style={styles.judul}>Bayar dengan QRIS</Text>
              <Text style={styles.pesan}>{pesanan.namaProduk}</Text>

              <View style={styles.qrKotak}>
                {nilaiQr ? (
                  <QRCode value={nilaiQr} size={220} backgroundColor="#FFFFFF" color="#000000" />
                ) : (
                  <Text style={styles.qrError}>QRIS belum tersedia. Batalkan pesanan lalu hubungi admin.</Text>
                )}
              </View>

              <View style={styles.nominalKotak}>
                <Text style={styles.nominalLabel}>Total bayar (harus persis)</Text>
                <Text style={styles.nominal}>{formatRupiah(pesanan.totalBayar)}</Text>
                <Text style={styles.nominalRincian}>
                  {topup ? 'Nominal top up' : 'Harga'} {formatRupiah(pesanan.harga)} + kode unik{' '}
                  {formatRupiah(pesanan.kodeUnik)}
                  {topup ? `. Saldo masuk ${formatRupiah(pesanan.harga)}.` : ''}
                </Text>
              </View>

              <Text style={styles.sisa}>Selesaikan dalam {formatSisa(sisaDetik)}</Text>
              <Text style={styles.catatan}>
                Kode unik {formatRupiah(pesanan.kodeUnik)} dipakai agar pembayaran Anda terdeteksi. Bayar persis sesuai total
                di atas. Jika nominal tidak otomatis terisi di aplikasi pembayaran, salin lalu isi manual.
              </Text>

              <Button
                label={tersalin ? 'Nominal tersalin' : 'Salin nominal'}
                icon="copy-outline"
                variant="soft"
                onPress={salinNominal}
                style={styles.tombol}
              />
              {topup && onChatAdmin ? (
                <Button
                  label="Sudah bayar? Chat admin"
                  icon="logo-whatsapp"
                  onPress={onChatAdmin}
                  style={styles.tombol}
                />
              ) : null}
              <Button
                label={topup ? 'Batalkan top up' : 'Batalkan pesanan'}
                variant="soft"
                onPress={batalkan}
                loading={membatalkan}
                style={styles.tombol}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  wadah: { flex: 1, justifyContent: 'flex-end' },
  latar: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(11,11,11,0.6)' },
  lembar: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  pegangan: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: t.colors.border,
    marginBottom: Spacing.lg,
  },
  judul: { fontSize: FontSize.xl, fontFamily: Font.bold, color: t.colors.textPrimary, textAlign: 'center' },
  pesan: {
    fontFamily: Font.regular,
    fontSize: FontSize.md,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  qrKotak: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  qrError: { fontFamily: Font.regular, fontSize: FontSize.sm, color: '#B00020', textAlign: 'center' },
  nominalKotak: {
    alignSelf: 'stretch',
    backgroundColor: t.colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  nominalLabel: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary },
  nominal: { fontFamily: Font.bold, fontSize: FontSize.xxl, color: t.colors.primaryDark, marginTop: 2 },
  nominalRincian: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, marginTop: 2 },
  sisa: { fontFamily: Font.semibold, fontSize: FontSize.md, color: t.colors.textPrimary, marginTop: Spacing.md },
  catatan: {
    fontFamily: Font.regular,
    fontSize: FontSize.xs,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  tombol: { alignSelf: 'stretch', marginTop: Spacing.md },
})
