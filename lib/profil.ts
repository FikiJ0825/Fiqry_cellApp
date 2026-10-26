import { supabase } from './supabase'

export interface ProfilSaya {
  id: string
  nama: string | null
  saldo: number
  tier: string | null
  aktif: boolean | null
}

export async function ambilProfilSaya(): Promise<ProfilSaya> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Sesi tidak valid, silakan masuk kembali')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nama, saldo, tier, aktif')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    throw new Error(`Gagal memuat profil: ${error?.message ?? 'tidak ditemukan'}`)
  }

  return { ...data, saldo: Number(data.saldo ?? 0) } as ProfilSaya
}

/** Harga yang berlaku untuk agen sesuai tier (sama dengan aturan di create-transaction). */
export function hargaUntukTier(
  tier: string | null,
  produk: { harga_jual_biasa: number; harga_jual_master: number },
): number {
  return Number(tier === 'master' ? produk.harga_jual_master : produk.harga_jual_biasa)
}
