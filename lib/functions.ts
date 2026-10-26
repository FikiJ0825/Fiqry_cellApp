import { supabase } from './supabase'

export interface HasilFungsi<T> {
  data: T | null
  error: string | null
  /** Kode khusus dari server, mis. PIN_SALAH / PIN_BELUM_ADA / PIN_TERKUNCI */
  kode: string | null
}

/**
 * Panggil Edge Function dan ambil pesan error dari body JSON server
 * (supabase.functions.invoke hanya memberi pesan generik untuk status non-2xx).
 */
export async function panggilFungsi<T = unknown>(
  nama: string,
  body: Record<string, unknown>,
): Promise<HasilFungsi<T>> {
  const { data, error } = await supabase.functions.invoke(nama, { body })

  if (!error) {
    return { data: data as T, error: null, kode: null }
  }

  let pesan = 'Terjadi kesalahan, silakan coba lagi'
  let kode: string | null = null

  // Jangan pakai `instanceof Response`: di React Native kelas Response bisa berbeda dari yang
  // dipakai supabase-js, sehingga pesan asli server tidak pernah terbaca.
  const context = (error as { context?: { text?: () => Promise<string> } }).context
  if (context && typeof context.text === 'function') {
    try {
      const json = JSON.parse(await context.text()) as { error?: string; kode?: string }
      if (json.error) pesan = json.error
      if (json.kode) kode = json.kode
    } catch {
      // body bukan JSON; pakai pesan default
    }
  }

  if (pesan === 'Terjadi kesalahan, silakan coba lagi') {
    console.warn(`Edge function ${nama} gagal:`, error.message)
  }

  return { data: null, error: pesan, kode }
}
