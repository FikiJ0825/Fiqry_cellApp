import type { IoniconName } from './produk'
import type { PastelNama } from './theme'

// Isi Panduan dan slide sambutan. Aturan tier/bonus mengikuti catatan AdePulsa.md;
// ubah teks di sini kalau aturan bisnis berubah.

export interface ItemPanduan {
  kunci: string
  ikon: IoniconName
  warna: PastelNama
  judul: string
  isi: string
  langkah?: string[]
}

export interface BagianPanduan {
  kunci: string
  judul: string
  item: ItemPanduan[]
}

export interface TanyaJawab {
  tanya: string
  jawab: string
}

export interface SlideSambutan {
  kunci: string
  ikon: IoniconName
  warna: PastelNama
  judul: string
  isi: string
}

export const BAGIAN_PANDUAN: BagianPanduan[] = [
  {
    kunci: 'utama',
    judul: 'Fitur Utama',
    item: [
      {
        kunci: 'beli',
        ikon: 'cart-outline',
        warna: 'rose',
        judul: 'Beli Produk',
        isi: 'Jual pulsa, paket data, token listrik, e-wallet, game, dan produk digital lain langsung dari aplikasi. Harga yang tampil sudah sesuai tier Anda.',
        langkah: [
          'Pilih kategori di Beranda, atau buka tab Produk lalu cari produknya.',
          'Pilih produk, lalu isi nomor atau ID tujuan.',
          'Masukkan PIN transaksi 6 digit.',
          'Periksa rincian pembelian, lalu tekan Beli Sekarang.',
        ],
      },
      {
        kunci: 'pin',
        ikon: 'lock-closed-outline',
        warna: 'sky',
        judul: 'PIN Transaksi',
        isi: 'PIN 6 digit dipakai setiap kali membeli produk. Buat PIN lebih dulu di Profil, menu PIN Transaksi. Jangan bagikan PIN ke siapa pun. Jika salah memasukkan PIN 5 kali berturut-turut, PIN terkunci selama 15 menit.',
      },
      {
        kunci: 'topup',
        ikon: 'wallet-outline',
        warna: 'mint',
        judul: 'Top-up Saldo',
        isi: 'Saldo diisi lewat WhatsApp Admin. Saldo bertambah setelah admin memproses pembayaran Anda.',
        langkah: [
          'Tekan Top-up di Beranda atau di menu Profil.',
          'WhatsApp terbuka dengan pesan yang sudah terisi. Tambahkan nominal yang diinginkan, lalu kirim.',
          'Lakukan pembayaran sesuai arahan admin.',
          'Saldo masuk setelah admin selesai memproses, dan tampil di Beranda.',
        ],
      },
      {
        kunci: 'riwayat',
        ikon: 'receipt-outline',
        warna: 'butter',
        judul: 'Riwayat & Status Transaksi',
        isi: 'Semua pembelian tercatat di tab Riwayat, dan statusnya berubah otomatis: Menunggu, Diproses, Berhasil, atau Gagal. Jika transaksi Gagal, saldo Anda dikembalikan otomatis.',
      },
    ],
  },
  {
    kunci: 'lain',
    judul: 'Fitur Lainnya',
    item: [
      {
        kunci: 'tier',
        ikon: 'ribbon-outline',
        warna: 'butter',
        judul: 'Tier Agen Biasa & Master',
        isi: 'Agen Master mendapat harga produk yang lebih murah daripada Agen Biasa. Semua agen punya kode referral. Anda naik otomatis menjadi Master ketika 5 agen yang mendaftar dengan kode referral Anda masing-masing sudah menyelesaikan 3 transaksi berhasil. Tier Master kembali menjadi Biasa jika tidak ada transaksi selama 2 bulan.',
      },
      {
        kunci: 'referral',
        ikon: 'gift-outline',
        warna: 'peach',
        judul: 'Kode Referral & Bonus',
        isi: 'Setiap agen punya kode referral. Calon agen baru bisa memasukkan kode ini saat mendaftar (opsional). Kode Anda ada di tab Profil, tekan Salin lalu bagikan. Agen Master mendapat bonus Rp5.000 setiap 10 transaksi berhasil dalam sehari (transaksi ke-10, ke-20, dan seterusnya). Bonus yang tersedia muncul di Profil; tekan Klaim Sekarang dan Anda diarahkan ke WhatsApp Admin untuk prosesnya.',
      },
      {
        kunci: 'profil',
        ikon: 'person-outline',
        warna: 'lilac',
        judul: 'Profil Saya',
        isi: 'Ubah nama dan nomor WhatsApp lewat Profil, menu Edit Profil. Pastikan nomor WhatsApp Anda aktif karena dipakai admin untuk menghubungi Anda.',
      },
    ],
  },
  {
    kunci: 'promo',
    judul: 'Promo',
    item: [
      {
        kunci: 'banner',
        ikon: 'megaphone-outline',
        warna: 'rose',
        judul: 'Banner & Pop-up Promo',
        isi: 'Promo terbaru tampil sebagai banner geser di Beranda, dan sebagai pop-up poster setiap kali aplikasi dibuka. Ketuk banner atau poster untuk melihat produk atau informasi promonya. Pop-up bisa ditutup dengan tombol X.',
      },
    ],
  },
]

export const TANYA_JAWAB_PANDUAN: TanyaJawab[] = [
  {
    tanya: 'Saldo saya tidak cukup, bagaimana?',
    jawab: 'Isi saldo lewat tombol Top-up di Beranda atau Profil. Anda akan diarahkan ke WhatsApp Admin.',
  },
  {
    tanya: 'Transaksi saya berstatus Gagal, apakah saldo hilang?',
    jawab: 'Tidak. Saldo dikembalikan otomatis, dan di Riwayat tertulis "Saldo dikembalikan" pada transaksi tersebut.',
  },
  {
    tanya: 'Transaksi masih Menunggu atau Diproses, apa yang harus dilakukan?',
    jawab: 'Tunggu sebentar, status berubah otomatis begitu ada balasan. Anda juga bisa menarik layar Riwayat ke bawah untuk memuat ulang. Jika terlalu lama, hubungi admin.',
  },
  {
    tanya: 'PIN saya terkunci atau saya lupa PIN.',
    jawab: 'PIN terkunci 15 menit setelah 5 kali salah, lalu bisa dicoba lagi. Mengubah PIN membutuhkan PIN lama; jika lupa, hubungi admin untuk bantuan.',
  },
  {
    tanya: 'Saya salah memasukkan nomor tujuan, bisa dibatalkan?',
    jawab: 'Transaksi yang sudah dikirim tidak bisa dibatalkan dari aplikasi. Segera hubungi admin dan sebutkan nomor serta waktu transaksinya.',
  },
  {
    tanya: 'Bagaimana cara naik menjadi Agen Master?',
    jawab: 'Bagikan kode referral Anda (ada di tab Profil) ke calon agen baru. Setelah 5 agen yang Anda ajak masing-masing menyelesaikan 3 transaksi berhasil, tier Anda naik otomatis menjadi Master.',
  },
]

export const SLIDE_SAMBUTAN: SlideSambutan[] = [
  {
    kunci: 'selamat-datang',
    ikon: 'storefront-outline',
    warna: 'rose',
    judul: 'Selamat datang di Ade Pulsa',
    isi: 'Jual pulsa, paket data, token listrik, e-wallet, dan produk digital lain dari satu aplikasi.',
  },
  {
    kunci: 'beli',
    ikon: 'cart-outline',
    warna: 'sky',
    judul: 'Beli produk dengan mudah',
    isi: 'Pilih kategori, isi nomor tujuan, lalu konfirmasi dengan PIN 6 digit. Buat PIN Anda lebih dulu di menu Profil.',
  },
  {
    kunci: 'saldo',
    ikon: 'wallet-outline',
    warna: 'mint',
    judul: 'Isi saldo & pantau transaksi',
    isi: 'Top-up lewat WhatsApp Admin. Status transaksi di Riwayat berubah otomatis, dan saldo kembali jika transaksi gagal.',
  },
  {
    kunci: 'tier',
    ikon: 'ribbon-outline',
    warna: 'butter',
    judul: 'Naik tier, untung lebih besar',
    isi: 'Ajak agen baru lewat kode referral. Agen Master mendapat harga lebih murah dan bonus transaksi.',
  },
]
