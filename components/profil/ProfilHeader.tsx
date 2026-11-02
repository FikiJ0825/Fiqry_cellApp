import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  nama: string | null
  nomorWa: string | null
  isMaster: boolean
  /** Tidak dipakai lagi (header terang tidak menimpa kartu); dipertahankan agar pemanggil lama tetap valid */
  ruangBawah?: number
}

/** Header profil bergaya tema 1: avatar inisial berring crimson, nama, nomor WhatsApp, dan lencana tier */
export default function ProfilHeader({ nama, nomorWa, isMaster }: Props) {
  const styles = useStyles(buatStyles)
  const { pastel } = useTheme()
  const insets = useSafeAreaInsets()
  const inisial = (nama ?? '').trim().charAt(0).toUpperCase() || 'A'
  const tierWarna = isMaster ? pastel.butter : pastel.sky

  return (
    <View style={[styles.wadah, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.avatar}>
        <Text style={styles.inisial}>{inisial}</Text>
      </View>
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
    avatar: {
      width: 84,
      height: 84,
      borderRadius: Radius.full,
      backgroundColor: t.colors.primary,
      borderWidth: 4,
      borderColor: t.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadow.float,
    },
    inisial: { fontFamily: Font.bold, color: t.colors.textWhite, fontSize: FontSize.xxl + 6 },
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
