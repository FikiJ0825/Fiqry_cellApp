import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Font, Radius } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  nama: string | null
  fotoUrl?: string | null
  ukuran?: number
  /** Beri lencana kamera dan panggil ini saat avatar ditekan */
  onUbah?: () => void
  sedangMemuat?: boolean
  /** Ring tebal + bayangan seperti di header profil */
  timbul?: boolean
}

/** Foto profil bulat; bila belum ada foto (atau gagal dimuat) menampilkan huruf awal nama */
export default function Avatar({ nama, fotoUrl, ukuran = 44, onUbah, sedangMemuat = false, timbul = false }: Props) {
  const styles = useStyles(buatStyles)
  const [gagal, setGagal] = useState(false)
  useEffect(() => setGagal(false), [fotoUrl])

  const inisial = (nama ?? '').trim().charAt(0).toUpperCase() || 'A'
  const tampilFoto = !!fotoUrl && !gagal
  const bulat = { width: ukuran, height: ukuran, borderRadius: Radius.full }

  const isi = (
    <View style={[styles.avatar, bulat, timbul && styles.timbul]}>
      {tampilFoto ? (
        <Image source={{ uri: fotoUrl }} style={bulat} onError={() => setGagal(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.inisial, { fontSize: Math.round(ukuran * 0.42) }]}>{inisial}</Text>
      )}
      {sedangMemuat ? (
        <View style={[styles.lapisan, bulat]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  )

  if (!onUbah) return isi

  const lencana = Math.max(22, Math.round(ukuran * 0.3))
  return (
    <Pressable onPress={onUbah} disabled={sedangMemuat} accessibilityRole="button" accessibilityLabel="Ubah foto profil">
      {isi}
      <View style={[styles.lencana, { width: lencana, height: lencana, borderRadius: lencana / 2 }]}>
        <Ionicons name="camera" size={Math.round(lencana * 0.55)} color="#FFFFFF" />
      </View>
    </Pressable>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    avatar: {
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    timbul: { borderWidth: 4, borderColor: t.colors.surface, ...t.shadow.float },
    inisial: { fontFamily: Font.bold, color: t.colors.textWhite },
    lapisan: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    lencana: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.accent,
      borderWidth: 2,
      borderColor: t.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
