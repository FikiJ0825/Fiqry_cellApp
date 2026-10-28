import { Stack } from 'expo-router'
import { Colors } from '../../constants/theme'

const headerAgen = {
  headerShown: true,
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: Colors.textWhite,
  headerTitleStyle: { fontWeight: 'bold' as const },
}

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="produk/[kategori]" options={{ ...headerAgen, title: 'Produk' }} />
      <Stack.Screen name="produk/beli" options={{ ...headerAgen, title: 'Beli Produk' }} />
      <Stack.Screen name="pin" options={{ ...headerAgen, title: 'PIN Transaksi' }} />
      <Stack.Screen name="panduan" options={{ ...headerAgen, title: 'Panduan' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  )
}
