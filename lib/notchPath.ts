export interface ParamCekungan {
  /** Titik tengah cekungan (sumbu X) */
  cx: number
  /** Koordinat Y tepi atas bar */
  atas: number
  /** Setengah lebar cekungan di tepi atas bar */
  setengahLebar: number
  /** Kedalaman cekungan dalam piksel (0 = bar rata) */
  kedalaman: number
  /** Tinggi bagian yang dipotong di atas tepi bar (menutupi area bubble) */
  tinggiPotong?: number
}

const n = (angka: number) => (Number.isFinite(angka) ? angka : 0).toFixed(2)

/**
 * Path tertutup bentuk cekungan halus (kurva Bézier S di kedua sisi) yang dipakai sebagai
 * potongan (mask) pada bar: bagian di atas kurva dibuang sehingga bar tampak berlekuk tempat bubble duduk.
 */
export function buatPathCekungan({
  cx,
  atas,
  setengahLebar: a,
  kedalaman,
  tinggiPotong = 40,
}: ParamCekungan): string {
  const d = Math.max(0, kedalaman)
  const x0 = cx - a
  const x1 = cx + a
  const dasar = atas + d
  const ataspotong = atas - tinggiPotong

  return [
    `M ${n(x0)} ${n(ataspotong)}`,
    `L ${n(x0)} ${n(atas)}`,
    `C ${n(x0 + a * 0.6)} ${n(atas)} ${n(cx - a * 0.5)} ${n(dasar)} ${n(cx)} ${n(dasar)}`,
    `C ${n(cx + a * 0.5)} ${n(dasar)} ${n(x1 - a * 0.6)} ${n(atas)} ${n(x1)} ${n(atas)}`,
    `L ${n(x1)} ${n(ataspotong)}`,
    'Z',
  ].join(' ')
}
