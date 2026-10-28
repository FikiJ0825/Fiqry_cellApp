import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import KartuBonus from '../../../components/profil/KartuBonus'
import KartuReferral from '../../../components/profil/KartuReferral'
import MenuList from '../../../components/profil/MenuList'
import ProfilHeader from '../../../components/profil/ProfilHeader'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import Input from '../../../components/ui/Input'
import Loading from '../../../components/ui/Loading'
import { NOMOR_WA_ADMIN } from '../../../constants/config'
import { Colors, FontSize, FontWeight, Pastel, Radius, Spacing } from '../../../constants/theme'
import { formatNomorWaDisplay, mapSupabaseError, normalizeNomorWa } from '../../../lib/auth-utils'
import { formatRupiah } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import { bukaTopupWa } from '../../../lib/topup'

type Profile = {
  nama: string | null
  nomor_wa: string | null
  saldo: number | null
  saldo_bonus_pending: number | null
  tier: string | null
  aktif: boolean | null
  dibuat_pada: string | null
  kode_referral: string | null
}

const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const TINGGI_TUMPANG_TINDIH = 44

function formatTanggalIndonesia(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getDate()} ${BULAN_INDONESIA[date.getMonth()]} ${date.getFullYear()}`
}

export default function ProfilScreen() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editNama, setEditNama] = useState('')
  const [editNomorWa, setEditNomorWa] = useState('')
  const [saving, setSaving] = useState(false)
  const [claimingBonus, setClaimingBonus] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const showError = (message: string) => {
    setErrorMessage(message)
    Alert.alert('Gagal', message)
  }

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true)
    setErrorMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        showError('Sesi tidak valid, silakan masuk kembali')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'nama, nomor_wa, saldo, saldo_bonus_pending, tier, aktif, dibuat_pada, kode_referral',
        )
        .eq('id', user.id)
        .single()

      if (error) {
        showError(mapSupabaseError(error.message))
        return
      }

      setProfile(data)
    } catch {
      showError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchProfile()
    }, [fetchProfile]),
  )

  const startEditing = () => {
    if (!profile) return

    setEditNama(profile.nama ?? '')
    setEditNomorWa(
      profile.nomor_wa ? formatNomorWaDisplay(profile.nomor_wa) : '',
    )
    setErrorMessage('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setErrorMessage('')
  }

  const performSave = async (trimmedNama: string, normalizedWa: string, waChanged: boolean) => {
    setSaving(true)
    setErrorMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        showError('Sesi tidak valid, silakan masuk kembali')
        return
      }

      if (waChanged) {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('nomor_wa', normalizedWa)
          .neq('id', user.id)
          .maybeSingle()

        if (checkError) {
          showError(mapSupabaseError(checkError.message))
          return
        }

        if (existingProfile) {
          showError('Nomor WhatsApp sudah digunakan akun lain')
          return
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nama: trimmedNama,
          nomor_wa: normalizedWa,
        })
        .eq('id', user.id)

      if (updateError) {
        showError(mapSupabaseError(updateError.message))
        return
      }

      await fetchProfile()
      setIsEditing(false)

      Alert.alert('Berhasil', 'Profil berhasil diperbarui')
    } catch {
      showError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    if (!profile) return

    setErrorMessage('')

    const trimmedNama = editNama.trim()
    const trimmedNomorWa = editNomorWa.trim()

    if (!trimmedNama) {
      showError('Nama lengkap wajib diisi')
      return
    }

    if (!trimmedNomorWa) {
      showError('Nomor WhatsApp wajib diisi')
      return
    }

    const normalizedWa = normalizeNomorWa(trimmedNomorWa)

    if (!normalizedWa || normalizedWa.length < 10) {
      showError('Nomor WhatsApp tidak valid')
      return
    }

    const waChanged = normalizedWa !== (profile.nomor_wa ?? '')

    if (waChanged) {
      const displayNewWa = formatNomorWaDisplay(normalizedWa)

      Alert.alert(
        'Konfirmasi Ubah Nomor',
        `Nomor WhatsApp akan diubah menjadi ${displayNewWa}. Pastikan nomor ini aktif untuk transaksi pulsa/paket data. Lanjutkan?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Lanjutkan',
            onPress: () => performSave(trimmedNama, normalizedWa, true),
          },
        ],
      )
      return
    }

    performSave(trimmedNama, normalizedWa, false)
  }

  const performClaimBonus = async (jumlah: number) => {
    setClaimingBonus(true)
    setErrorMessage('')

    try {
      // Atomik di server: kunci baris, buat klaim, kosongkan bonus, kembalikan jumlah yang diklaim.
      // Jumlah dari server dipakai untuk pesan WA, bukan nilai lokal yang bisa sudah usang.
      const { data: jumlahDiklaim, error: rpcError } = await supabase.rpc('klaim_bonus_referral')

      if (rpcError) {
        showError(mapSupabaseError(rpcError.message))
        await fetchProfile()
        return
      }

      const nominal = Number(jumlahDiklaim ?? jumlah)
      const nama = profile?.nama ?? 'Agen'
      const pesan = `Halo Admin, saya ${nama} ingin klaim bonus referral sebesar Rp${nominal.toLocaleString('id-ID')}`
      await Linking.openURL(
        `https://wa.me/${NOMOR_WA_ADMIN}?text=${encodeURIComponent(pesan)}`,
      )

      await fetchProfile()
    } catch {
      showError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setClaimingBonus(false)
    }
  }

  const handleClaimBonus = () => {
    if (!profile) return

    const jumlah = profile.saldo_bonus_pending ?? 0
    if (jumlah <= 0) return

    Alert.alert(
      'Klaim Bonus',
      `Klaim bonus sebesar ${formatRupiah(jumlah)}? Kamu akan diarahkan ke WhatsApp Admin untuk proses lebih lanjut.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Klaim',
          onPress: () => performClaimBonus(jumlah),
        },
      ],
    )
  }

  const handleCopyReferral = async () => {
    if (!profile?.kode_referral) return

    await Clipboard.setStringAsync(profile.kode_referral)
  }

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, Keluar',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          try {
            await supabase.auth.signOut()
            router.replace('/(auth)/login')
          } catch {
            showError('Gagal keluar, silakan coba lagi')
          } finally {
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  if (loadingProfile) return <Loading />

  if (!profile) {
    return (
      <View style={styles.pusat}>
        <EmptyState
          ikon="person-circle-outline"
          judul="Profil tidak ditemukan"
          keterangan={errorMessage || undefined}
          aksiLabel="Coba Lagi"
          onAksi={fetchProfile}
        />
      </View>
    )
  }

  const isMaster = profile.tier?.toLowerCase() === 'master'
  const isInactive = profile.aktif === false
  const bonusPending = profile.saldo_bonus_pending ?? 0
  const hasBonusPending = bonusPending > 0

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfilHeader
          nama={profile.nama}
          nomorWa={profile.nomor_wa ? formatNomorWaDisplay(profile.nomor_wa) : null}
          isMaster={isMaster}
          ruangBawah={TINGGI_TUMPANG_TINDIH + Spacing.xl}
        />

        <View style={styles.saldoWrap}>
          <Card>
            <Text style={styles.saldoLabel}>Saldo</Text>
            <Text style={styles.saldoValue}>{formatRupiah(profile.saldo)}</Text>
            {profile.dibuat_pada ? (
              <Text style={styles.memberSince}>Member sejak {formatTanggalIndonesia(profile.dibuat_pada)}</Text>
            ) : null}
          </Card>
        </View>

        <View style={styles.body}>
          {isInactive ? (
            <View style={styles.nonaktif}>
              <Ionicons name="warning" size={18} color={Pastel.butter.teks} />
              <Text style={styles.nonaktifTeks}>Akun nonaktif, hubungi admin</Text>
            </View>
          ) : null}

          {isEditing ? (
            <Card style={styles.form}>
              <Text style={styles.formJudul}>Edit Profil</Text>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Input
                label="Nama Lengkap"
                ikon="person-outline"
                value={editNama}
                onChangeText={setEditNama}
                placeholder="Masukkan nama lengkap"
                autoCapitalize="words"
                editable={!saving}
              />
              <Input
                label="Nomor WhatsApp"
                ikon="logo-whatsapp"
                value={editNomorWa}
                onChangeText={setEditNomorWa}
                placeholder="Contoh: 081234567890"
                keyboardType="phone-pad"
                editable={!saving}
              />

              <View style={styles.formAksi}>
                <Button label="Batal" variant="outline" onPress={cancelEditing} disabled={saving} style={styles.formTombol} />
                <Button label="Simpan" onPress={handleSave} loading={saving} style={styles.formTombol} />
              </View>
            </Card>
          ) : (
            <>
              <Card style={styles.info}>
                <View style={styles.infoBaris}>
                  <Text style={styles.infoLabel}>Nama</Text>
                  <Text style={styles.infoNilai}>{profile.nama ?? '-'}</Text>
                </View>
                <View style={styles.garis} />
                <View style={styles.infoBaris}>
                  <Text style={styles.infoLabel}>Nomor WhatsApp</Text>
                  <Text style={styles.infoNilai}>
                    {profile.nomor_wa ? formatNomorWaDisplay(profile.nomor_wa) : '-'}
                  </Text>
                </View>
                <Button label="Edit Profil" icon="create-outline" variant="outline" size="sm" onPress={startEditing} />
              </Card>

              {hasBonusPending ? (
                <KartuBonus
                  jumlah={bonusPending}
                  memproses={claimingBonus}
                  nonaktif={claimingBonus || saving || loggingOut}
                  onKlaim={handleClaimBonus}
                />
              ) : null}

              <KartuReferral kode={profile.kode_referral} onSalin={handleCopyReferral} />
            </>
          )}

          <MenuList
            item={[
              {
                kunci: 'topup',
                ikon: 'wallet-outline',
                warna: 'mint',
                judul: 'Top-up Saldo',
                keterangan: 'Lewat WhatsApp Admin',
                onPress: () => bukaTopupWa(profile.nama, profile.nomor_wa),
              },
              {
                kunci: 'pin',
                ikon: 'lock-closed-outline',
                warna: 'sky',
                judul: 'PIN Transaksi',
                keterangan: 'Buat atau ubah PIN 6 digit',
                onPress: () => router.push('/(app)/pin'),
              },
              {
                kunci: 'panduan',
                ikon: 'book-outline',
                warna: 'lilac',
                judul: 'Panduan',
                keterangan: 'Cara memakai AdePulsa',
                onPress: () => router.push('/(app)/panduan'),
              },
            ]}
          />

          <Button
            label="Keluar"
            icon="log-out-outline"
            variant="danger"
            onPress={handleLogout}
            loading={loggingOut}
            disabled={saving || claimingBonus}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },
  pusat: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  saldoWrap: { marginTop: -TINGGI_TUMPANG_TINDIH, marginHorizontal: Spacing.xl },
  saldoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  saldoValue: { fontSize: FontSize.xxl + 4, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 2 },
  memberSince: { fontSize: FontSize.xs, color: Colors.grey, marginTop: Spacing.sm },
  body: { padding: Spacing.xl, gap: Spacing.lg },
  nonaktif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Pastel.butter.bg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  nonaktifTeks: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Pastel.butter.teks },
  info: { gap: Spacing.md },
  infoBaris: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  infoLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  infoNilai: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'right' },
  garis: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  form: { gap: Spacing.lg },
  formJudul: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  formAksi: { flexDirection: 'row', gap: Spacing.md },
  formTombol: { flex: 1 },
  errorBox: { backgroundColor: Pastel.rose.bg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: Pastel.rose.teks, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'center' },
})
