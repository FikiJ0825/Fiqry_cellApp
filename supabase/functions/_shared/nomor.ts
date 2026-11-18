// Normalisasi nomor WhatsApp, sama dengan normalizeNomorWa di lib/auth-utils.ts (sisi aplikasi):
// buang non-digit, awalan 0 -> 62. Hasil valid: diawali 62, panjang 10-15 digit.

export function normalisasiNomorWa(masukan: string): string {
  let digit = masukan.replace(/\D/g, "");
  if (digit.startsWith("0")) digit = "62" + digit.slice(1);
  return digit;
}

export function nomorWaValid(normal: string): boolean {
  return /^62\d{8,13}$/.test(normal);
}

/** Email palsu untuk Supabase Auth, sama dengan nomorWaToEmail di lib/auth-utils.ts. */
export function nomorWaKeEmail(normal: string): string {
  return `${normal}@apppulsa.app`;
}
