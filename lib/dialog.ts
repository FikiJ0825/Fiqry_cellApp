import { Alert as AlertNative, AlertButton, AlertOptions, Platform } from 'react-native'

/**
 * Pengganti Alert.alert yang juga jalan di web (di react-native-web Alert.alert tidak melakukan
 * apa-apa, jadi tombol konfirmasi seperti "Keluar" tidak pernah berfungsi).
 * Native memakai Alert asli. Web memakai window.alert (tanpa/satu tombol) atau window.confirm
 * (dua tombol atau lebih: OK menjalankan tombol aksi pertama yang bukan "cancel").
 */
function tampilkanDialog(
  judul: string,
  pesan?: string,
  tombol?: AlertButton[],
  opsi?: AlertOptions,
): void {
  if (Platform.OS !== 'web') {
    AlertNative.alert(judul, pesan, tombol, opsi)
    return
  }

  const teks = pesan ? `${judul}\n\n${pesan}` : judul

  if (!tombol || tombol.length <= 1) {
    window.alert(teks)
    tombol?.[0]?.onPress?.()
    return
  }

  const batal = tombol.find((t) => t.style === 'cancel')
  const aksi = tombol.find((t) => t !== batal)
  if (window.confirm(teks)) {
    aksi?.onPress?.()
  } else {
    batal?.onPress?.()
  }
}

export const Alert = { alert: tampilkanDialog }

/** Buka tautan eksternal; di web dibuka di tab baru supaya aplikasi tidak tertutup. */
export function bukaTautanLuar(url: string): boolean {
  if (Platform.OS !== 'web') return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
