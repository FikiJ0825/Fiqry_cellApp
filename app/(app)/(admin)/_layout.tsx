import { Stack } from 'expo-router'
import { Colors } from '../../../constants/theme'

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="agen-detail"
        options={{
          headerShown: true,
          title: 'Detail Agen',
          headerStyle: { backgroundColor: Colors.primaryDark },
          headerTintColor: Colors.textWhite,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  )
}
