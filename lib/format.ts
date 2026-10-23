export function formatRupiah(amount: number | null | undefined): string {
  const value = amount ?? 0
  return `Rp ${value.toLocaleString('id-ID')}`
}
