import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { Colors } from '../constants/theme'
import { supabase } from '../lib/supabase'

type UserRole = 'admin' | 'agen'

interface ProfileRoleRow {
  role: UserRole | null
}

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single<ProfileRoleRow>()

  if (error || !data?.role) {
    return 'agen'
  }

  return data.role === 'admin' ? 'admin' : 'agen'
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(currentSession)

      if (currentSession) {
        const userRole = await fetchUserRole(currentSession.user.id)
        if (mounted) setRole(userRole)
      } else {
        setRole(null)
      }

      if (mounted) setLoading(false)
    }

    void initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)

      if (nextSession) {
        const userRole = await fetchUserRole(nextSession.user.id)
        setRole(userRole)
      } else {
        setRole(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (session && role === null) return

    const inAuthGroup = segments[0] === '(auth)'
    const inAdminGroup = segments.includes('(admin)')
    const inTabsGroup = segments.includes('(tabs)')

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
      return
    }

    if (!session) return

    if (inAuthGroup) {
      router.replace(role === 'admin' ? '/(app)/(admin)' : '/(app)/(tabs)')
      return
    }

    if (role === 'admin' && inTabsGroup) {
      router.replace('/(app)/(admin)')
      return
    }

    if (role !== 'admin' && inAdminGroup) {
      router.replace('/(app)/(tabs)')
    }
  }, [session, role, loading, segments, router])

  const isResolvingRole = session !== null && role === null

  if (loading || isResolvingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return <Slot />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
})
