/** Satu langkah tur. `id` harus sama dengan `id` pada <TourTarget id="..."> di layar. */
export interface LangkahTour {
  id: string
  judul: string
  deskripsi: string
}

/** Tur Beranda: urutan mengikuti posisi elemen dari atas ke bawah layar */
export const TUR_BERANDA: LangkahTour[] = [
  {
    id: 'beranda.notifikasi',
    judul: 'Notifikasi',
    deskripsi: 'Pantau status transaksi, promo, dan pengumuman terbaru. Titik merah menandakan ada yang belum dibaca.',
  },
  {
    id: 'beranda.topup',
    judul: 'Top-up Saldo',
    deskripsi: 'Isi saldo kapan saja, termasuk lewat QRIS, supaya siap dipakai membeli produk.',
  },
  {
    id: 'beranda.produk',
    judul: 'Beli Produk',
    deskripsi: 'Pilih kategori seperti pulsa, paket data, atau token listrik, lalu masukkan nomor tujuan.',
  },
  {
    id: 'beranda.panduan',
    judul: 'Panduan AdePulsa',
    deskripsi: 'Butuh bantuan? Buka panduan fitur dan tanya jawab. Tur ini bisa diulang dari menu Profil.',
  },
]
