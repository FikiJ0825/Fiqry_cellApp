import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { LangkahTour } from '../../constants/tour'
import { s } from '../../lib/skala'
import { Theme, useStyles } from '../../lib/theme'
import Button from '../ui/Button'

export const UKURAN_PANAH = 14

interface Props {
  langkah: LangkahTour
  index: number
  total: number
  lebar: number
  /** Sisi kartu tempat panah berada: 'atas' = tooltip di bawah target */
  panah: 'atas' | 'bawah'
  /** Jarak panah dari tepi kiri kartu */
  panahX: number
  onLayoutKartu: (e: LayoutChangeEvent) => void
  onBerikutnya: () => void
  onKembali: () => void
  onLewati: () => void
}

/** Kartu tooltip: judul, deskripsi, indikator langkah (dot + "1/4"), Lewati / Kembali / Lanjut-Selesai */
export default function TourTooltip({
  langkah,
  index,
  total,
  lebar,
  panah,
  panahX,
  onLayoutKartu,
  onBerikutnya,
  onKembali,
  onLewati,
}: Props) {
  const styles = useStyles(buatStyles)
  const pertama = index === 0
  const terakhir = index === total - 1

  return (
    <View style={[styles.kartu, { width: lebar }]} onLayout={onLayoutKartu} accessibilityViewIsModal>
      <View
        style={[
          styles.panah,
          panah === 'atas' ? styles.panahAtas : styles.panahBawah,
          { left: panahX },
        ]}
      />

      <View style={styles.atas}>
        <View style={styles.indikator} accessible accessibilityLabel={`Langkah ${index + 1} dari ${total}`}>
          <View style={styles.dot}>
            {Array.from({ length: total }, (_, i) => (
              <View key={i} style={[styles.titik, i === index && styles.titikAktif, i < index && styles.titikLewat]} />
            ))}
          </View>
          <Text style={styles.hitung}>
            {index + 1}/{total}
          </Text>
        </View>
        {!terakhir ? (
          <Pressable
            onPress={onLewati}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Lewati tur"
            style={({ pressed }) => pressed && styles.tekan}
          >
            <Text style={styles.lewati}>Lewati</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.judul} accessibilityRole="header">
        {langkah.judul}
      </Text>
      <Text style={styles.deskripsi}>{langkah.deskripsi}</Text>

      <View style={styles.tombol}>
        {!pertama ? <Button label="Kembali" variant="soft" size="sm" onPress={onKembali} style={styles.tombolItem} /> : null}
        <Button
          label={terakhir ? 'Selesai' : 'Lanjut'}
          size="sm"
          onPress={onBerikutnya}
          style={styles.tombolItem}
        />
      </View>
    </View>
  )
}

const buatStyles = (t: Theme) =>
  StyleSheet.create({
    kartu: {
      backgroundColor: t.colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: Spacing.lg,
      ...t.shadow.float,
    },
    panah: {
      position: 'absolute',
      width: UKURAN_PANAH,
      height: UKURAN_PANAH,
      backgroundColor: t.colors.surface,
      borderColor: t.colors.border,
      transform: [{ rotate: '45deg' }],
    },
    panahAtas: { top: -UKURAN_PANAH / 2 - 1, borderLeftWidth: 1, borderTopWidth: 1 },
    panahBawah: { bottom: -UKURAN_PANAH / 2 - 1, borderRightWidth: 1, borderBottomWidth: 1 },
    atas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    indikator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    titik: { width: s(6), height: s(6), borderRadius: s(3), backgroundColor: t.colors.border },
    titikLewat: { backgroundColor: t.colors.primaryDark, opacity: 0.45 },
    titikAktif: { width: s(18), backgroundColor: t.colors.primary },
    hitung: { fontFamily: Font.semibold, fontSize: FontSize.xs, color: t.colors.textSecondary },
    lewati: { fontFamily: Font.semibold, fontSize: FontSize.sm, color: t.colors.accent },
    tekan: { opacity: 0.6 },
    judul: { fontFamily: Font.bold, fontSize: FontSize.lg, color: t.colors.textPrimary },
    deskripsi: {
      fontFamily: Font.regular,
      fontSize: FontSize.sm,
      lineHeight: Math.round(FontSize.sm * 1.5),
      color: t.colors.textSecondary,
      marginTop: Spacing.xs,
    },
    tombol: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
    tombolItem: { flex: 1 },
  })
