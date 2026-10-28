import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Card from './ui/Card'
import IconTile from './ui/IconTile'
import { getKategoriLabel, KategoriProduk, TAMPILAN_KATEGORI } from '../constants/produk'
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme'
import { formatRupiah } from '../lib/format'

interface Props {
  nama: string
  kode: string
  harga: number
  kategori?: string | null
  /** Tampilkan nama kategori di bawah nama produk (dipakai di hasil pencarian) */
  tampilKategori?: boolean
  onPress: () => void
}

export default function ProdukBaris({ nama, kode, harga, kategori, tampilKategori = false, onPress }: Props) {
  const tampilan = kategori ? TAMPILAN_KATEGORI[kategori as KategoriProduk] : undefined

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${nama}, ${formatRupiah(harga)}`}>
      {({ pressed }) => (
        <Card style={[styles.baris, pressed && styles.tekan]}>
          <IconTile ikon={tampilan?.ikon ?? 'cube-outline'} warna={tampilan?.warna ?? 'rose'} size={44} />
          <View style={styles.teks}>
            <Text style={styles.nama} numberOfLines={2}>
              {nama}
            </Text>
            <Text style={styles.kode} numberOfLines={1}>
              {tampilKategori ? `${getKategoriLabel(kategori)} · ${kode}` : kode}
            </Text>
          </View>
          <Text style={styles.harga}>{formatRupiah(harga)}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.grey} />
        </Card>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  tekan: { opacity: 0.75 },
  teks: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  kode: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  harga: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primaryDark },
})
