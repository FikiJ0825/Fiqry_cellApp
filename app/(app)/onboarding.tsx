import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../../components/ui/Button'
import Screen from '../../components/ui/Screen'
import IconTile from '../../components/ui/IconTile'
import { SLIDE_SAMBUTAN, SlideSambutan } from '../../constants/panduan'
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { tandaiOnboarding } from '../../lib/onboarding'
import { supabase } from '../../lib/supabase'
import { Theme, useStyles, useTheme } from '../../lib/theme'

export default function OnboardingScreen() {
  const styles = useStyles(buatStyles)
  const router = useRouter()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const listRef = useRef<FlatList<SlideSambutan>>(null)
  const [index, setIndex] = useState(0)

  // Ditandai saat slide dibuka (bukan saat selesai): tombol Back tidak boleh membuat slide muncul berulang
  useEffect(() => {
    let batal = false
    supabase.auth.getUser().then(({ data }) => {
      if (!batal && data.user) void tandaiOnboarding(data.user.id)
    })
    return () => {
      batal = true
    }
  }, [])

  const terakhir = index === SLIDE_SAMBUTAN.length - 1

  const lanjut = () => {
    if (terakhir) {
      router.back()
      return
    }
    const berikutnya = index + 1
    listRef.current?.scrollToIndex({ index: berikutnya, animated: true })
    setIndex(berikutnya)
  }

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={SLIDE_SAMBUTAN}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.kunci}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <LinearGradient
              colors={[colors.heroFrom, colors.heroTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + Spacing.xxl }]}
            >
              <View style={styles.ilustrasi}>
                <View style={styles.cincin}>
                  <IconTile ikon={item.ikon} warna={item.warna} size={120} />
                </View>
              </View>
            </LinearGradient>
            <View style={styles.teksWrap}>
              <Text style={styles.judul}>{item.judul}</Text>
              <Text style={styles.isi}>{item.isi}</Text>
            </View>
          </View>
        )}
      />

      {!terakhir ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          style={[styles.lewati, { top: insets.top + Spacing.md }]}
        >
          <Text style={styles.lewatiTeks}>Lewati</Text>
        </Pressable>
      ) : null}

      <View style={[styles.kontrol, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.titikBaris}>
          {SLIDE_SAMBUTAN.map((s, i) => (
            <View key={s.kunci} style={[styles.titik, i === index && styles.titikAktif]} />
          ))}
        </View>
        <Button label={terakhir ? 'Mulai Sekarang' : 'Lanjut'} onPress={lanjut} />
      </View>
    </Screen>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  hero: {
    paddingBottom: Spacing.xxl * 2,
    borderBottomLeftRadius: Radius.xl + 4,
    borderBottomRightRadius: Radius.xl + 4,
    overflow: 'hidden',
  },
  ilustrasi: { alignItems: 'center', paddingTop: Spacing.xxl },
  cincin: {
    width: 176,
    height: 176,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teksWrap: { paddingHorizontal: Spacing.xxl + Spacing.sm, marginTop: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  judul: { fontSize: FontSize.xxl, fontFamily: Font.bold, color: t.colors.textPrimary, textAlign: 'center' },
  isi: { fontFamily: Font.regular, fontSize: FontSize.md, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 23 },
  lewati: { position: 'absolute', right: Spacing.xl },
  lewatiTeks: { color: t.colors.onHeader, fontSize: FontSize.md, fontFamily: Font.semibold },
  kontrol: { paddingHorizontal: Spacing.xl, gap: Spacing.xl },
  titikBaris: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  titik: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.border },
  titikAktif: { width: 18, backgroundColor: t.colors.primary },
})
