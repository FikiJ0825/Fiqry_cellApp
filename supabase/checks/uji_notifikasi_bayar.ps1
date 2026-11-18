# Simulasi notifikasi "uang masuk" ke Edge Function terima-notifikasi-bayar.
# Secret TIDAK disimpan di file ini; masukkan lewat parameter (jangan ditempel di chat).
#
# 1) Buat pesanan QRIS / top up di aplikasi, catat TOTAL BAYAR yang tampil (mis. 10037).
# 2) Kirim notifikasi palsu dengan nominal yang sama:
#      .\uji_notifikasi_bayar.ps1 -Secret <NOTIF_BAYAR_SECRET> -Nominal 10037
#    Hasil yang diharapkan: {"hasil":"cocok"}, pesanan jadi pending / saldo bertambah.
# 3) Kirim ulang perintah yang sama: {"hasil":"tidak_cocok"} (tidak boleh kredit dua kali).
# 4) Secret salah: HTTP 401.  Nominal tidak ada pesanannya: {"hasil":"tidak_cocok"}.
#
# Untuk menguji teks notifikasi ASLI, pakai -Teks "<salin isi notifikasi DANA>"; -Nominal diabaikan.
param(
  [Parameter(Mandatory)] [string] $Secret,
  [string] $Nominal = '10037',
  [string] $Teks = '',
  [string] $Url = 'https://clbinerltxwxobbtxfad.supabase.co/functions/v1/terima-notifikasi-bayar'
)

if (-not $Teks) { $Teks = "Kamu menerima Rp $('{0:N0}' -f [int]$Nominal -replace ',', '.') dari UJI COBA" }

$body = @{ teks = $Teks } | ConvertTo-Json -Compress

try {
  $res = Invoke-WebRequest -Uri $Url -Method Post -Body $body -ContentType 'application/json' `
    -Headers @{ 'x-notif-secret' = $Secret } -UseBasicParsing
  "HTTP $($res.StatusCode): $($res.Content)"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  "HTTP ${status}: $($_.ErrorDetails.Message)"
}
