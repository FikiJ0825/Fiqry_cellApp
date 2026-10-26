import { Linking } from 'react-native'
import { supabase } from './supabase'
import type { BannerTampilan } from './uploadBanner'

export interface BannerAktif {
  id: string
  judul: string
  gambar_url: string
  tampilan: BannerTampilan
  tipe_aksi: 'produk' | 'url_eksternal' | 'tidak_ada'
  target_aksi: string | null
  urutan: number
}

/** Banner yang aktif dan sedang dalam jadwal tayang, urut sesuai kolom urutan. */
export async function ambilBannerAktif(): Promise<BannerAktif[]> {
  const sekarang = new Date().toISOString()

  const { data, error } = await supabase
    .from('banner_promo')
    .select('id, judul, gambar_url, tampilan, tipe_aksi, target_aksi, urutan')
    .eq('aktif', true)
    .or(`tanggal_mulai.is.null,tanggal_mulai.lte.${sekarang}`)
    .or(`tanggal_berakhir.is.null,tanggal_berakhir.gte.${sekarang}`)
    .order('urutan', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat banner: ${error.message}`)
  }

  return (data ?? []) as BannerAktif[]
}

/**
 * Jalankan aksi banner. Mengembalikan kode_produk bila aksinya membuka produk
 * (pemanggil yang melakukan navigasi), atau null bila aksi sudah selesai / tidak ada.
 */
export async function jalankanAksiBanner(banner: BannerAktif): Promise<string | null> {
  if (!banner.target_aksi) return null

  if (banner.tipe_aksi === 'url_eksternal') {
    if (/^https?:\/\//i.test(banner.target_aksi)) {
      await Linking.openURL(banner.target_aksi)
    }
    return null
  }

  if (banner.tipe_aksi === 'produk') {
    const { data } = await supabase
      .from('produk')
      .select('kode_produk')
      .eq('id', banner.target_aksi)
      .eq('aktif', true)
      .maybeSingle()
    return data?.kode_produk ?? null
  }

  return null
}
