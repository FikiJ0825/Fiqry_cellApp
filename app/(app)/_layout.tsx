import { Stack } from 'expo-router'
import { View } from 'react-native'
import BantuanWa from '../../components/BantuanWa'
import NotifToast from '../../components/NotifToast'
import { Font } from '../../constants/theme'
import { useTheme } from '../../lib/theme'
import { TourProvider } from '../../lib/tour/TourProvider'

export default function AppLayout() {
  const { colors } = useTheme()

  const headerAgen = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { fontFamily: Font.semibold },
    headerShadowVisible: false,
  }

  return (
    <TourProvider>
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="produk/[kategori]" options={{ ...headerAgen, title: 'Produk' }} />
        <Stack.Screen name="produk/beli" options={{ ...headerAgen, title: 'Beli Produk' }} />
        <Stack.Screen name="transaksi/[id]" options={{ ...headerAgen, title: 'Detail Transaksi' }} />
        <Stack.Screen name="topup"options={{ ...headerAgen, title: 'Top-up Saldo' }} />
        <Stack.Screen name="pin"options={{ ...headerAgen, title: 'PIN Transaksi' }} />
        <Stack.Screen name="panduan" options={{ ...headerAgen, title: 'Panduan' }} />
        <Stack.Screen name="notifikasi" options={{ ...headerAgen, title: 'Notifikasi' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      <NotifToast />
      <BantuanWa />
    </View>
    </TourProvider>
  )
}
