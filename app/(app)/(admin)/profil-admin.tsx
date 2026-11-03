import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import PilihTema from '../../../components/profil/PilihTema'
import Avatar from '../../../components/ui/Avatar'
import Button from '../../../components/ui/Button'
import Screen from '../../../components/ui/Screen'
import { Font, FontSize, Spacing } from '../../../constants/theme'
import { formatNomorWaDisplay } from '../../../lib/auth-utils'
import { supabase } from '../../../lib/supabase'
import { Theme, useStyles } from '../../../lib/theme'
import { useFotoProfil } from '../../../lib/useFotoProfil'

interface ProfilAdmin {
  nama: string | null
  nomor_wa: string | null
  foto_url: string | null
}

export default function ProfilAdminScreen() {
  const styles = useStyles(buatStyles)
  const [profil, setProfil] = useState<ProfilAdmin | null>(null)

  useEffect(() => {
    let batal = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('nama, nomor_wa, foto_url').eq('id', user.id).single()
      if (!batal && data) setProfil(data as ProfilAdmin)
    })()
    return () => {
      batal = true
    }
  }, [])

  const { memuat, ubah } = useFotoProfil(
    profil?.foto_url ?? null,
    useCallback((url: string | null) => setProfil((p) => (p ? { ...p, foto_url: url } : p)), []),
  )

  const keluar = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari mode Admin?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.atas}>
          <Avatar
            nama={profil?.nama ?? 'Admin'}
            fotoUrl={profil?.foto_url}
            ukuran={104}
            timbul
            onUbah={ubah}
            sedangMemuat={memuat}
          />
          <Text style={styles.nama}>{profil?.nama ?? 'Admin'}</Text>
          {profil?.nomor_wa ? <Text style={styles.sub}>{formatNomorWaDisplay(profil.nomor_wa)}</Text> : null}
          <Text style={styles.petunjuk}>Ketuk foto untuk mengganti atau menghapus</Text>
        </View>

        <PilihTema />

        <View style={styles.keluar}>
          <Button label="Keluar" icon="log-out-outline" variant="danger" onPress={keluar} />
        </View>
      </ScrollView>
    </Screen>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },
    atas: { alignItems: 'center', paddingTop: Spacing.md },
    nama: { fontFamily: Font.bold, fontSize: FontSize.xl, color: t.colors.textPrimary, marginTop: Spacing.md },
    sub: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, marginTop: 2 },
    petunjuk: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, marginTop: Spacing.sm },
    keluar: { marginTop: Spacing.sm },
  })
