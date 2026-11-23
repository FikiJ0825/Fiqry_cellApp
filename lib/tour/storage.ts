import AsyncStorage from '@react-native-async-storage/async-storage'

/** Naikkan versi bila isi tur berubah banyak, supaya pengguna lama melihat tur baru sekali lagi */
const VERSI = 'v1'
const kunci = (userId: string) => `tour_selesai_${userId}_${VERSI}`

/**
 * Apakah tur sudah pernah diselesaikan / dilewati untuk akun ini.
 * Bila storage gagal dibaca, dianggap sudah supaya tur tidak muncul berulang-ulang.
 */
export async function sudahTur(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(kunci(userId))) !== null
  } catch {
    return true
  }
}

export async function tandaiTur(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(kunci(userId), '1')
  } catch {
    // abaikan: paling buruk tur tampil sekali lagi
  }
}

export async function resetTur(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(kunci(userId))
  } catch {
    // abaikan
  }
}
