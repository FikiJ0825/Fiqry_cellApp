import { ComponentRef, MutableRefObject, RefObject, createContext } from 'react'
import { ScrollView, View } from 'react-native'
import { LangkahTour } from '../../constants/tour'

/** Tipe instance View / ScrollView (RN 0.88: komponen bukan lagi class) */
export type ViewRef = ComponentRef<typeof View>
export type ScrollRef = ComponentRef<typeof ScrollView>

/** Persegi dalam koordinat lapisan overlay (px layar) */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface EntriTarget {
  ref: RefObject<ViewRef | null>
  /** Radius sudut elemen target (dp). Cutout spotlight mengikutinya. */
  radius: number
  /** Elemen tetap di layar (mis. tab bar, header): jangan scroll-kan ScrollView demi elemen ini */
  tetap: boolean
}

export interface EntriScroll {
  ref: RefObject<ScrollRef | null>
  offset: MutableRefObject<number>
}

export interface TourApi {
  /** Tur sedang tampil */
  aktif: boolean
  /** Mulai tur dengan daftar langkah. `userId` dipakai untuk menyimpan status selesai. */
  mulai: (langkah: LangkahTour[], userId?: string) => void
  /** Mulai hanya bila akun ini belum pernah menyelesaikan/melewati tur. Mengembalikan true bila tur dimulai. */
  mulaiOtomatis: (langkah: LangkahTour[], userId: string) => Promise<boolean>
  berikutnya: () => void
  kembali: () => void
  lewati: () => void
  /** Dipanggil layar lain (mis. Panduan/Profil) untuk meminta Beranda menjalankan tur begitu tampil */
  mintaMulai: () => void
  /** Ada permintaan mulai yang belum dijalankan */
  mulaiTertunda: boolean
  /** Tandai permintaan tertunda sudah ditangani */
  selesaikanTertunda: () => void
  /** Daftarkan elemen target; mengembalikan fungsi pembatal */
  daftarTarget: (id: string, entri: EntriTarget) => () => void
  /** Daftarkan ScrollView agar target di luar layar bisa digulung ke area terlihat */
  daftarScroll: (entri: EntriScroll) => () => void
}

const TIDAK_ADA = (): never => {
  throw new Error('useTour harus dipakai di dalam <TourProvider>')
}

export const TourContext = createContext<TourApi>({
  aktif: false,
  mulai: TIDAK_ADA,
  mulaiOtomatis: TIDAK_ADA,
  berikutnya: TIDAK_ADA,
  kembali: TIDAK_ADA,
  lewati: TIDAK_ADA,
  mintaMulai: TIDAK_ADA,
  mulaiTertunda: false,
  selesaikanTertunda: TIDAK_ADA,
  daftarTarget: () => () => {},
  daftarScroll: () => () => {},
})
