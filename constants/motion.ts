import { Easing } from 'react-native'

/**
 * Gerakan Coach Marks, diturunkan dari video referensi:
 * - "Animasi 1": kartu kaca dengan tepi bercahaya yang "bernapas" dan berubah bentuk mulus antar keadaan
 * - "Animasi 2": transisi zoom ala iOS (±300–400 ms) + indikator sentuh
 * - "Animasi 3": backdrop meredup lembut, panel naik dengan pegas ringan, isi cross-fade
 * - "Animasi button navigasi": bubble meluncur & menunduk (sudah dipakai FloatingTabBar, kurva yang sama dipakai di sini)
 */
export const MOTION = {
  /** Backdrop gelap memudar masuk/keluar */
  backdropMasuk: 260,
  backdropKeluar: 200,
  /** Spotlight meluncur & berubah ukuran/radius antar langkah (kurva sama dengan perpindahan tab bar) */
  pindahSpotlight: 400,
  easingPindah: Easing.bezier(0.4, 0, 0.2, 1),
  /** Tooltip: pegas naik + skala dari 0.94 */
  tooltipGeser: 16,
  tooltipSkalaAwal: 0.94,
  tooltipPegas: { speed: 14, bounciness: 7 },
  tooltipFadeMasuk: 220,
  tooltipFadeKeluar: 120,
  /** Jeda sebelum tooltip muncul agar spotlight "tiba" lebih dulu */
  tooltipJeda: 140,
  /** Cincin cahaya di tepi spotlight berdenyut pelan */
  denyut: 1400,
  denyutSkala: 1.05,
  denyutOpasitasMin: 0.35,
  denyutOpasitasMaks: 0.95,
  /** Padding antara target dan tepi cutout */
  paddingSpotlight: 6,
  /** Tunggu scroll otomatis selesai sebelum mengukur ulang target */
  tungguScroll: 450,
} as const
