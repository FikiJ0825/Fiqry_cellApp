import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { ColorValue } from 'react-native'
import FloatingTabBar from '../../../components/ui/FloatingTabBar'
import { IoniconName } from '../../../constants/produk'
import { useTheme } from '../../../lib/theme'

function ikonTab(aktif: IoniconName, nonaktif: IoniconName) {
  return function IkonTab({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? aktif : nonaktif} size={size} color={typeof color === 'string' ? color : undefined} />
  }
}

export default function TabLayout() {
  const { colors } = useTheme()

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        // Semua tab memakai header sendiri (CurvedHeader/ScreenHeader), bukan header navigator
        headerShown: false,
        // Perpindahan antar tab bergeser halus, selaras dengan indikator tab bar
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: ikonTab('home', 'home-outline') }} />
      <Tabs.Screen name="produk" options={{ title: 'Produk', tabBarIcon: ikonTab('grid', 'grid-outline') }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Riwayat', tabBarIcon: ikonTab('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ikonTab('person', 'person-outline') }} />
    </Tabs>
  )
}
