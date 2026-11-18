import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import IconTile from '../../components/ui/IconTile'
import { IoniconName } from '../../constants/produk'
import { Font, FontSize, PastelNama, Spacing } from '../../constants/theme'
import { ambilNotifikasi, Notifikasi, tandaiDibaca } from '../../lib/notifikasi'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import { formatWaktu } from '../../lib/transaksi'

function tampilanJenis(n: Notifikasi): { ikon: IoniconName; warna: PastelNama } {
  if (n.jenis === 'topup') return { ikon: 'wallet-outline', warna: 'mint' }
  if (n.jenis === 'saldo') return { ikon: 'cash-outline', warna: 'butter' }
  if (n.judul.toLowerCase().includes('berhasil')) return { ikon: 'checkmark-circle-outline', warna: 'mint' }
  return { ikon: 'close-circle-outline', warna: 'rose' }
}

export default function NotifikasiScreen() {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const router = useRouter()
  const [data, setData] = useState<Notifikasi[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const muat = useCallback(async (tarik = false) => {
    if (tarik) setRefreshing(true)
    setError('')
    try {
      setData(await ambilNotifikasi())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi')
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

  const belumDibaca = data.filter((n) => !n.dibaca).length

  const bukaItem = (n: Notifikasi) => {
    if (!n.dibaca) {
      setData((lama) => lama.map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)))
      tandaiDibaca(n.id).catch(() => {})
    }
    if (n.jenis === 'transaksi' && n.ref_id) router.push(`/(app)/transaksi/${n.ref_id}`)
  }

  const bacaSemua = () => {
    setData((lama) => lama.map((x) => ({ ...x, dibaca: true })))
    tandaiDibaca().catch(() => muat())
  }

  if (loading) {
    return (
      <View style={styles.tengah}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data}
      keyExtractor={(n) => n.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => muat(true)} colors={[colors.primary]} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        belumDibaca > 0 ? (
          <Pressable onPress={bacaSemua} accessibilityRole="button" style={styles.bacaSemua}>
            <Text style={styles.bacaSemuaTeks}>Tandai semua dibaca ({belumDibaca})</Text>
          </Pressable>
        ) : undefined
      }
      ListEmptyComponent={
        error ? (
          <EmptyState
            ikon="alert-circle-outline"
            judul="Notifikasi belum bisa dimuat"
            keterangan={error}
            aksiLabel="Coba Lagi"
            onAksi={() => muat()}
          />
        ) : (
          <EmptyState
            ikon="notifications-outline"
            judul="Belum ada notifikasi"
            keterangan="Info transaksi, top up, dan saldo akan muncul di sini."
          />
        )
      }
      renderItem={({ item }) => {
        const { ikon, warna } = tampilanJenis(item)
        return (
          <Pressable
            onPress={() => bukaItem(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.judul}. ${item.isi}`}
            style={({ pressed }) => pressed && styles.tekan}
          >
            <Card style={[styles.kartu, !item.dibaca && styles.kartuBaru]}>
              <IconTile ikon={ikon} warna={warna} size={44} />
              <View style={styles.teks}>
                <View style={styles.judulBaris}>
                  <Text style={styles.judul} numberOfLines={1}>
                    {item.judul}
                  </Text>
                  {!item.dibaca ? <View style={styles.titik} /> : null}
                </View>
                <Text style={styles.isi}>{item.isi}</Text>
                <Text style={styles.waktu}>{formatWaktu(item.dibuat_pada)}</Text>
              </View>
            </Card>
          </Pressable>
        )
      }}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
    />
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },
    tengah: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background },
    bacaSemua: { alignSelf: 'flex-end', paddingVertical: Spacing.sm, marginBottom: Spacing.xs },
    bacaSemuaTeks: { fontFamily: Font.semibold, fontSize: FontSize.sm, color: t.colors.accent },
    tekan: { opacity: 0.75 },
    kartu: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    kartuBaru: { borderColor: t.colors.primary },
    teks: { flex: 1 },
    judulBaris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    judul: { flexShrink: 1, fontFamily: Font.bold, fontSize: FontSize.md, color: t.colors.textPrimary },
    titik: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.primary },
    isi: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, marginTop: 2 },
    waktu: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.grey, marginTop: Spacing.xs },
  })
