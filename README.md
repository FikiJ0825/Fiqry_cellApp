# AdePulsa — Fiqry Cell

Aplikasi reseller pulsa, paket data, dan produk digital untuk jaringan agen **Fiqry Cell**. Dibangun dengan **Expo (React Native)** dan **Supabase** sebagai backend, dengan bridge WhatsApp ke JW Administrasi untuk eksekusi transaksi.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Mobile / Web | Expo SDK 58, React Native 0.88, React 19.3 |
| Navigasi | Expo Router (file-based routing) |
| Bahasa | TypeScript |
| Backend | Supabase (Auth, PostgreSQL + RLS, Realtime, Edge Functions, Storage) |
| Transaksi | WA Bridge (Baileys) ke JW Administrasi di PC pulsa |
| Pembayaran top-up | Duitku (QRIS), konfirmasi via callback + cek status API |
| Font / UI | Poppins, tema Crimson / Off-White, mode terang + gelap |
| Penyimpanan sesi | AsyncStorage |

---

## Struktur Proyek

```
app/
├── _layout.tsx                 # Root layout + guard autentikasi
├── (auth)/                     # login, register
└── (app)/
    ├── (tabs)/                 # Beranda, Produk, Riwayat, Profil
    ├── produk/                 # [kategori], beli
    ├── transaksi/[id].tsx      # Detail transaksi (SN, catatan)
    ├── topup.tsx               # Top up saldo via QRIS Duitku
    ├── pin.tsx                 # Atur / ubah PIN transaksi
    ├── onboarding.tsx          # Slide sambutan
    ├── panduan.tsx             # Panduan penggunaan
    └── (admin)/                # Area admin (hanya role admin)
        ├── (panel)/            # Dashboard, Agen, Produk, Transaksi
        ├── agen-detail.tsx     # Detail agen, saldo, tier, aktif
        ├── katalog/            # Kelola katalog produk
        └── banner/             # Kelola banner promo

components/ui/                  # Button, Input, Card, Chip, PinInput, DatePickerSheet,
                                # FloatingTabBar, ResultSheet, dst.
components/                     # BannerCarousel, PromoPopup, ProdukBaris, profil/
constants/                      # theme, config, produk, panduan
lib/                            # supabase client, format, transaksi, topup, banner, dll.
supabase/functions/             # Edge Functions (lihat di bawah)
supabase/migrations/            # Migrasi SQL 001-010 (jalankan manual di SQL Editor)
supabase/checks/                # Query/skrip verifikasi (cek_topup_009.sql, dst.)
wa-bridge/                      # Server Express + Baileys (jalan di PC pulsa)
```

> Jangan beri nama grup admin `(tabs)`: guard di `app/_layout.tsx` mengira itu area agen.

### Edge Functions

| Function | Fungsi |
|----------|--------|
| `create-transaction` | Buat transaksi, potong saldo, kirim ke WA Bridge |
| `wa-webhook` | Terima balasan WA Center, update status transaksi (SN, catatan) |
| `atur-pin` | Atur / ubah PIN transaksi |
| `buat-topup` | Buat QRIS Duitku untuk top up saldo |
| `cek-topup` | Cek manual status top up (dibatasi frekuensinya) |
| `duitku-callback` | Terima callback Duitku, kredit saldo idempoten (`--no-verify-jwt`) |

### Migrasi

| No | Isi |
|----|-----|
| 001 | Auth email internal |
| 002-003 | Proteksi profil, klaim bonus, kunci RPC dan policy insert |
| 004 | PIN transaksi |
| 005 | Admin: saldo dan transaksi |
| 006 | Perbaikan `catat_pin_gagal` |
| 007 | Alur referral dan bonus |
| 008 | Foto profil |
| 009 | Top up otomatis Duitku (`topup_otomatis`, `kreditkan_topup`) |
| 010 | Detail transaksi (`sn`, `catatan`) + RLS `wa_log` |

---

## Status Fitur

### Selesai
- **Auth**: login dan register (RPC), kode referral dari semua tier, auto-login email internal `{nomor_wa}@apppulsa.app`
- **Agen**: Beranda (saldo realtime, ringkasan hari ini, banner + pop-up promo), Produk per kategori, form Beli dengan PIN, Riwayat (filter status/tanggal, realtime), Detail transaksi, Profil (foto, tier, kode referral), Panduan, Onboarding
- **Top up saldo**: QRIS Duitku otomatis, status live via Realtime
- **Admin**: Dashboard, Kelola Agen, Transaksi (filter, selesaikan manual), Katalog produk, Banner promo
- **UI**: komponen reusable di `components/ui`, tema Crimson, tab bar melayang, mode terang/gelap
- **Backend**: RLS per tabel, RPC terkunci, PIN dengan pembatasan percobaan gagal

### Di-hold
- [ ] Komisi referral (perhitungan dan riwayat)
- [ ] Panel master / manajemen downline
- [ ] Transfer saldo antar agen

### Polish / Production
- [ ] Go-live Duitku production (lihat checklist di bawah)
- [ ] Notifikasi push
- [ ] Error handling global dan state offline
- [ ] Build Android (APK/AAB) via EAS

---

## Go-Live Duitku (Production)

1. **Verifikasi merchant**: isi URL website yang menjelaskan usaha (layanan, kontak, Syarat & Ketentuan, Kebijakan Privasi, Refund). Siapkan akun demo untuk reviewer karena halaman utama app langsung ke login.
2. **Supabase secrets** (ganti dari sandbox ke production):
   ```powershell
   supabase secrets set DUITKU_MERCHANT_CODE=xxxx DUITKU_API_KEY=xxxx
   supabase secrets set DUITKU_BASE_URL=https://passport.duitku.com/webapi/api/merchant
   ```
   Opsional: `DUITKU_RETURN_URL` untuk halaman tujuan setelah bayar.
3. **Callback URL** di dashboard Duitku: `https://clbinerltxwxobbtxfad.supabase.co/functions/v1/duitku-callback`
4. **Tes asli** nominal kecil (Rp10-25 ribu): saldo harus bertambah **sekali saja**.
5. **Verifikasi**: jalankan `supabase/checks/cek_topup_009.sql` untuk memastikan tidak ada kredit ganda.

---

## Menjalankan Proyek

```powershell
npm install
npm start            # dev server
npm run android      # Android
npm run web          # Web
```

Deploy Edge Function: lihat script `supabase:functions:deploy:*` di `package.json`.

---

## Catatan Pengembangan

- Baca dokumentasi Expo versi proyek di [docs.expo.dev](https://docs.expo.dev/versions/v58.0.0/) sebelum menulis kode baru.
- Autentikasi memakai email sintetis dari nomor WA; tidak ada verifikasi email.
- Sumber kebenaran pembayaran top up adalah API status Duitku, bukan isi callback.
- Isi mentah `wa_log` memuat saldo dan harga modal master; tabel ini hanya boleh dibaca `service_role`.

---

## Lisensi

Lihat file [LICENSE](LICENSE).
