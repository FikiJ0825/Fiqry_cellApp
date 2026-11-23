import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

/**
 * Gerakan UI untuk tombol & kartu aksi (gaya halus dan ringkas).
 * Dipakai bersama oleh PressScale, Accordion, dan animasi masuk layar.
 */
export const MOTION_UI = {
  /** Skala saat ditekan */
  tekanSkala: 0.97,
  /** Pegas saat ditekan dan dilepas: cepat, sedikit memantul */
  tekanPegas: { damping: 18, stiffness: 340, mass: 0.6 },
  /** Durasi buka-tutup accordion dan perubahan kecil */
  durasi: 220,
  /** Kurva yang sama dengan perpindahan tab bar dan tur */
  easing: [0.4, 0, 0.2, 1] as const,
  /** Durasi animasi masuk satu blok */
  durasiMasuk: 320,
  /** Jeda antar blok saat masuk bertahap */
  jedaBertahap: 60,
} as const

/** Getaran tipis saat aksi utama (tombol, buka-tutup). Dilewati di web. */
export function getaranRingan(): void {
  if (Platform.OS === 'web') return
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
}

/** Getaran sangat halus saat memilih sesuatu (chip, tab). Dilewati di web. */
export function getaranPilih(): void {
  if (Platform.OS === 'web') return
  void Haptics.selectionAsync().catch(() => undefined)
}
