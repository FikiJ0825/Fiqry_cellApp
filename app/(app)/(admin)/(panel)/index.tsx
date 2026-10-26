import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors, FontSize, Radius } from '../../../../constants/theme'
import { formatRupiah } from '../../../../lib/format'
import { supabase } from '../../../../lib/supabase'
import { awalHariIniIso } from '../../../../lib/transaksi'

interface Ringkasan {
  trxHariIni: number
  berhasil: number
  gagal: number
  omset: number
  macet: number
  agenTotal: number
  agenAktif: number
  totalSaldoAgen: number
}

export default function AdminDashboardScreen() {
  const router = useRouter()
  const [data, setData] = useState<Ringkasan | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const muat = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setErrorMessage('')

    try {
      const [hariIni, macet, agen] = await Promise.all([
        supabase
          .from('transaksi')
          .select('status, saldo_sebelum, saldo_sesudah')
          .gte('dibuat_pada', awalHariIniIso()),
        supabase.from('transaksi').select('id', { count: 'exact', head: true }).in('status', ['pending', 'diproses']),
        supabase.from('profiles').select('aktif, saldo').neq('role', 'admin'),
      ])

      const galat = hariIni.error ?? macet.error ?? agen.error
      if (galat) throw new Error(`Gagal memuat dashboard: ${galat.message}`)

      let berhasil = 0
      let gagal = 0
      let omset = 0
      for (const t of hariIni.data ?? []) {
        if (t.status === 'berhasil') {
          berhasil += 1
          omset += Number(t.saldo_sebelum) - Number(t.saldo_sesudah)
        } else if (t.status === 'gagal') {
          gagal += 1
        }
      }

      const daftarAgen = agen.data ?? []
      setData({
        trxHariIni: hariIni.data?.length ?? 0,
        berhasil,
        gagal,
        omset,
        macet: macet.count ?? 0,
        agenTotal: daftarAgen.length,
        agenAktif: daftarAgen.filter((a) => a.aktif !== false).length,
        totalSaldoAgen: daftarAgen.reduce((sum, a) => sum + Number(a.saldo ?? 0), 0),
      })
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} />}
    >
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {data ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Omset Hari Ini</Text>
            <Text style={styles.heroValue}>{formatRupiah(data.omset)}</Text>
            <Text style={styles.heroSub}>
              {data.trxHariIni} transaksi · {data.berhasil} berhasil · {data.gagal} gagal
            </Text>
          </View>

          {data.macet > 0 ? (
            <TouchableOpacity
              style={styles.alert}
              activeOpacity={0.8}
              onPress={() => router.navigate('/(app)/(admin)/(panel)/transaksi')}
            >
              <Text style={styles.alertTitle}>{data.macet} transaksi belum selesai</Text>
              <Text style={styles.alertSub}>Periksa di tab Transaksi dan tandai manual bila macet</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.row}>
            <Kartu label="Agen Aktif" nilai={`${data.agenAktif} / ${data.agenTotal}`} />
            <Kartu label="Total Saldo Agen" nilai={formatRupiah(data.totalSaldoAgen)} />
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}

function Kartu({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.kartu}>
      <Text style={styles.kartuLabel}>{label}</Text>
      <Text style={styles.kartuValue}>{nilai}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },
  hero: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 20 },
  heroLabel: { color: Colors.primaryLight, fontSize: FontSize.sm },
  heroValue: { color: Colors.textWhite, fontSize: FontSize.xxl + 4, fontWeight: 'bold', marginTop: 2 },
  heroSub: { color: Colors.primaryLight, fontSize: FontSize.sm, marginTop: 8 },
  alert: { backgroundColor: '#FFF3E0', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning, padding: 14 },
  alertTitle: { color: Colors.warning, fontSize: FontSize.md, fontWeight: '700' },
  alertSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  kartu: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  kartuLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  kartuValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
})
