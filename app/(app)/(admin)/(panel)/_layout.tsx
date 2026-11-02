import { Ionicons } from '@expo/vector-icons'
import { Tabs, router } from 'expo-router'
import { ComponentProps } from 'react'
import { Alert } from 'react-native'
import FloatingTabBar from '../../../../components/ui/FloatingTabBar'
import ScreenHeader from '../../../../components/ui/ScreenHeader'
import TombolKotak from '../../../../components/ui/TombolKotak'
import { useTheme } from '../../../../lib/theme'
import { supabase } from '../../../../lib/supabase'

type IoniconName = ComponentProps<typeof Ionicons>['name']

function ikonTab(aktif: IoniconName, nonaktif: IoniconName) {
  return function IkonTab({ focused, color, size }: { focused: boolean; color: string | unknown; size: number }) {
    return <Ionicons name={focused ? aktif : nonaktif} size={size} color={typeof color === 'string' ? color : undefined} />
  }
}

function AdminHeader({ judul }: { judul: string }) {
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
    <ScreenHeader
      judul={judul}
      keterangan="Mode Admin"
      kanan={<TombolKotak ikon="log-out-outline" label="Keluar" onPress={keluar} />}
    />
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
