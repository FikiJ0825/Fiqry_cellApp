import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import {
  formatNomorWaDisplay,
  mapSupabaseError,
  normalizeNomorWa,
} from '../../../lib/auth-utils'
import { NOMOR_WA_ADMIN } from '../../../constants/config'
import { Colors, FontSize, Radius } from '../../../constants/theme'

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

function formatRupiah(amount: number | null | undefined): string {
  const value = amount ?? 0
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatTanggalIndonesia(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getDate()} ${BULAN_INDONESIA[date.getMonth()]} ${date.getFullYear()}`
}

function getTierLabel(tier: string | null): string {
  return tier?.toLowerCase() === 'master' ? 'Master' : 'Biasa'
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        showError('Sesi tidak valid, silakan masuk kembali')
        return
      }

      const { error: insertError } = await supabase.from('klaim_bonus').insert({
        agen_id: user.id,
        jumlah,
        status: 'pending',
      })

      if (insertError) {
        showError(mapSupabaseError(insertError.message))
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ saldo_bonus_pending: 0 })
        .eq('id', user.id)

      if (updateError) {
        showError(mapSupabaseError(updateError.message))
        return
      }

      const nama = profile?.nama ?? 'Agen'
      const pesan = `Halo Admin, saya ${nama} ingin klaim bonus referral sebesar Rp${jumlah.toLocaleString('id-ID')}`
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
    Alert.alert('Kode disalin!')
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

  if (loadingProfile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Profil tidak ditemukan</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isMaster = profile.tier?.toLowerCase() === 'master'
  const isInactive = profile.aktif === false
  const bonusPending = profile.saldo_bonus_pending ?? 0
  const hasBonusPending = bonusPending > 0

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {isInactive ? (
        <View style={styles.inactiveBanner}>
          <Text style={styles.inactiveBannerText}>
            Akun nonaktif, hubungi admin
          </Text>
        </View>
      ) : null}

      <View style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>Saldo</Text>
        <Text style={styles.saldoValue}>{formatRupiah(profile.saldo)}</Text>
      </View>

      <View style={styles.tierRow}>
        <Text style={styles.sectionLabel}>Tier</Text>
        <View
          style={[
            styles.tierBadge,
            isMaster ? styles.tierBadgeMaster : styles.tierBadgeBiasa,
          ]}
        >
          <Text
            style={[
              styles.tierBadgeText,
              isMaster ? styles.tierBadgeTextMaster : styles.tierBadgeTextBiasa,
            ]}
          >
            {getTierLabel(profile.tier)}
          </Text>
        </View>
      </View>

      {errorMessage && isEditing ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isEditing ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              value={editNama}
              onChangeText={setEditNama}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nomor WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={editNomorWa}
              onChangeText={setEditNomorWa}
              placeholder="Contoh: 081234567890"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              editable={!saving}
            />
          </View>

          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.buttonSecondary, saving && styles.buttonDisabled]}
              onPress={cancelEditing}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonSecondaryText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonPrimary, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color={Colors.textWhite} size="small" />
                  <Text style={styles.buttonPrimaryText}>Menyimpan...</Text>
                </View>
              ) : (
                <Text style={styles.buttonPrimaryText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama</Text>
              <Text style={styles.infoValue}>{profile.nama ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nomor WhatsApp</Text>
              <Text style={styles.infoValue}>
                {profile.nomor_wa
                  ? formatNomorWaDisplay(profile.nomor_wa)
                  : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.referralSection}>
            <Text style={styles.sectionLabel}>Kode Referral</Text>
            {profile.kode_referral ? (
              <View style={styles.referralBox}>
                <Text style={styles.referralCode}>{profile.kode_referral}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyReferral}
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyButtonText}>Salin</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.referralPlaceholder}>
                <Text style={styles.referralPlaceholderText}>
                  Kode referral akan muncul setelah akun Anda naik tier Master
                </Text>
              </View>
            )}
          </View>

          {profile.dibuat_pada ? (
            <Text style={styles.memberSince}>
              Member sejak {formatTanggalIndonesia(profile.dibuat_pada)}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.editButton}
            onPress={startEditing}
            activeOpacity={0.8}
          >
            <Text style={styles.editButtonText}>Edit Profil</Text>
          </TouchableOpacity>
        </>
      )}

      {!isEditing && hasBonusPending ? (
        <View style={styles.bonusCard}>
          <Text style={styles.bonusTitle}>🎉 Bonus Tersedia</Text>
          <Text style={styles.bonusAmount}>{formatRupiah(bonusPending)}</Text>
          <TouchableOpacity
            style={[
              styles.bonusClaimButton,
              claimingBonus && styles.buttonDisabled,
            ]}
            onPress={handleClaimBonus}
            disabled={claimingBonus || saving || loggingOut}
            activeOpacity={0.8}
          >
            {claimingBonus ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color={Colors.textWhite} size="small" />
                <Text style={styles.bonusClaimButtonText}>Memproses...</Text>
              </View>
            ) : (
              <Text style={styles.bonusClaimButtonText}>Klaim Sekarang</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={loggingOut || saving || claimingBonus}
        activeOpacity={0.8}
      >
        {loggingOut ? (
          <ActivityIndicator color={Colors.error} size="small" />
        ) : (
          <Text style={styles.logoutButtonText}>Logout</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  inactiveBanner: {
    backgroundColor: Colors.warning,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  inactiveBannerText: {
    color: Colors.textWhite,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  saldoCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 20,
  },
  saldoLabel: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  saldoValue: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.textWhite,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  tierBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tierBadgeMaster: {
    backgroundColor: Colors.primaryLight,
  },
  tierBadgeBiasa: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tierBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  tierBadgeTextMaster: {
    color: Colors.primary,
  },
  tierBadgeTextBiasa: {
    color: Colors.textSecondary,
  },
  errorBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  referralSection: {
    marginBottom: 16,
  },
  referralBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderStyle: 'dashed',
  },
  referralCode: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 1,
    flex: 1,
  },
  copyButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  copyButtonText: {
    color: Colors.textWhite,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  referralPlaceholder: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  referralPlaceholderText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  memberSince: {
    fontSize: FontSize.xs,
    color: Colors.grey,
    textAlign: 'center',
    marginBottom: 20,
  },
  editButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  editButtonText: {
    color: Colors.textWhite,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  bonusCard: {
    backgroundColor: Colors.success,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 24,
  },
  bonusTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: 8,
  },
  bonusAmount: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.textWhite,
    marginBottom: 16,
  },
  bonusClaimButton: {
    backgroundColor: Colors.textWhite,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bonusClaimButtonText: {
    color: Colors.success,
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonSecondaryText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
})
