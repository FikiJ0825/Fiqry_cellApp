import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { PreferensiTema, Theme, useStyles, useTheme } from '../../lib/theme'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'

const PILIHAN: { nilai: PreferensiTema; label: string }[] = [
  { nilai: 'otomatis', label: 'Otomatis' },
  { nilai: 'terang', label: 'Terang' },
  { nilai: 'gelap', label: 'Gelap' },
]

/** Pilihan tampilan aplikasi: ikut HP, terang, atau gelap (disimpan di perangkat) */
export default function PilihTema() {
  const styles = useStyles(buatStyles)
  const { preferensi, setPreferensi, isDark } = useTheme()

  return (
    <Card>
      <View style={styles.kepala}>
        <IconTile ikon={isDark ? 'moon-outline' : 'sunny-outline'} warna="butter" size={40} />
        <View style={styles.teks}>
          <Text style={styles.judul}>Tampilan</Text>
          <Text style={styles.keterangan}>Pilih tema terang atau gelap</Text>
        </View>
      </View>
      <View style={styles.segmen}>
        {PILIHAN.map((p) => {
          const aktif = preferensi === p.nilai
          return (
            <Pressable
              key={p.nilai}
              onPress={() => setPreferensi(p.nilai)}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif }}
              style={[styles.pilihan, aktif && styles.pilihanAktif]}
            >
              <Text style={[styles.label, aktif && styles.labelAktif]}>{p.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </Card>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    kepala: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    teks: { flex: 1 },
    judul: { fontSize: FontSize.md, fontFamily: Font.semibold, color: t.colors.textPrimary },
    keterangan: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.textSecondary, marginTop: 2 },
    segmen: {
      flexDirection: 'row',
      marginTop: Spacing.md,
      padding: 4,
      gap: 4,
      borderRadius: Radius.full,
      backgroundColor: t.colors.surfaceAlt,
    },
    pilihan: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.full },
    pilihanAktif: { backgroundColor: t.colors.primary },
    label: { fontSize: FontSize.sm, fontFamily: Font.medium, color: t.colors.textSecondary },
    labelAktif: { color: t.colors.textWhite, fontFamily: Font.semibold },
  })
