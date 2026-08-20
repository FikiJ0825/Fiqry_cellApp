export function normalizeNomorWa(input: string): string {
  let digits = input.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1)
  }

  return digits
}

export function nomorWaToEmail(nomorWa: string): string {
  return `${normalizeNomorWa(nomorWa)}@apppulsa.app`
}

export function formatNomorWaDisplay(normalized: string): string {
  if (normalized.startsWith('62')) {
    return '0' + normalized.slice(2)
  }
  return normalized
}

export function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Nomor WhatsApp sudah terdaftar'
  }
  if (
    lower.includes('duplicate') ||
    lower.includes('unique') ||
    (lower.includes('nomor_wa') && lower.includes('already'))
  ) {
    return 'Nomor WhatsApp sudah digunakan akun lain'
  }
  if (lower.includes('email') && (lower.includes('already') || lower.includes('exists'))) {
    return 'Nomor WhatsApp sudah digunakan akun lain'
  }
  if (lower.includes('password') && lower.includes('6')) {
    return 'Password minimal 6 karakter'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Data login tidak valid'
  }
  if (lower.includes('email change') || lower.includes('confirm')) {
    return 'Perubahan nomor memerlukan konfirmasi email. Hubungi admin jika masalah berlanjut.'
  }

  return message || 'Terjadi kesalahan, silakan coba lagi'
}
