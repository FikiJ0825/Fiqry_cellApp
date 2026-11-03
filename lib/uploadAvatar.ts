import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'

const BUCKET_NAME = 'avatar'

// Harus sama dengan konfigurasi bucket avatar (png/jpeg/webp, maks 2 MB)
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024

function getExtensionFromUri(imageUri: string): string {
  const withoutQuery = imageUri.split('?')[0] ?? imageUri
  const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/)
  return match?.[1]?.toLowerCase() ?? 'jpg'
}

/** Path file di bucket dari public URL, atau null bila URL bukan dari bucket avatar */
function pathDariUrl(url: string | null): string | null {
  if (!url) return null
  const penanda = `/object/public/${BUCKET_NAME}/`
  const idx = url.indexOf(penanda)
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + penanda.length).split('?')[0] ?? '')
}

async function hapusFile(url: string | null): Promise<void> {
  const path = pathDariUrl(url)
  if (path) await supabase.storage.from(BUCKET_NAME).remove([path])
}

/**
 * Buka galeri, lalu unggah foto terpilih sebagai foto profil akun yang sedang masuk.
 * Mengembalikan URL baru, atau null bila pengguna membatalkan.
 */
export async function pilihDanUnggahFoto(fotoLama: string | null): Promise<string | null> {
  const izin = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!izin.granted) {
    throw new Error('Izin galeri diperlukan untuk memilih foto')
  }

  const hasil = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })
  const aset = hasil.canceled ? undefined : hasil.assets[0]
  if (!aset) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi tidak valid, silakan masuk kembali')

  const extension = getExtensionFromUri(aset.uri)
  const mime = MIME_BY_EXTENSION[extension]
  if (!mime) throw new Error('Format foto harus JPG, PNG, atau WebP')

  const response = await fetch(aset.uri)
  if (!response.ok) throw new Error('Gagal membaca file foto dari perangkat')
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) throw new Error('Ukuran foto maksimal 2 MB')

  // Nama unik per unggahan sehingga cache gambar otomatis berganti
  const path = `${user.id}/avatar-${Date.now()}.${extension}`
  const { error: errUpload } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, { contentType: mime, upsert: false })
  if (errUpload) throw new Error(`Gagal mengunggah foto: ${errUpload.message}`)

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  const { error: errSimpan } = await supabase.from('profiles').update({ foto_url: data.publicUrl }).eq('id', user.id)
  if (errSimpan) {
    await hapusFile(data.publicUrl)
    throw new Error(`Gagal menyimpan foto: ${errSimpan.message}`)
  }

  await hapusFile(fotoLama)
  return data.publicUrl
}

/** Hapus foto profil akun yang sedang masuk (kembali ke avatar inisial) */
export async function hapusFotoProfil(fotoLama: string | null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi tidak valid, silakan masuk kembali')

  const { error } = await supabase.from('profiles').update({ foto_url: null }).eq('id', user.id)
  if (error) throw new Error(`Gagal menghapus foto: ${error.message}`)

  await hapusFile(fotoLama)
}
