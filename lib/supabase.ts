import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = 'https://clbinerltxwxobbtxfad.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYmluZXJsdHh3eG9iYnR4ZmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTg4MTgsImV4cCI6MjA5NzE3NDgxOH0.0hcq-Q02I488p5rH8PoJteY5iZN8mKWYLr3h_GCQxo0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
