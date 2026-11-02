import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { useEffect, useRef, useState } from 'react'
import { Animated, Keyboard, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Font, FontSize, Radius } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

const TINGGI_BAR = 68
const PAD_DALAM = 6
const MARGIN_SAMPING = 16

/**
 * Tab bar pill melayang: kotak crimson aktif meluncur antar tab (spring), ikon naik sedikit,
 * dan titik kecil muncul di bawah label. Dipakai tab Agen dan Admin.
 */
export default function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const styles = useStyles(buatStyles)
  const insets = useSafeAreaInsets()
  const [lebarDalam, setLebarDalam] = useState(0)
  const [keyboardTampil, setKeyboardTampil] = useState(false)

  // Hanya tab yang tampil (tab tersembunyi memakai options.href === null)
  const rute = state.routes
    .map((route, indexAsli) => ({ route, indexAsli }))
    .filter(({ route }) => (descriptors[route.key].options as { href?: unknown }).href !== null)
  const posisiAktif = Math.max(
    0,
    rute.findIndex((r) => r.indexAsli === state.index),
  )
  const lebarItem = rute.length > 0 ? lebarDalam / rute.length : 0

  const geser = useRef(new Animated.Value(0)).current
  const muncul = useRef(new Animated.Value(0)).current
  const sudahLayout = useRef(false)

  // Indikator meluncur ke tab aktif (langsung lompat saat pertama kali diukur)
  useEffect(() => {
    if (lebarItem === 0) return
    if (!sudahLayout.current) {
      sudahLayout.current = true
      geser.setValue(posisiAktif * lebarItem)
      return
    }
    Animated.spring(geser, {
      toValue: posisiAktif * lebarItem,
      useNativeDriver: true,
      damping: 16,
      stiffness: 190,
      mass: 0.9,
    }).start()
  }, [posisiAktif, lebarItem, geser])

  // Bar naik dari bawah saat tampil
  useEffect(() => {
    Animated.spring(muncul, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 160 }).start()
  }, [muncul, keyboardTampil])

  useEffect(() => {
    const tampil = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setKeyboardTampil(true)
    })
    const sembunyi = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      muncul.setValue(0)
      setKeyboardTampil(false)
    })
    return () => {
      tampil.remove()
      sembunyi.remove()
    }
  }, [muncul])

  // Saat keyboard terbuka, bar disembunyikan agar tidak menutupi kolom isian
  if (keyboardTampil) return null

  const onLayoutDalam = (e: LayoutChangeEvent) => setLebarDalam(e.nativeEvent.layout.width)

  return (
    <View style={[styles.wadah, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
      <Animated.View
        style={[
          styles.bar,
          {
            opacity: muncul,
            transform: [{ translateY: muncul.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <View style={styles.dalam} onLayout={onLayoutDalam}>
          {lebarItem > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.indikator, { width: lebarItem, transform: [{ translateX: geser }] }]}
            />
          ) : null}
          {rute.map(({ route, indexAsli }) => {
            const { options } = descriptors[route.key]
            const fokus = indexAsli === state.index
            const label =
              typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name)

            const onPress = () => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!fokus && !event.defaultPrevented) navigateToTab(route.key)
            }
            const onLongPress = () => {
              emitter.emit({ type: 'tabLongPress', target: route.key })
            }

            return (
              <ItemTab
                key={route.key}
                label={label}
                fokus={fokus}
                onPress={onPress}
                onLongPress={onLongPress}
                renderIkon={(color) => options.tabBarIcon?.({ focused: fokus, color, size: 22 })}
              />
            )
          })}
        </View>
      </Animated.View>
    </View>
  )
}

interface ItemProps {
  label: string
  fokus: boolean
  onPress: () => void
  onLongPress: () => void
  renderIkon: (color: string) => React.ReactNode
}

function ItemTab({ label, fokus, onPress, onLongPress, renderIkon }: ItemProps) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const aktif = useRef(new Animated.Value(fokus ? 1 : 0)).current
  const tekan = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(aktif, { toValue: fokus ? 1 : 0, useNativeDriver: true, damping: 12, stiffness: 200 }).start()
  }, [fokus, aktif])

  const warna = fokus ? colors.textWhite : colors.textSecondary

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => Animated.spring(tekan, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(tekan, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: fokus }}
      style={styles.item}
    >
      <Animated.View style={[styles.isiItem, { transform: [{ scale: tekan }] }]}>
        <Animated.View
          style={{
            transform: [
              { translateY: aktif.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) },
              { scale: aktif.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
            ],
          }}
        >
          {renderIkon(warna)}
        </Animated.View>
        <Text style={[styles.label, { color: warna }, fokus && styles.labelAktif]} numberOfLines={1}>
          {label}
        </Text>
        <Animated.View
          style={[
            styles.titik,
            { opacity: aktif, transform: [{ scale: aktif.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    // Memakai ruang tata letak nyata (bukan absolute) supaya ketukan di Android selalu diterima
    wadah: { backgroundColor: t.colors.background, paddingTop: 6, paddingHorizontal: MARGIN_SAMPING },
    bar: {
      height: TINGGI_BAR,
      borderRadius: Radius.full,
      backgroundColor: t.isDark ? '#161213' : t.colors.surface,
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(229,80,95,0.28)' : t.colors.border,
      justifyContent: 'center',
      ...t.shadow.float,
    },
    dalam: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD_DALAM, height: TINGGI_BAR - 2 },
    indikator: {
      position: 'absolute',
      left: PAD_DALAM,
      top: PAD_DALAM,
      height: TINGGI_BAR - 2 - PAD_DALAM * 2,
      borderRadius: 22,
      backgroundColor: t.colors.primary,
    },
    item: { flex: 1, height: TINGGI_BAR - 2 - PAD_DALAM * 2, alignItems: 'center', justifyContent: 'center' },
    isiItem: { alignItems: 'center', justifyContent: 'center', gap: 1 },
    label: { fontSize: FontSize.xs - 1, fontFamily: Font.medium, lineHeight: 14 },
    labelAktif: { fontFamily: Font.semibold },
    titik: { width: 4, height: 4, borderRadius: 2, backgroundColor: t.colors.textWhite, marginTop: 1 },
  })
