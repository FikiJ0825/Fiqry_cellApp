import { Linking } from 'react-native'
import { NOMOR_WA_ADMIN } from '../constants/config'
import { Alert, bukaTautanLuar } from './dialog'

/** Batas nominal top up otomatis di layar; server (buat-topup) tetap yang menentukan. */
export const TOPUP_MINIMAL = 10000
export const TOPUP_MAKSIMAL = 2000000
export const TOPUP_PILIHAN = [20000, 50000, 100000, 200000, 500000]

/** Buka WhatsApp admin dengan pesan yang sudah terisi. */
export async function bukaWaAdmin(pesan: string): Promise<void> {
  const url = `https://wa.me/${NOMOR_WA_ADMIN}?text=${encodeURIComponent(pesan)}`

  try {
    if (bukaTautanLuar(url)) return
    await Linking.openURL(url)
  } catch {
    Alert.alert('Gagal', 'Tidak bisa membuka WhatsApp. Hubungi admin secara manual.')
  }
}

/** Buka WhatsApp admin dengan pesan top-up yang sudah terisi nama dan nomor agen. */
export async function bukaTopupWa(nama: string | null, nomorWa: string | null): Promise<void> {
  const identitas = [nama, nomorWa].filter(Boolean).join(' / ')
  await bukaWaAdmin(`Halo Admin, saya ${identitas || 'agen AdePulsa'} ingin top-up saldo sebesar Rp`)
}

/** Buka WhatsApp admin untuk meminta bantuan. */
export async function bukaBantuanWa(nama: string | null, nomorWa: string | null): Promise<void> {
  const identitas = [nama, nomorWa].filter(Boolean).join(' / ')
  await bukaWaAdmin(`Halo Admin, saya ${identitas || 'agen AdePulsa'} butuh bantuan`)
}
