import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import { hapusFotoProfil, pilihDanUnggahFoto } from './uploadAvatar'

/**
 * Alur ganti/hapus foto profil akun yang sedang masuk (dipakai profil agen dan profil admin).
 * `onBerubah` menerima URL foto baru, atau null bila foto dihapus.
 */
export function useFotoProfil(fotoUrl: string | null, onBerubah: (url: string | null) => void) {
  const [memuat, setMemuat] = useState(false)

  const jalankan = useCallback(
    async (aksi: () => Promise<string | null | undefined>) => {
      setMemuat(true)
      try {
        const hasil = await aksi()
        if (hasil !== undefined) onBerubah(hasil)
      } catch (e) {
        Alert.alert('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan, silakan coba lagi')
      } finally {
        setMemuat(false)
      }
    },
    [onBerubah],
  )

  const ubah = useCallback(() => {
    const ganti = () =>
      jalankan(async () => {
        const url = await pilihDanUnggahFoto(fotoUrl)
        return url === null ? undefined : url // dibatalkan -> tidak ada perubahan
      })

    if (!fotoUrl) {
      ganti()
      return
    }

    Alert.alert('Foto profil', undefined, [
      { text: 'Ganti foto', onPress: ganti },
      {
        text: 'Hapus foto',
        style: 'destructive',
        onPress: () =>
          jalankan(async () => {
            await hapusFotoProfil(fotoUrl)
            return null
          }),
      },
      { text: 'Batal', style: 'cancel' },
    ])
  }, [fotoUrl, jalankan])

  return { memuat, ubah }
}
