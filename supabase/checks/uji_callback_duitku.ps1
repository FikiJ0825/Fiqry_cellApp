# Simulasi callback Duitku ke Edge Function duitku-callback (untuk uji idempotensi & keamanan).
# API key TIDAK disimpan di file ini; masukkan lewat parameter / prompt.
#
# Contoh (kirim callback yang valid, dua kali, saldo harus bertambah sekali):
#   .\uji_callback_duitku.ps1 -MerchantCode DSxxxx -ApiKey <api-key-sandbox> -OrderId TPxxxx -Amount 10000
#   .\uji_callback_duitku.ps1 -MerchantCode DSxxxx -ApiKey <api-key-sandbox> -OrderId TPxxxx -Amount 10000
#
# Uji signature salah (harus ditolak 401, saldo tidak berubah):
#   .\uji_callback_duitku.ps1 -MerchantCode DSxxxx -ApiKey salah -OrderId TPxxxx -Amount 10000
#
# Catatan: callback valid tetap dikonfirmasi ke API transactionStatus Duitku, jadi order harus
# benar-benar sudah dibayar di sandbox agar saldo bertambah.
param(
  [Parameter(Mandatory)] [string] $MerchantCode,
  [Parameter(Mandatory)] [string] $ApiKey,
  [Parameter(Mandatory)] [string] $OrderId,
  [Parameter(Mandatory)] [string] $Amount,
  [string] $ResultCode = '00',
  [string] $Url = 'https://clbinerltxwxobbtxfad.supabase.co/functions/v1/duitku-callback'
)

$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($ApiKey)
$bytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($MerchantCode + $Amount + $OrderId))
$signature = -join ($bytes | ForEach-Object { $_.ToString('x2') })

$body = @{
  merchantCode    = $MerchantCode
  amount          = $Amount
  merchantOrderId = $OrderId
  productDetail   = 'Top up saldo AdePulsa'
  resultCode      = $ResultCode
  reference       = 'UJI-CALLBACK'
  signature       = $signature
}

try {
  $res = Invoke-WebRequest -Uri $Url -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
  "HTTP $($res.StatusCode): $($res.Content)"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  "HTTP ${status}: $($_.ErrorDetails.Message)"
}
