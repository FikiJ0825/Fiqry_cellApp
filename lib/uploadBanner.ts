import { supabase } from './supabase'

const BUCKET_NAME = 'banner-promo'

export type BannerTampilan = 'carousel_tetap' | 'carousel_promo' | 'popup'

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

function getExtensionFromUri(imageUri: string): string {
  const withoutQuery = imageUri.split('?')[0] ?? imageUri
  const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/)
  return match?.[1]?.toLowerCase() ?? 'jpg'
}

function getMimeType(extension: string): string {
  return MIME_BY_EXTENSION[extension] ?? 'image/jpeg'
}

function generateUniqueFileName(extension: string): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`
}

function resolveStorageFolder(tampilan: BannerTampilan): 'popup' | 'carousel' {
  return tampilan === 'popup' ? 'popup' : 'carousel'
}

/**
 * Upload gambar banner dari URI lokal ke Supabase Storage,
 * lalu kembalikan public URL-nya.
 */
export async function uploadBannerImage(
  imageUri: string,
  tampilan: BannerTampilan,
): Promise<string> {
  const folder = resolveStorageFolder(tampilan)
  const extension = getExtensionFromUri(imageUri)
  const fileName = generateUniqueFileName(extension)
  const path = `${folder}/${fileName}`

  const response = await fetch(imageUri)
  if (!response.ok) {
    throw new Error('Gagal membaca file gambar dari perangkat')
  }

  const arrayBuffer = await response.arrayBuffer()

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, arrayBuffer, {
    contentType: getMimeType(extension),
    upsert: false,
  })

  if (error) {
    throw new Error(`Gagal mengunggah banner: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Hapus file banner dari Supabase Storage berdasarkan path-nya
 * (mis. saat admin mengganti atau menghapus banner).
 */
export async function deleteBannerImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    throw new Error(`Gagal menghapus banner: ${error.message}`)
  }
}
