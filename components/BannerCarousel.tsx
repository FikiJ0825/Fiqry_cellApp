import { useEffect, useRef, useState } from 'react'
import { FlatList, Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Colors, Radius } from '../constants/theme'
import type { BannerAktif } from '../lib/banner'

const GUTTER = 20
const JEDA_PUTAR_MS = 4000

interface Props {
  banners: BannerAktif[]
  onPressBanner: (banner: BannerAktif) => void
}

export default function BannerCarousel({ banners, onPressBanner }: Props) {
  const { width } = useWindowDimensions()
  const lebar = width - GUTTER * 2
  const tinggi = Math.round(lebar * 0.45)
  const listRef = useRef<FlatList<BannerAktif>>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (banners.length < 2) return
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % banners.length
        listRef.current?.scrollToIndex({ index: next, animated: true })
        return next
      })
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
        snapToInterval={lebar + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        getItemLayout={(_, i) => ({ length: lebar + 12, offset: (lebar + 12) * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (lebar + 12)))}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={item.tipe_aksi === 'tidak_ada' ? 1 : 0.85}
            onPress={() => onPressBanner(item)}
          >
            <Image
              source={{ uri: item.gambar_url }}
              style={{ width: lebar, height: tinggi, borderRadius: Radius.lg, backgroundColor: Colors.surface }}
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
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 18, backgroundColor: Colors.primary },
})
