import { useEffect, useRef, useState } from 'react'
import { FlatList, Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Colors, Radius, Shadow } from '../constants/theme'
import type { BannerAktif } from '../lib/banner'

const GUTTER = 20
const JARAK = 12
const JEDA_PUTAR_MS = 4000
// Admin memotong gambar banner 16:9, jadi ditampilkan dengan rasio yang sama
const RASIO_TINGGI = 9 / 16

interface Props {
  banners: BannerAktif[]
  onPressBanner: (banner: BannerAktif) => void
}

function Pemisah() {
  return <View style={{ width: JARAK }} />
}

export default function BannerCarousel({ banners, onPressBanner }: Props) {
  const { width } = useWindowDimensions()
  const lebar = width - GUTTER * 2
  const tinggi = Math.round(lebar * RASIO_TINGGI)
  const listRef = useRef<FlatList<BannerAktif>>(null)
  const indexRef = useRef(0)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (banners.length < 2) return
    const timer = setInterval(() => {
      const berikutnya = (indexRef.current + 1) % banners.length
      indexRef.current = berikutnya
      listRef.current?.scrollToIndex({ index: berikutnya, animated: true })
      setIndex(berikutnya)
    }, JEDA_PUTAR_MS)
    return () => clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) return null

  return (
    <View>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        pagingEnabled={false}
        snapToInterval={lebar + JARAK}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={Pemisah}
        contentContainerStyle={styles.list}
        getItemLayout={(_, i) => ({ length: lebar + JARAK, offset: (lebar + JARAK) * i, index: i })}
        onMomentumScrollEnd={(e) => {
          const posisi = Math.round(e.nativeEvent.contentOffset.x / (lebar + JARAK))
          indexRef.current = posisi
          setIndex(posisi)
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={item.tipe_aksi === 'tidak_ada' ? 1 : 0.85}
            onPress={() => onPressBanner(item)}
            style={[styles.kartu, { width: lebar, height: tinggi }]}
          >
            <Image
              source={{ uri: item.gambar_url }}
              style={styles.gambar}
              resizeMode="cover"
              accessibilityLabel={item.judul}
            />
          </TouchableOpacity>
        )}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  // Ruang vertikal supaya bayangan kartu tidak terpotong oleh FlatList
  list: { paddingVertical: 6 },
  kartu: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
    ...Shadow.card,
  },
  gambar: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 18, backgroundColor: Colors.primary },
})
