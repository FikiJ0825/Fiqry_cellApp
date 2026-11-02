import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../ui/Button'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  kode: string | null
  onSalin: () => Promise<void>
}

const DURASI_TERSALIN_MS = 2000

export default function KartuReferral({ kode, onSalin }: Props) {
  const styles = useStyles(buatStyles)
  const [tersalin, setTersalin] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const salin = async () => {
    await onSalin()
    setTersalin(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setTersalin(false), DURASI_TERSALIN_MS)
  }

  return (
    <Card style={styles.kartu}>
      <View style={styles.judulBaris}>
        <IconTile ikon="gift-outline" warna="peach" size={40} />
        <Text style={styles.judul}>Kode Referral</Text>
      </View>
      {kode ? (
        <View style={styles.kotakKode}>
          <Text style={styles.kode} selectable>
            {kode}
          </Text>
          <Button
            label={tersalin ? 'Tersalin' : 'Salin'}
            icon={tersalin ? 'checkmark' : 'copy-outline'}
            variant="soft"
            size="sm"
            onPress={salin}
          />
        </View>
      ) : (
        <Text style={styles.kosong}>Kode referral Anda belum tersedia. Hubungi admin jika kode tidak muncul.</Text>
      )}
    </Card>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  kartu: { gap: Spacing.md },
  judulBaris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  judul: { fontSize: FontSize.md, fontFamily: Font.bold, color: t.colors.textPrimary },
  kotakKode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.accent,
    borderRadius: Radius.md,
    backgroundColor: t.colors.background,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  kode: { flex: 1, fontSize: FontSize.lg, fontFamily: Font.bold, color: t.colors.primaryDark, letterSpacing: 1 },
  kosong: { fontFamily: Font.regular, fontSize: FontSize.sm, color: t.colors.textSecondary, lineHeight: 20 },
})
