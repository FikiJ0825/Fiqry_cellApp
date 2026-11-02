import { Ionicons } from '@expo/vector-icons'
import { Tabs, router } from 'expo-router'
import { ComponentProps } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import CurvedHeader from '../../../../components/ui/CurvedHeader'
import FloatingTabBar from '../../../../components/ui/FloatingTabBar'
import { Font, FontSize, Spacing } from '../../../../constants/theme'
import { Theme, useStyles, useTheme } from '../../../../lib/theme'
import { supabase } from '../../../../lib/supabase'

type IoniconName = ComponentProps<typeof Ionicons>['name']

function ikonTab(aktif: IoniconName, nonaktif: IoniconName) {
  return function IkonTab({ focused, color, size }: { focused: boolean; color: string | unknown; size: number }) {
    return <Ionicons name={focused ? aktif : nonaktif} size={size} color={typeof color === 'string' ? color : undefined} />
  }
}

function AdminHeader({ judul }: { judul: string }) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()

  const keluar = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari mode Admin?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <CurvedHeader>
      <View style={styles.baris}>
        <View style={styles.teks}>
          <Text style={styles.judul}>{judul}</Text>
          <Text style={styles.sub}>Mode Admin</Text>
        </View>
        <Pressable
          onPress={keluar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Keluar"
          style={styles.keluar}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.textWhite} />
        </Pressable>
      </View>
    </CurvedHeader>
  )
}

const TAB_ADMIN: { name: string; judul: string; label: string; aktif: IoniconName; nonaktif: IoniconName }[] = [
  { name: 'index', judul: 'Dashboard', label: 'Dashboard', aktif: 'grid', nonaktif: 'grid-outline' },
  { name: 'agen', judul: 'Kelola Agen', label: 'Agen', aktif: 'people', nonaktif: 'people-outline' },
  { name: 'produk', judul: 'Kelola Produk', label: 'Produk', aktif: 'cube', nonaktif: 'cube-outline' },
  { name: 'transaksi', judul: 'Transaksi', label: 'Transaksi', aktif: 'receipt', nonaktif: 'receipt-outline' },
]

export default function AdminTabLayout() {
  const { colors } = useTheme()

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TAB_ADMIN.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            header: () => <AdminHeader judul={tab.judul} />,
            tabBarIcon: ikonTab(tab.aktif, tab.nonaktif),
          }}
        />
      ))}

      <Tabs.Screen name="_components/AdminPlaceholderScreen" options={{ href: null }} />
    </Tabs>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    teks: { flex: 1 },
    judul: { color: t.colors.textWhite, fontSize: FontSize.xl, fontFamily: Font.bold },
    sub: { color: t.colors.textWhite, opacity: 0.7, fontSize: FontSize.xs, fontFamily: Font.medium, marginTop: 1 },
    keluar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(245,242,237,0.14)',
    },
  })
