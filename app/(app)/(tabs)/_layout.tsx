import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { ColorValue } from 'react-native'
import { IoniconName } from '../../../constants/produk'
import { Colors, FontSize, FontWeight } from '../../../constants/theme'

function ikonTab(aktif: IoniconName, nonaktif: IoniconName) {
  return function IkonTab({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? aktif : nonaktif} size={size} color={typeof color === 'string' ? color : Colors.grey} />
  }
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.grey,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textWhite,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Beranda', headerShown: false, tabBarIcon: ikonTab('home', 'home-outline') }}
      />
      <Tabs.Screen name="produk" options={{ title: 'Produk', tabBarIcon: ikonTab('grid', 'grid-outline') }} />
      <Tabs.Screen
        name="riwayat"
        options={{ title: 'Riwayat', tabBarIcon: ikonTab('receipt', 'receipt-outline') }}
      />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ikonTab('person', 'person-outline') }} />
    </Tabs>
  )
}
