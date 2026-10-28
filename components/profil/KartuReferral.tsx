import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../ui/Button'
import Card from '../ui/Card'
import IconTile from '../ui/IconTile'
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../constants/theme'

interface Props {
  kode: string | null
  onSalin: () => Promise<void>
}

const DURASI_TERSALIN_MS = 2000

export default function KartuReferral({ kode, onSalin }: Props) {
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
        <Text style={styles.kosong}>Kode referral akan muncul setelah akun Anda naik tier Master</Text>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  kartu: { gap: Spacing.md },
  judulBaris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  judul: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  kotakKode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  kode: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primaryDark, letterSpacing: 1 },
  kosong: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
})
