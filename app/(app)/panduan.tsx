import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Accordion from '../../components/ui/Accordion'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import IconTile from '../../components/ui/IconTile'
import SectionHeader from '../../components/ui/SectionHeader'
import { BAGIAN_PANDUAN, ItemPanduan, TANYA_JAWAB_PANDUAN } from '../../constants/panduan'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../constants/theme'
import { ambilProfilSaya, ProfilSaya } from '../../lib/profil'
import { bukaBantuanWa } from '../../lib/topup'

export default function PanduanScreen() {
  const router = useRouter()
  const [profil, setProfil] = useState<ProfilSaya | null>(null)

  useEffect(() => {
    // Profil hanya dipakai untuk mengisi pesan bantuan; gagal memuatnya tidak menutup panduan
    ambilProfilSaya()
      .then(setProfil)
      .catch(() => setProfil(null))
  }, [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.hero}>
        <IconTile ikon="book-outline" warna="sky" size={52} />
        <View style={styles.heroTeks}>
          <Text style={styles.heroJudul}>Panduan AdePulsa</Text>
          <Text style={styles.heroIsi}>Kenali fitur utama, promo, dan jawaban pertanyaan yang sering muncul.</Text>
        </View>
        <Button
          label="Lihat slide pengantar"
          icon="play-circle-outline"
          variant="soft"
          size="sm"
          onPress={() => router.push('/(app)/onboarding')}
          style={styles.heroTombol}
        />
      </Card>

      {BAGIAN_PANDUAN.map((bagian) => (
        <View key={bagian.kunci}>
          <SectionHeader judul={bagian.judul} />
          <View style={styles.daftar}>
            {bagian.item.map((item, i) => (
              <Accordion
                key={item.kunci}
                judul={item.judul}
                ikon={item.ikon}
                warna={item.warna}
                terbukaAwal={bagian.kunci === 'utama' && i === 0}
              >
                <IsiPanduan item={item} />
              </Accordion>
            ))}
          </View>
        </View>
      ))}

      <View>
        <SectionHeader judul="Tanya Jawab" />
        <View style={styles.daftar}>
          {TANYA_JAWAB_PANDUAN.map((t) => (
            <Accordion key={t.tanya} judul={t.tanya}>
              <Text style={styles.isi}>{t.jawab}</Text>
            </Accordion>
          ))}
        </View>
      </View>

      <Card style={styles.bantuan}>
        <IconTile ikon="logo-whatsapp" warna="mint" size={44} />
        <View style={styles.heroTeks}>
          <Text style={styles.heroJudul}>Masih butuh bantuan?</Text>
          <Text style={styles.heroIsi}>Admin siap membantu lewat WhatsApp.</Text>
        </View>
        <Button
          label="Hubungi Admin via WhatsApp"
          icon="chatbubble-ellipses-outline"
          onPress={() => bukaBantuanWa(profil?.nama ?? null, profil?.nomor_wa ?? null)}
          style={styles.heroTombol}
        />
      </Card>
    </ScrollView>
  )
}

function IsiPanduan({ item }: { item: ItemPanduan }) {
  return (
    <>
      <Text style={styles.isi}>{item.isi}</Text>
      {item.langkah ? (
        <View style={styles.langkahDaftar}>
          {item.langkah.map((teks, i) => (
            <View key={teks} style={styles.langkahBaris}>
              <View style={styles.nomor}>
                <Text style={styles.nomorTeks}>{i + 1}</Text>
              </View>
              <Text style={styles.langkahTeks}>{teks}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 40, gap: Spacing.xl },
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md },
  bantuan: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md },
  heroTeks: { flex: 1, minWidth: 160 },
  heroJudul: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  heroIsi: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  heroTombol: { alignSelf: 'stretch', flexBasis: '100%' },
  daftar: { gap: Spacing.md },
  isi: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 21 },
  langkahDaftar: { gap: Spacing.sm },
  langkahBaris: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  nomor: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Pastel.rose.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  nomorTeks: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Pastel.rose.teks },
  langkahTeks: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 21 },
})
