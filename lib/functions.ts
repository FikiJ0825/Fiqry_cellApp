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

  const context = (error as { context?: unknown }).context
  if (context instanceof Response) {
    try {
      const json = (await context.json()) as { error?: string; kode?: string }
      if (json.error) pesan = json.error
      if (json.kode) kode = json.kode
    } catch {
      // body bukan JSON; pakai pesan default
    }
  }

  return { data: null, error: pesan, kode }
}
