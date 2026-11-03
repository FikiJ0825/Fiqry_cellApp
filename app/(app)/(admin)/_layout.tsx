import { Stack } from 'expo-router'
import { Font } from '../../../constants/theme'
import { useTheme } from '../../../lib/theme'

export default function AdminLayout() {
  const { colors } = useTheme()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen
        name="agen-detail"
        options={{
          headerShown: true,
          title: 'Detail Agen',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: Font.semibold },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="profil-admin"
        options={{
          headerShown: true,
          title: 'Profil Admin',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: Font.semibold },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  )
}
