import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { nomorWaKeEmail, nomorWaValid, normalisasiNomorWa } from "../_shared/nomor.ts";
import { hashOtp } from "../_shared/otp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function balas(isi: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(isi), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PESAN_OTP: Record<string, string> = {
  salah: "Kode verifikasi salah",
  kedaluwarsa: "Kode verifikasi kedaluwarsa. Minta kode baru",
  terlalu_banyak: "Terlalu banyak salah memasukkan kode. Minta kode baru",
};

// Membuat akun setelah OTP WhatsApp terbukti benar. Pendaftaran langsung lewat supabase.auth.signUp
// harus dimatikan di pengaturan Auth (Allow new users to sign up = off) supaya OTP tidak bisa dilewati.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const kunciService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !kunciService) {
      console.error("SUPABASE_URL / SERVICE_ROLE_KEY belum tersedia");
      return balas({ error: "Konfigurasi server belum lengkap" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const nama = typeof body?.nama === "string" ? body.nama.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    const kodeReferral = typeof body?.kode_referral === "string" ? body.kode_referral.trim() : "";
    const nomor = normalisasiNomorWa(typeof body?.nomor_wa === "string" ? body.nomor_wa : "");

    if (!nama || nama.length > 100) return balas({ error: "Nama lengkap wajib diisi (maks. 100 karakter)" }, 400);
    if (!nomorWaValid(nomor)) return balas({ error: "Nomor WhatsApp tidak valid" }, 400);
    if (password.length < 6 || password.length > 72) return balas({ error: "Password minimal 6 karakter" }, 400);
    if (!/^\d{6}$/.test(otp)) return balas({ error: "Kode verifikasi harus 6 digit" }, 400);

    const service = createClient(url, kunciService);

    const { data: ada } = await service.from("profiles").select("id").eq("nomor_wa", nomor).maybeSingle();
    if (ada) return balas({ error: "Nomor WhatsApp sudah terdaftar" }, 409);

    if (kodeReferral) {
      const { data: valid } = await service.rpc("cek_kode_referral", { p_kode: kodeReferral });
      if (valid !== true) return balas({ error: "Kode referral tidak valid" }, 400);
    }

    // 1) Periksa OTP tanpa menghabiskannya: bila pembuatan akun gagal, pengguna tidak perlu kode baru
    const hash = await hashOtp(kunciService, nomor, otp);
    const { data: hasilOtp, error: errOtp } = await service.rpc("periksa_otp_wa", {
      p_nomor: nomor, p_hash: hash, p_pakai: false,
    });
    if (errOtp) {
      console.error("periksa_otp_wa gagal:", errOtp.message);
      return balas({ error: "Gagal memeriksa kode verifikasi" }, 500);
    }
    if (hasilOtp !== "ok") {
      return balas({ error: PESAN_OTP[hasilOtp as string] ?? "Kode verifikasi tidak valid", kode: "OTP_" + String(hasilOtp).toUpperCase() }, 400);
    }

    // 2) Buat akun (email palsu dari nomor, tanpa konfirmasi email). Trigger handle_pengguna_baru membuat profil.
    const email = nomorWaKeEmail(nomor);
    const { data: dibuat, error: errBuat } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama },
    });
    if (errBuat || !dibuat?.user) {
      const pesan = (errBuat?.message ?? "").toLowerCase();
      if (pesan.includes("already") || pesan.includes("registered") || pesan.includes("exists")) {
        return balas({ error: "Nomor WhatsApp sudah terdaftar" }, 409);
      }
      console.error("createUser gagal:", errBuat?.message);
      return balas({ error: "Gagal membuat akun, coba lagi" }, 500);
    }

    const userId = dibuat.user.id;

    // 3) Lengkapi profil. Bila gagal, batalkan akun agar nomor tidak "terkunci" setengah jadi.
    const { error: errProfil } = await service
      .from("profiles")
      .update({ nama, nomor_wa: nomor, email_auth: email })
      .eq("id", userId);
    if (errProfil) {
      console.error("Update profil gagal, akun dibatalkan:", errProfil.message);
      await service.auth.admin.deleteUser(userId);
      return balas({ error: "Gagal menyimpan profil, coba lagi" }, 500);
    }

    // 4) Habiskan OTP, lalu pasang referral (kegagalan referral tidak menggagalkan pendaftaran)
    await service.rpc("periksa_otp_wa", { p_nomor: nomor, p_hash: hash, p_pakai: true });

    let referralTerpasang = true;
    if (kodeReferral) {
      const { data: ok, error: errRef } = await service.rpc("pasang_referral_untuk", {
        p_user: userId, p_kode: kodeReferral,
      });
      referralTerpasang = !errRef && ok === true;
      if (errRef) console.error("pasang_referral_untuk gagal:", errRef.message);
    }

    return balas({ status: "terdaftar", referral_terpasang: referralTerpasang });
  } catch (err) {
    console.error("daftar error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
