import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Font, FontSize, Radius, Spacing } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { Theme, useStyles, useTheme } from '../lib/theme'

interface Baris {
  judul: string
  isi: string
}

const LAMA_TAMPIL_MS = 4500

/**
 * Spanduk kecil di atas layar saat notifikasi baru masuk (aplikasi sedang terbuka).
 * Dipasang sekali di layout (app); mendengarkan INSERT tabel notifikasi milik pengguna lewat Realtime.
 */
export default function NotifToast() {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [userId, setUserId] = useState<string | null>(null)
  const [baris, setBaris] = useState<Baris | null>(null)
  const geser = useRef(new Animated.Value(-160)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let aktif = true
    supabase.auth.getUser().then(({ data }) => {
      if (aktif) setUserId(data.user?.id ?? null)
    })
    return () => {
      aktif = false
    }
  }, [])

  const sembunyikan = () => {
    if (timer.current) clearTimeout(timer.current)
    Animated.timing(geser, { toValue: -160, duration: 220, useNativeDriver: true }).start(() => setBaris(null))
  }

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notif-toast-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `agen_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as { judul?: string; isi?: string }
          setBaris({ judul: n.judul ?? 'Notifikasi baru', isi: n.isi ?? '' })
          Animated.spring(geser, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(sembunyikan, LAMA_TAMPIL_MS)
        },
      )
      .subscribe()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
    // sembunyikan hanya memakai ref/animated value yang stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (!baris) return null

  return (
    <View pointerEvents="box-none" style={[styles.lapisan, { paddingTop: insets.top + Spacing.sm }]}>
      <Animated.View style={{ transform: [{ translateY: geser }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifikasi: ${baris.judul}. ${baris.isi}`}
          onPress={() => {
            sembunyikan()
            router.push('/(app)/notifikasi')
          }}
          style={styles.kartu}
        >
          <Ionicons name="notifications" size={22} color={colors.primary} />
          <View style={styles.teks}>
            <Text style={styles.judul} numberOfLines={1}>
              {baris.judul}
            </Text>
            <Text style={styles.isi} numberOfLines={2}>
              {baris.isi}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    lapisan: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, zIndex: 50 },
    kartu: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: Spacing.md,
      ...t.shadow.card,
    },
    teks: { flex: 1 },
    judul: { fontFamily: Font.bold, fontSize: FontSize.md, color: t.colors.textPrimary },
    isi: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, marginTop: 2 },
  })
