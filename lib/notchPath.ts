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

/** Dua kurva Bézier S yang membentuk dasar cekungan, dari tepi kiri ke tepi kanan */
function kurvaCekungan({ cx, atas, setengahLebar: a, kedalaman }: ParamCekungan): string[] {
  const dasar = atas + Math.max(0, kedalaman)
  const x1 = cx + a
  return [
    `C ${n(cx - a + a * 0.62)} ${n(atas)} ${n(cx - a * 0.46)} ${n(dasar)} ${n(cx)} ${n(dasar)}`,
    `C ${n(cx + a * 0.46)} ${n(dasar)} ${n(x1 - a * 0.62)} ${n(atas)} ${n(x1)} ${n(atas)}`,
  ]
}

/**
 * Path tertutup bentuk cekungan halus (kurva Bézier S di kedua sisi) yang dipakai sebagai
 * potongan (mask) pada bar: bagian di atas kurva dibuang sehingga bar tampak berlekuk tempat bubble duduk.
 */
export function buatPathCekungan(param: ParamCekungan): string {
  const { cx, atas, setengahLebar: a, tinggiPotong = 40 } = param
  const x0 = cx - a
  const x1 = cx + a
  const ataspotong = atas - tinggiPotong

  return [
    `M ${n(x0)} ${n(ataspotong)}`,
    `L ${n(x0)} ${n(atas)}`,
    ...kurvaCekungan(param),
    `L ${n(x1)} ${n(ataspotong)}`,
    'Z',
  ].join(' ')
}

/** Path terbuka sepanjang tepi cekungan (untuk garis tepi), titiknya sama dengan buatPathCekungan */
export function buatPathGaris(param: ParamCekungan): string {
  const { cx, atas, setengahLebar: a } = param
  return [`M ${n(cx - a)} ${n(atas)}`, ...kurvaCekungan(param)].join(' ')
}
