import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import CurvedHeader from '../ui/CurvedHeader'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../constants/theme'

interface Props {
  nama: string | null
  nomorWa: string | null
  isMaster: boolean
  ruangBawah: number
}

/** Header profil: avatar inisial, nama, nomor WhatsApp, dan lencana tier */
export default function ProfilHeader({ nama, nomorWa, isMaster, ruangBawah }: Props) {
  const inisial = (nama ?? '').trim().charAt(0).toUpperCase() || 'A'
  const tierWarna = isMaster ? Pastel.butter : Pastel.sky

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

const styles = StyleSheet.create({
  tengah: { alignItems: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: Colors.textWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inisial: { color: Colors.textWhite, fontSize: FontSize.xxl + 4, fontWeight: FontWeight.bold },
  nama: { color: Colors.textWhite, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  wa: { color: Pastel.rose.bg, fontSize: FontSize.sm, marginTop: 2 },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: Spacing.md,
  },
  tierTeks: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
})
