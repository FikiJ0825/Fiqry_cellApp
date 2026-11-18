// Pembantu OTP WhatsApp: pembuatan kode acak dan hash-nya.

/** Kode 6 digit acak yang aman secara kriptografis (tanpa bias modulo). */
export function buatKodeOtp(): string {
  const batas = 4294967296 - (4294967296 % 1000000);
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= batas);
  return String(buf[0] % 1000000).padStart(6, "0");
}

/** HMAC-SHA256(kunci server, "nomor:kode") dalam hex. Hanya hash ini yang disimpan di database. */
export async function hashOtp(kunci: string, nomor: string, kode: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(kunci), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(`${nomor}:${kode}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
