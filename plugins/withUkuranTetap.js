// Expo config plugin: kunci ukuran UI Android ke ukuran normal.
//
// Masalah: Android mengikuti pengaturan "Ukuran font" dan "Ukuran tampilan" milik pengguna, sehingga di
// HP yang disetel besar seluruh layout, teks, ikon, dan tombol ikut membesar (jauh lebih besar dari iOS).
// Solusi: MainActivity dan MainApplication memakai konteks dengan fontScale dibatasi maks 1.15. Kepadatan
// layar tidak lagi dikunci (dulu DENSITY_DEVICE_STABLE membuat UI mungil di Samsung); ukuran UI kini
// diatur oleh lib/skala.ts menurut lebar layar. Keduanya dipasang karena
// React Native membaca metrik layar dari konteks aplikasi, bukan hanya dari Activity.
//
// Berlaku setelah build native ulang (eas build); tidak bisa dikirim lewat EAS Update.
// Penyisipan idempoten, dan sengaja melempar error bila kelas tidak ditemukan supaya tidak gagal diam-diam.

const { withMainActivity, withMainApplication } = require('expo/config-plugins')

const PENANDA = 'AdePulsa: ukuran tetap'

const IMPOR = [
  'android.content.Context',
  'android.content.res.Configuration',
]

const METODE = (eol) =>
  [
    '',
    `  // ${PENANDA}`,
    '  override fun attachBaseContext(newBase: Context) {',
    '    val konfigurasi = Configuration(newBase.resources.configuration)',
    // Hanya batasi ukuran font sistem (maks 1.15x); kepadatan layar TIDAK dikunci supaya
    // "Screen zoom"/resolusi pengguna (mis. Samsung) tetap dihormati dan UI tidak jadi mungil.
    '    konfigurasi.fontScale = Math.min(konfigurasi.fontScale, 1.15f)',
    '    super.attachBaseContext(newBase.createConfigurationContext(konfigurasi))',
    '  }',
    '',
  ].join(eol)

function sisipkan(contents, namaKelas) {
  if (contents.includes(PENANDA)) return contents // sudah terpasang

  if (/fun\s+attachBaseContext\s*\(/.test(contents)) {
    throw new Error(
      `[withUkuranTetap] ${namaKelas} sudah punya attachBaseContext; gabungkan manual agar tidak menimpa.`,
    )
  }

  const eol = contents.includes('\r\n') ? '\r\n' : '\n'

  const kelas = new RegExp(`class\\s+${namaKelas}\\b[^{]*\\{`).exec(contents)
  if (!kelas) {
    throw new Error(`[withUkuranTetap] Kelas ${namaKelas} tidak ditemukan di berkas Kotlin hasil prebuild.`)
  }
  const akhirKelas = kelas.index + kelas[0].length
  let hasil = contents.slice(0, akhirKelas) + eol + METODE(eol) + contents.slice(akhirKelas)

  const impor = IMPOR.filter((i) => !new RegExp(`^import\\s+${i.replace(/\./g, '\\.')}\\s*$`, 'm').test(hasil))
  if (impor.length > 0) {
    const paket = /^package\s+.+$/m.exec(hasil)
    if (!paket) throw new Error(`[withUkuranTetap] Baris package tidak ditemukan di ${namaKelas}.`)
    const titik = paket.index + paket[0].length
    hasil = hasil.slice(0, titik) + eol + eol + impor.map((i) => `import ${i}`).join(eol) + hasil.slice(titik)
  }
  return hasil
}

module.exports = function withUkuranTetap(config) {
  config = withMainActivity(config, (mod) => {
    if (mod.modResults.language !== 'kt') {
      throw new Error('[withUkuranTetap] MainActivity bukan Kotlin; plugin ini hanya mendukung Kotlin.')
    }
    mod.modResults.contents = sisipkan(mod.modResults.contents, 'MainActivity')
    return mod
  })

  config = withMainApplication(config, (mod) => {
    if (mod.modResults.language !== 'kt') {
      throw new Error('[withUkuranTetap] MainApplication bukan Kotlin; plugin ini hanya mendukung Kotlin.')
    }
    mod.modResults.contents = sisipkan(mod.modResults.contents, 'MainApplication')
    return mod
  })

  return config
}
