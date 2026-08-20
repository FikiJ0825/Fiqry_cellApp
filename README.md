# AppPulsa — Fiqry Cell

Aplikasi penjualan pulsa, paket data, dan produk digital untuk jaringan agen **Fiqry Cell**. Dibangun dengan **Expo (React Native)** dan **Supabase** sebagai backend.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Mobile | Expo SDK 54, React Native 0.81, React 19 |
| Navigasi | Expo Router (file-based routing) |
| Bahasa | TypeScript |
| Backend | Supabase (Auth + PostgreSQL) |
| Penyimpanan sesi | AsyncStorage |

---

## Struktur Proyek

```
app/
├── _layout.tsx              # Root layout + guard autentikasi
├── (auth)/                  # Grup layar sebelum login
│   ├── login.tsx
│   └── register.tsx
└── (app)/                   # Grup layar setelah login
    ├── (tabs)/              # Tab navigasi utama
    │   ├── index.tsx        # Beranda
    │   ├── produk.tsx       # Daftar kategori produk
    │   ├── riwayat.tsx      # Riwayat transaksi
    │   └── profil.tsx       # Profil agen
    └── produk/
        ├── [kategori].tsx   # Daftar produk per kategori
        └── beli.tsx         # Form pembelian produk

constants/theme.ts           # Warna, ukuran font, radius
lib/supabase.ts              # Klien Supabase
components/                  # Komponen UI (belum diisi)
```

---

## Yang Sudah Dibuat

### 1. Setup & Infrastruktur
- [x] Inisialisasi proyek Expo dengan Expo Router
- [x] Konfigurasi `app.json` (nama AppPulsa, scheme `apppulsa`, ikon Android/iOS)
- [x] Integrasi Supabase dengan penyimpanan sesi persisten (AsyncStorage)
- [x] Sistem desain dasar di `constants/theme.ts` (warna merah Fiqry Cell, tipografi, radius)

### 2. Navigasi & Autentikasi
- [x] **Auth guard** di root layout — pengguna belum login diarahkan ke login, sudah login diarahkan ke tab utama
- [x] **Tab navigasi** dengan 4 tab: Beranda, Produk, Riwayat, Profil
- [x] Rute produk: daftar kategori dinamis (`[kategori]`) dan halaman pembelian (`beli`)

### 3. Registrasi Agen (Selesai)
Layar **Daftar** (`app/(auth)/register.tsx`) sudah fungsional penuh:

- Form: nama lengkap, nomor WhatsApp, password, konfirmasi password, kode referral (opsional)
- Normalisasi nomor WA (`0812…` → `62812…`)
- Login via email internal: `{nomor_wa}@apppulsa.app`
- Validasi duplikat nomor WA di tabel `profiles`
- Validasi kode referral — harus cocok dengan profil ber-tier **master**
- Update profil setelah registrasi: `nomor_wa`, `direferensikan_oleh` (jika ada referral)
- Pesan error dalam Bahasa Indonesia
- UI form lengkap dengan loading state dan styling tema

### 4. Skema Database (Supabase)
Berdasarkan implementasi registrasi, tabel yang sudah dipakai:

| Tabel / Field | Keterangan |
|---------------|------------|
| `profiles.id` | UUID, sama dengan `auth.users.id` |
| `profiles.nomor_wa` | Nomor WhatsApp ter-normalisasi |
| `profiles.kode_referral` | Kode referral unik (tier master) |
| `profiles.tier` | Level agen, mis. `master` |
| `profiles.direferensikan_oleh` | ID master yang mereferensikan agen |

---

## Belum Selesai (Placeholder)

Layar berikut sudah dibuat strukturnya, tetapi isinya masih placeholder:

| Layar | File | Status |
|-------|------|--------|
| Login | `(auth)/login.tsx` | ⏳ Placeholder |
| Beranda | `(tabs)/index.tsx` | ⏳ Placeholder |
| Produk | `(tabs)/produk.tsx` | ⏳ Placeholder |
| Riwayat | `(tabs)/riwayat.tsx` | ⏳ Placeholder |
| Profil | `(tabs)/profil.tsx` | ⏳ Placeholder |
| Produk per Kategori | `produk/[kategori].tsx` | ⏳ Placeholder |
| Pembelian | `produk/beli.tsx` | ⏳ Placeholder |
| Komponen UI reusable | `components/` | ⏳ Kosong |

---

## Rencana Pengembangan

### Fase 1 — Autentikasi & Profil
- [ ] **Login** — form masuk dengan nomor WA + password (mirip alur registrasi)
- [ ] **Profil agen** — tampilkan nama, nomor WA, saldo, tier, kode referral
- [ ] **Edit profil** — ubah nama, ganti password
- [ ] **Logout**

### Fase 2 — Beranda & Saldo
- [ ] **Dashboard beranda** — ringkasan saldo, transaksi terakhir, promo/announcement
- [ ] **Top-up saldo** — metode pembayaran (transfer bank, QRIS, dll.)
- [ ] **Notifikasi** — status top-up dan transaksi

### Fase 3 — Katalog & Pembelian Produk
- [ ] **Halaman produk** — grid/list kategori (Pulsa, Data, Token Listrik, E-Wallet, Game, dll.)
- [ ] **Daftar produk per kategori** — harga agen, stok/status operator
- [ ] **Form pembelian** — input nomor tujuan, konfirmasi, potong saldo
- [ ] **Integrasi supplier/API** — proses transaksi ke server pulsa
- [ ] **Status transaksi real-time** — sukses, pending, gagal

### Fase 4 — Riwayat & Laporan
- [ ] **Riwayat transaksi** — filter tanggal, kategori, status
- [ ] **Detail transaksi** — SN/ref ID, waktu, harga, status
- [ ] **Export / cetak struk** (opsional)

### Fase 5 — Sistem Agen Multi-Tier
- [ ] **Hierarki master → agen** — manajemen downline
- [ ] **Komisi referral** — perhitungan dan riwayat komisi
- [ ] **Transfer saldo antar agen** (jika diperlukan)
- [ ] **Panel master** — lihat dan kelola agen bawahan

### Fase 6 — Polish & Production
- [ ] Komponen UI reusable (Button, Input, Card, Header, dll.)
- [ ] Ikon tab bar
- [ ] Splash screen & loading screen
- [ ] Error handling global & offline state
- [ ] Build Android (APK/AAB) & iOS
- [ ] Environment variables (`.env`) untuk kunci Supabase

---

## Menjalankan Proyek

```bash
# Install dependensi
npm install

# Jalankan development server
npm start

# Buka di emulator/perangkat
npm run android   # Android
npm run ios       # iOS
npm run web       # Web (preview)
```

---

## Catatan Pengembangan

- Baca dokumentasi Expo versi proyek di [docs.expo.dev](https://docs.expo.dev/versions/v54.0.0/) sebelum menulis kode baru.
- Autentikasi menggunakan email sintetis dari nomor WA; tidak perlu verifikasi email terpisah.
- Tier `master` memiliki `kode_referral` yang bisa dipakai agen baru saat registrasi.

---

## Lisensi

Lihat file [LICENSE](LICENSE).
