import { Stack } from 'expo-router'
import { Font } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="produk/[kategori]" options={{ ...headerAgen, title: 'Produk' }} />
      <Stack.Screen name="produk/beli" options={{ ...headerAgen, title: 'Beli Produk' }} />
      <Stack.Screen name="transaksi/[id]" options={{ ...headerAgen, title: 'Detail Transaksi' }} />
      <Stack.Screen name="topup"options={{ ...headerAgen, title: 'Top-up Saldo' }} />
      <Stack.Screen name="pin"options={{ ...headerAgen, title: 'PIN Transaksi' }} />
      <Stack.Screen name="panduan" options={{ ...headerAgen, title: 'Panduan' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  )
}
