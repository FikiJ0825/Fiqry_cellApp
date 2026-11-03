import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import Avatar from '../ui/Avatar'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  nama: string | null
  nomorWa: string | null
  isMaster: boolean
  fotoUrl?: string | null
  /** Bila diisi, avatar menampilkan lencana kamera dan bisa ditekan */
  onUbahFoto?: () => void
  memuatFoto?: boolean
  /** Tidak dipakai lagi (header terang tidak menimpa kartu); dipertahankan agar pemanggil lama tetap valid */
  ruangBawah?: number
}

/** Header profil bergaya tema 1: avatar foto/inisial berring, nama, nomor WhatsApp, dan lencana tier */
export default function ProfilHeader({ nama, nomorWa, isMaster, fotoUrl, onUbahFoto, memuatFoto }: Props) {
  const styles = useStyles(buatStyles)
  const { pastel } = useTheme()
  const insets = useSafeAreaInsets()
  const tierWarna = isMaster ? pastel.butter : pastel.sky

  return (
    <View style={[styles.wadah, { paddingTop: insets.top + Spacing.lg }]}>
      <Avatar nama={nama} fotoUrl={fotoUrl} ukuran={92} timbul onUbah={onUbahFoto} sedangMemuat={memuatFoto} />
      <Text style={styles.nama} numberOfLines={1}>
        {nama ?? 'Agen'}
      </Text>
      {nomorWa ? <Text style={styles.wa}>{nomorWa}</Text> : null}
      <View style={[styles.tier, { backgroundColor: tierWarna.bg }]}>
        <Ionicons name={isMaster ? 'ribbon' : 'person'} size={13} color={tierWarna.fg} />
        <Text style={[styles.tierTeks, { color: tierWarna.teks }]}>{isMaster ? 'Agen Master' : 'Agen Biasa'}</Text>
      </View>
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    wadah: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
    nama: { fontFamily: Font.bold, color: t.colors.textPrimary, fontSize: FontSize.xl, marginTop: Spacing.md },
    wa: { fontFamily: Font.regular, color: t.colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
    tier: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: Radius.full,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginTop: Spacing.md,
    },
    tierTeks: { fontFamily: Font.bold, fontSize: FontSize.xs },
  })
