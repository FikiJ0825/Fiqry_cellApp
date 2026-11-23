import { Dimensions } from 'react-native'

// Skala ukuran berbasis lebar layar (baseline 390dp, seperti iPhone 14 / HP Android umum).
// Dibatasi agar HP kecil tidak sesak dan tablet/web tidak menjadi raksasa.
const BASELINE = 390
const MIN = 0.92
const MAX = 1.15

/** Lebar layar potret (aplikasi dikunci portrait); dibaca sekali saat modul dimuat */
const lebar = Math.min(Dimensions.get('window').width, Dimensions.get('window').height)

export const FAKTOR = Math.min(MAX, Math.max(MIN, lebar / BASELINE))

/** Skala penuh: jarak, radius, tinggi, ikon */
export const s = (nilai: number) => Math.round(nilai * FAKTOR * 2) / 2

/** Skala moderat (setengah): ukuran font, supaya teks tidak melonjak di layar besar */
export const ms = (nilai: number, kekuatan = 0.5) => Math.round((nilai + (nilai * FAKTOR - nilai) * kekuatan) * 2) / 2

/** Lebar maksimum konten agar tetap proporsional di tablet / jendela web */
export const LEBAR_MAKS = 480
