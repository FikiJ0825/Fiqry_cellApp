// Util PIN transaksi agen: hash PBKDF2-SHA256 lewat WebCrypto (tersedia di Deno).
// Format tersimpan: "<salt_hex>:<hash_hex>".

const ITERASI = 100_000;
const encoder = new TextEncoder();

export const POLA_PIN = /^\d{6}$/;

function keHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function dariHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function turunkan(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const kunci = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERASI },
    kunci,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await turunkan(pin, salt);
  return `${keHex(salt)}:${keHex(hash)}`;
}

export async function cocokkanPin(pin: string, tersimpan: string): Promise<boolean> {
  const [saltHex, hashHex] = tersimpan.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = await turunkan(pin, dariHex(saltHex));
  const target = dariHex(hashHex);
  if (hash.length !== target.length) return false;
  let beda = 0;
  for (let i = 0; i < hash.length; i++) beda |= hash[i] ^ target[i];
  return beda === 0;
}

export interface HasilPeriksaPin {
  ok: boolean;
  status?: number;
  kode?: "PIN_BELUM_ADA" | "PIN_SALAH" | "PIN_TERKUNCI";
  error?: string;
}

// deno-lint-ignore no-explicit-any
export async function periksaPin(supabase: any, agenId: string, pin: unknown): Promise<HasilPeriksaPin> {
  const { data: baris } = await supabase
    .from("pin_agen")
    .select("pin_hash, gagal, terkunci_sampai")
    .eq("agen_id", agenId)
    .maybeSingle();

  if (!baris) {
    return { ok: false, status: 403, kode: "PIN_BELUM_ADA", error: "PIN transaksi belum dibuat. Buat PIN di menu Profil." };
  }

  if (baris.terkunci_sampai && new Date(baris.terkunci_sampai).getTime() > Date.now()) {
    return { ok: false, status: 429, kode: "PIN_TERKUNCI", error: "PIN terkunci sementara karena salah terlalu sering. Coba lagi dalam 15 menit." };
  }

  if (typeof pin !== "string" || !POLA_PIN.test(pin) || !(await cocokkanPin(pin, baris.pin_hash))) {
    const kunci = await supabase.rpc("catat_pin_gagal", { p_agen_id: agenId });
    if (kunci.data) {
      return { ok: false, status: 429, kode: "PIN_TERKUNCI", error: "PIN salah 5 kali. PIN terkunci 15 menit." };
    }
    return { ok: false, status: 403, kode: "PIN_SALAH", error: "PIN salah" };
  }

  if (baris.gagal > 0 || baris.terkunci_sampai) {
    await supabase.rpc("reset_pin_gagal", { p_agen_id: agenId });
  }
  return { ok: true };
}
