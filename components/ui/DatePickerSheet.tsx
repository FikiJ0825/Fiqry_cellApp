import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Font, FontSize, Radius, Spacing } from '../../constants/theme'
import { Theme, useStyles, useTheme } from '../../lib/theme'
import Button from './Button'

interface Props {
  visible: boolean
  judul: string
  /** Tanggal yang sedang terpilih; kosong = mulai dari hari ini */
  nilai: Date | null
  onPilih: (tanggal: Date) => void
  onTutup: () => void
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const JUMLAH_TAHUN = 12

function samaHari(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Sel kalender sebulan penuh dengan awal pekan Senin; null = sel kosong sebelum tanggal 1 */
function susunSel(tahun: number, bulan: number): (number | null)[] {
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate()
  const geser = (new Date(tahun, bulan, 1).getDay() + 6) % 7
  const sel: (number | null)[] = Array(geser).fill(null)
  for (let d = 1; d <= jumlahHari; d++) sel.push(d)
  while (sel.length % 7 !== 0) sel.push(null)
  return sel
}

/** Lembar kalender dari bawah, berwarna mengikuti tema aplikasi (bukan roda bawaan iOS yang ikut mode sistem) */
export default function DatePickerSheet({ visible, judul, nilai, onPilih, onTutup }: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [dipilih, setDipilih] = useState<Date>(nilai ?? new Date())
  const [tahunTampil, setTahunTampil] = useState(dipilih.getFullYear())
  const [bulanTampil, setBulanTampil] = useState(dipilih.getMonth())
  const [pilihTahun, setPilihTahun] = useState(false)

  // Setiap dibuka, mulai dari nilai terakhir (atau hari ini)
  useEffect(() => {
    if (!visible) return
    const awal = nilai ?? new Date()
    setDipilih(awal)
    setTahunTampil(awal.getFullYear())
    setBulanTampil(awal.getMonth())
    setPilihTahun(false)
  }, [visible, nilai])

  const sel = useMemo(() => susunSel(tahunTampil, bulanTampil), [tahunTampil, bulanTampil])
  const hariIni = new Date()
  const awalDaftarTahun = tahunTampil - Math.floor(JUMLAH_TAHUN / 2)

  const geserBulan = (arah: -1 | 1) => {
    const baru = new Date(tahunTampil, bulanTampil + arah, 1)
    setTahunTampil(baru.getFullYear())
    setBulanTampil(baru.getMonth())
  }

  const keHariIni = () => {
    const sekarang = new Date()
    setDipilih(sekarang)
    setTahunTampil(sekarang.getFullYear())
    setBulanTampil(sekarang.getMonth())
    setPilihTahun(false)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onTutup} statusBarTranslucent>
      <View style={styles.wadah}>
        <Pressable style={styles.latar} onPress={onTutup} accessibilityLabel="Tutup" />
        <View style={[styles.lembar, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.pegangan} />
          <Text style={styles.judul}>{judul}</Text>

          <View style={styles.ringkasan}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={styles.ringkasanTeks}>
              {dipilih.getDate()} {NAMA_BULAN[dipilih.getMonth()]} {dipilih.getFullYear()}
            </Text>
          </View>

          <View style={styles.navBaris}>
            <Pressable
              style={styles.navTombol}
              onPress={() => (pilihTahun ? setTahunTampil((t) => t - JUMLAH_TAHUN) : geserBulan(-1))}
              hitSlop={8}
              accessibilityLabel={pilihTahun ? 'Tahun sebelumnya' : 'Bulan sebelumnya'}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              style={styles.navJudul}
              onPress={() => setPilihTahun((v) => !v)}
              accessibilityLabel="Pilih tahun"
            >
              <Text style={styles.navJudulTeks}>
                {pilihTahun ? `${awalDaftarTahun} – ${awalDaftarTahun + JUMLAH_TAHUN - 1}` : `${NAMA_BULAN[bulanTampil]} ${tahunTampil}`}
              </Text>
              <Ionicons name={pilihTahun ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.navTombol}
              onPress={() => (pilihTahun ? setTahunTampil((t) => t + JUMLAH_TAHUN) : geserBulan(1))}
              hitSlop={8}
              accessibilityLabel={pilihTahun ? 'Tahun berikutnya' : 'Bulan berikutnya'}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {pilihTahun ? (
            <View style={styles.tahunGrid}>
              {Array.from({ length: JUMLAH_TAHUN }, (_, i) => awalDaftarTahun + i).map((t) => {
                const aktif = t === tahunTampil
                return (
                  <Pressable
                    key={t}
                    style={[styles.tahunSel, aktif && styles.selAktif]}
                    onPress={() => {
                      setTahunTampil(t)
                      setPilihTahun(false)
                    }}
                  >
                    <Text style={[styles.tahunTeks, aktif && styles.teksAktif]}>{t}</Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <>
              <View style={styles.pekan}>
                {NAMA_HARI.map((h) => (
                  <Text key={h} style={styles.namaHari}>
                    {h}
                  </Text>
                ))}
              </View>
              <View style={styles.hariGrid}>
                {sel.map((hari, i) => {
                  if (hari === null) return <View key={`kosong-${i}`} style={styles.hariSel} />
                  const tanggal = new Date(tahunTampil, bulanTampil, hari)
                  const aktif = samaHari(tanggal, dipilih)
                  const hariIniSel = samaHari(tanggal, hariIni)
                  return (
                    <Pressable key={hari} style={styles.hariSel} onPress={() => setDipilih(tanggal)}>
                      <View style={[styles.hariIsi, hariIniSel && styles.hariIni, aktif && styles.selAktif]}>
                        <Text style={[styles.hariTeks, aktif && styles.teksAktif]}>{hari}</Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}

          <Pressable onPress={keHariIni} style={styles.hariIniTombol} hitSlop={8}>
            <Text style={styles.hariIniTeks}>Ke hari ini</Text>
          </Pressable>

          <View style={styles.aksi}>
            <Button label="Batal" variant="soft" onPress={onTutup} style={styles.aksiTombol} />
            <Button label="Pilih" onPress={() => onPilih(dipilih)} style={styles.aksiTombol} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  wadah: { flex: 1, justifyContent: 'flex-end' },
  latar: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(11,11,11,0.6)' },
  lembar: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  pegangan: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: t.colors.border,
    marginBottom: Spacing.lg,
  },
  judul: { fontSize: FontSize.lg, fontFamily: Font.bold, color: t.colors.textPrimary, textAlign: 'center' },
  ringkasan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'center',
    backgroundColor: t.colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  ringkasanTeks: { fontFamily: Font.semibold, fontSize: FontSize.md, color: t.colors.primaryDark },
  navBaris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  navTombol: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navJudul: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  navJudulTeks: { fontFamily: Font.bold, fontSize: FontSize.md, color: t.colors.textPrimary },
  pekan: { flexDirection: 'row', marginBottom: Spacing.xs },
  namaHari: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: Font.semibold,
    fontSize: FontSize.xs,
    color: t.colors.textSecondary,
  },
  hariGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  hariSel: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  hariIsi: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  hariIni: { borderColor: t.colors.accent },
  selAktif: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  hariTeks: { fontFamily: Font.medium, fontSize: FontSize.md, color: t.colors.textPrimary },
  teksAktif: { color: t.colors.textWhite, fontFamily: Font.bold },
  tahunGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.sm },
  tahunSel: {
    width: '25%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  tahunTeks: { fontFamily: Font.medium, fontSize: FontSize.md, color: t.colors.textPrimary },
  hariIniTombol: { alignSelf: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  hariIniTeks: { fontFamily: Font.semibold, fontSize: FontSize.sm, color: t.colors.accent },
  aksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  aksiTombol: { flex: 1 },
})
