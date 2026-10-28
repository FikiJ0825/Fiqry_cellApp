import AsyncStorage from '@react-native-async-storage/async-storage'

const kunci = (userId: string) => `onboarding_selesai_${userId}`

/**
 * Apakah slide sambutan sudah pernah ditampilkan untuk akun ini.
 * Kalau storage gagal dibaca, dianggap sudah supaya agen tidak diarahkan ke slide berulang kali.
 */
export async function sudahOnboarding(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(kunci(userId))) !== null
  } catch {
    return true
  }
}

export async function tandaiOnboarding(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(kunci(userId), '1')
  } catch {
    // abaikan: paling buruk slide tampil sekali lagi
  }
}
