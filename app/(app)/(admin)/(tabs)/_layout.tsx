import { Ionicons } from '@expo/vector-icons'
import { Tabs, router } from 'expo-router'
import { ComponentProps } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors, FontSize } from '../../../../constants/theme'
import { supabase } from '../../../../lib/supabase'

type IoniconName = ComponentProps<typeof Ionicons>['name']

function AdminHeaderTitle({ title }: { title: string }) {
  return (
    <View style={styles.headerTitleWrap}>
      <Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerSubtitle}>Mode Admin</Text>
    </View>
  )
}

function TabIcon({ name, color, size }: { name: IoniconName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />
}

export default function AdminTabLayout() {
  const handleLogout = () => {
    Alert.alert("Logout", "Apakah Anda yakin ingin keluar dari mode Admin?", [
      { text: "Batal", style: "cancel" },
      { 
        text: "Keluar", 
        style: "destructive",
        onPress: () => {
          supabase.auth.signOut();
          router.replace('/(auth)/login'); 
        }
      }
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.primary,
          borderTopWidth: 2,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerStyle: {
          backgroundColor: Colors.primaryDark,
        },
        headerTintColor: Colors.textWhite,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.headerRightWrap}>
            <Ionicons name="log-out-outline" size={24} color={Colors.textWhite} />
          </TouchableOpacity> 
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          headerTitle: () => <AdminHeaderTitle title="Dashboard" />,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="grid-outline" color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="agen"
        options={{
          title: 'Agen',
          tabBarLabel: 'Agen',
          headerTitle: () => <AdminHeaderTitle title="Kelola Agen" />,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="people-outline" color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="produk"
        options={{
          title: 'Produk',
          tabBarLabel: 'Produk',
          headerTitle: () => <AdminHeaderTitle title="Kelola Produk" />,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cube-outline" color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transaksi"
        options={{
          title: 'Transaksi',
          tabBarLabel: 'Transaksi',
          headerTitle: () => <AdminHeaderTitle title="Transaksi" />,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="receipt-outline" color={String(color)} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="_components/AdminPlaceholderScreen"
        options={{ href: null }}
      />
    </Tabs>
  )
}


const styles = StyleSheet.create({
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.textWhite,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.primaryLight,
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRightWrap: {
    marginRight: 16,
    padding: 4,
  },
})

