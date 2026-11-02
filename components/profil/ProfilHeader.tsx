import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import CurvedHeader from '../ui/CurvedHeader'
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props {
  nama: string | null
  nomorWa: string | null
  isMaster: boolean
  ruangBawah: number
}

/** Header profil: avatar inisial, nama, nomor WhatsApp, dan lencana tier */
export default function ProfilHeader({ nama, nomorWa, isMaster, ruangBawah }: Props) {
  const styles = useStyles(buatStyles)
  const { pastel } = useTheme()
  const inisial = (nama ?? '').trim().charAt(0).toUpperCase() || 'A'
  const tierWarna = isMaster ? pastel.butter : pastel.sky

  return (
    <CurvedHeader ruangBawah={ruangBawah}>
      <View style={styles.tengah}>
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
    </CurvedHeader>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  tengah: { alignItems: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: t.colors.textWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inisial: { color: t.colors.textWhite, fontSize: FontSize.xxl + 4, fontFamily: Font.bold },
  nama: { color: t.colors.textWhite, fontSize: FontSize.xl, fontFamily: Font.bold, marginTop: Spacing.md },
  wa: { fontFamily: Font.regular, color: t.pastel.rose.bg, fontSize: FontSize.sm, marginTop: 2 },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: Spacing.md,
  },
  tierTeks: { fontSize: FontSize.xs, fontFamily: Font.bold },
})
