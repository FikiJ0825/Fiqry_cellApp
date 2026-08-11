import { Tabs } from 'expo-router'
import { Colors } from '../../../constants/theme'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.grey,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
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
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarLabel: 'Beranda' }} />
      <Tabs.Screen name="produk" options={{ title: 'Produk', tabBarLabel: 'Produk' }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Riwayat', tabBarLabel: 'Riwayat' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarLabel: 'Profil' }} />
    </Tabs>
  )
}
