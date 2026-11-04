import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CATATAN,
  formatKeDariPesan,
  type HasilBalasan,
  MAKS_FORMAT_KE,
  parseBalasan,
  susunPesanRequest,
  susunPesanTersimpan,
} from "../_shared/balasan.ts";
import { kirimKeWaCenter } from "../_shared/wa-center.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Klien = ReturnType<typeof createClient>;

interface TransaksiBerjalan {
  id: string;
  agen_id: string;
  kode_produk: string;
  nomor_tujuan: string;
  saldo_sebelum: number;
  saldo_sesudah: number;
  status?: string;
  pesan_request?: string;
}

function balas(isi: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(isi), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Perbandingan string tanpa bocor lewat waktu respons (panjang berbeda tetap ditolak)
function samaWaktuKonstan(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let beda = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) {
    beda |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return beda === 0;
}

// Refund pakai saldo_sebelum - saldo_sesudah yang sudah tercatat di transaksi (lebih akurat daripada
// query ulang harga produk, karena harga bisa saja sudah berubah di tabel produk sejak transaksi dibuat)
async function refundTransaksi(supabase: Klien, transaksi: TransaksiBerjalan): Promise<void> {
  const jumlahRefund = transaksi.saldo_sebelum - transaksi.saldo_sesudah;
  if (jumlahRefund <= 0) return;

  const { error: refundError } = await supabase.rpc("refund_saldo", {
    p_agen_id: transaksi.agen_id,
    p_jumlah: jumlahRefund,
  });
  if (refundError) {
    // Status sudah "gagal" tapi saldo belum kembali — harus ditindak manual oleh admin
    console.error(
      `REFUND GAGAL transaksi ${transaksi.id} (agen ${transaksi.agen_id}, Rp${jumlahRefund}):`,
      refundError.message,
    );
  }
}

// SN dan catatan untuk agen disimpan di langkah terpisah dan best-effort: kolomnya baru ada setelah
// migrasi 010, dan kegagalan di sini tidak boleh membatalkan perubahan status atau refund.
async function simpanDetail(
  supabase: Klien,
  transaksiId: string,
  detail: { sn?: string; catatan?: string },
): Promise<void> {
  const isi: Record<string, string> = {};
  if (detail.sn) isi.sn = detail.sn;
  if (detail.catatan) isi.catatan = detail.catatan;
  if (Object.keys(isi).length === 0) return;

  const { error } = await supabase.from("transaksi").update(isi).eq("id", transaksiId);
  if (error) console.error(`Gagal menyimpan sn/catatan transaksi ${transaksiId}:`, error.message);
}

// Tutup transaksi yang masih berjalan sebagai gagal. Guard status membuat ini hanya berlaku sekali.
async function gagalkanTransaksi(
  supabase: Klien,
  transaksi: TransaksiBerjalan,
  opsi: { catatan: string; refund: boolean; catatanAdmin?: string },
): Promise<boolean> {
  const { data: diupdate, error } = await supabase
    .from("transaksi")
    .update({
      status: "gagal",
      ...(opsi.catatanAdmin ? { pesan_balasan_mentah: opsi.catatanAdmin } : {}),
    })
    .eq("id", transaksi.id)
    .in("status", ["pending", "diproses"])
    .select("id");

  if (error) {
    console.error("Gagal menggagalkan transaksi:", error.message);
    return false;
  }
  if (!diupdate || diupdate.length === 0) return false;

  if (opsi.refund) await refundTransaksi(supabase, transaksi);
  await simpanDetail(supabase, transaksi.id, { catatan: opsi.catatan });
  return true;
}

// JW menolak karena produk + tujuan sama sudah pernah dibeli hari ini. Kirim ulang dengan format
// transaksi ganda KODE.N.TUJUAN.PIN (N = urutan), naik satu tiap kali JW masih menjawab duplikat.
async function tanganiDuplikat(supabase: Klien, hasil: HasilBalasan): Promise<Response> {
  let query = supabase
    .from("transaksi")
    .select("id, agen_id, kode_produk, nomor_tujuan, saldo_sebelum, saldo_sesudah, pesan_request")
    .eq("status", "pending")
    .order("dibuat_pada", { ascending: true })
    .limit(1);
  if (hasil.kode_produk) query = query.eq("kode_produk", hasil.kode_produk);
  if (hasil.nomor_tujuan) query = query.eq("nomor_tujuan", hasil.nomor_tujuan);

  const { data, error } = await query.maybeSingle();
  const transaksi = data as TransaksiBerjalan | null;
  if (error || !transaksi) {
    return balas({ pesan: "Tidak ada transaksi pending yang cocok dengan balasan duplikat" });
  }

  const keBaru = formatKeDariPesan(transaksi.pesan_request) + 1;
  if (keBaru > MAKS_FORMAT_KE) {
    await gagalkanTransaksi(supabase, transaksi, {
      catatan: CATATAN.gandaTerlaluBanyak,
      refund: true,
      catatanAdmin: `Duplikat di JW melebihi format ke-${MAKS_FORMAT_KE} (saldo dikembalikan)`,
    });
    return balas({ pesan: `Transaksi ${transaksi.id} digagalkan: duplikat melebihi batas` });
  }

  const pinMaster = Deno.env.get("PIN_MASTER");
  if (!pinMaster) {
    console.error("Env PIN_MASTER belum diatur, tidak bisa kirim ulang format transaksi ganda");
    await gagalkanTransaksi(supabase, transaksi, { catatan: CATATAN.internal, refund: true });
    return balas({ pesan: "PIN_MASTER belum diatur, transaksi digagalkan" });
  }

  // Klaim dulu: update dijaga pesan_request lama, jadi balasan duplikat yang datang dua kali
  // (mis. bridge mengulang kirim) hanya memicu satu kirim ulang.
  const { data: klaim, error: klaimError } = await supabase
    .from("transaksi")
    .update({ pesan_request: susunPesanTersimpan(transaksi.kode_produk, transaksi.nomor_tujuan, keBaru) })
    .eq("id", transaksi.id)
    .eq("status", "pending")
    .eq("pesan_request", transaksi.pesan_request ?? "")
    .select("id");

  if (klaimError) {
    console.error("Gagal mengklaim kirim ulang transaksi ganda:", klaimError.message);
    return balas({ error: "Gagal memproses balasan duplikat" }, 500);
  }
  if (!klaim || klaim.length === 0) {
    return balas({ pesan: "Balasan duplikat sudah ditangani" });
  }

  const hasilKirim = await kirimKeWaCenter(
    susunPesanRequest(transaksi.kode_produk, transaksi.nomor_tujuan, pinMaster, keBaru),
  );

  if (hasilKirim === "terkirim") {
    return balas({ pesan: `Transaksi ${transaksi.id} dikirim ulang dengan format ke-${keBaru}` });
  }

  const refund = hasilKirim === "pasti_tidak_terkirim";
  await gagalkanTransaksi(supabase, transaksi, {
    catatan: CATATAN.internal,
    refund,
    catatanAdmin: refund
      ? "Gagal kirim ulang format transaksi ganda ke WA Bridge (saldo dikembalikan)"
      : "Kirim ulang format transaksi ganda tidak pasti, cek manual",
  });
  return balas({ pesan: `Transaksi ${transaksi.id} digagalkan: kirim ulang ${hasilKirim}` });
}

// =====================
// MAIN HANDLER
// =====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Webhook ini verify_jwt = false (lihat config.toml) dan URL-nya publik. Tanpa pengecekan
  // ini siapa pun bisa mengirim balasan "gagal"/"SUCCESS" palsu dan memicu refund / bonus.
  // wa-bridge mengirim Authorization: Bearer <WA_BRIDGE_SECRET>, secret bersama yang stabil.
  // Jangan menggantungkan ini hanya pada SUPABASE_SERVICE_ROLE_KEY: secret bawaan Supabase bisa
  // diganti otomatis (terjadi 2026-11-04) sehingga kunci di .env bridge tidak lagi sama dan semua
  // balasan ditolak 401. Kunci service role tetap diterima agar tidak memutus pemakai lama.
  const diterima = [
    Deno.env.get("WA_BRIDGE_SECRET"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ].filter((nilai): nilai is string => Boolean(nilai));
  const header = req.headers.get("Authorization") ?? "";
  if (!diterima.some((nilai) => samaWaktuKonstan(header, `Bearer ${nilai}`))) {
    return balas({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { nomor, pesan } = body;

    if (typeof pesan !== "string" || !pesan.trim()) {
      return balas({ error: "Field pesan wajib diisi" }, 400);
    }

    // 1. LOG PESAN MASUK KE wa_log
    // Teks mentah hanya boleh ada di sini (khusus admin): memuat saldo & harga modal master.
    const { error: logError } = await supabase.from("wa_log").insert({
      arah: "masuk",
      nomor: nomor ?? null,
      pesan,
    });
    if (logError) {
      console.error("Gagal menulis wa_log:", logError.message);
    }

    // 2. PARSE BALASAN
    const hasil = parseBalasan(pesan);

    if (hasil.tipe === "tidak_dikenal") {
      return balas({ pesan: "Balasan tidak dikenal, diabaikan" });
    }

    if (hasil.tipe === "duplikat") {
      return await tanganiDuplikat(supabase, hasil);
    }

    const statusBaru =
      hasil.tipe === "berhasil" ? "berhasil" :
      hasil.tipe === "diproses" ? "diproses" : "gagal";

    // 3. MATCHING KE TRANSAKSI YANG MASIH BERJALAN
    // Strategi FIFO: ambil transaksi tertua dengan kode_produk + nomor_tujuan yang cocok
    // (balasan H2H dengan SN tidak memuat keduanya, jadi memakai transaksi tertua yang berjalan).
    // - balasan "diproses" hanya boleh menggeser transaksi yang masih pending
    // - balasan final (berhasil/gagal) boleh menutup pending maupun diproses
    //   (sebelumnya transaksi yang sudah "diproses" tidak pernah bisa selesai)
    const statusBisaDiubah = statusBaru === "diproses" ? ["pending"] : ["pending", "diproses"];

    let query = supabase
      .from("transaksi")
      .select("id, agen_id, kode_produk, nomor_tujuan, saldo_sebelum, saldo_sesudah, status")
      .in("status", statusBisaDiubah)
      .order("dibuat_pada", { ascending: true })
      .limit(1);

    if (hasil.kode_produk) query = query.eq("kode_produk", hasil.kode_produk);
    if (hasil.nomor_tujuan) query = query.eq("nomor_tujuan", hasil.nomor_tujuan);

    const { data, error: transaksiError } = await query.maybeSingle();
    const transaksi = data as TransaksiBerjalan | null;

    if (transaksiError || !transaksi) {
      // Tidak ada transaksi yang cocok — mungkin sudah final atau salah parse
      return balas({ pesan: "Tidak ada transaksi berjalan yang cocok" });
    }

    // 4. UPDATE STATUS TRANSAKSI (idempotent)
    // Guard .in("status", ...) membuat update hanya berlaku sekali: kalau balasan yang sama
    // datang dua kali / dua request balapan, yang kedua mendapat 0 baris dan berhenti di sini,
    // sehingga refund dan bonus tidak terpanggil dua kali.
    const { data: diupdate, error: updateError } = await supabase
      .from("transaksi")
      .update({ status: statusBaru })
      .eq("id", transaksi.id)
      .in("status", statusBisaDiubah)
      .select("id");

    if (updateError) {
      console.error("Gagal update status transaksi:", updateError.message);
      return balas({ error: "Gagal update status transaksi" }, 500);
    }

    if (!diupdate || diupdate.length === 0) {
      return balas({ pesan: "Transaksi sudah diproses oleh balasan lain, diabaikan" });
    }

    // 4A. SN + catatan untuk halaman Detail Transaksi di app
    await simpanDetail(supabase, transaksi.id, { sn: hasil.sn, catatan: hasil.catatan });

    // 4B. KALAU BERHASIL → UPDATE PROGRESS REFERRAL & CEK BONUS HARIAN
    if (statusBaru === "berhasil") {
      const { error: referralError } = await supabase.rpc(
        "update_referral_progress",
        {
          user_id: transaksi.agen_id,
        },
      );
      if (referralError) {
        console.error("Gagal update referral progress:", referralError.message);
      }

      const { error: bonusError } = await supabase.rpc(
        "cek_bonus_transaksi_harian",
        {
          user_id: transaksi.agen_id,
        },
      );
      if (bonusError) {
        console.error("Gagal cek bonus transaksi harian:", bonusError.message);
      }
    }

    // 5. KALAU GAGAL → REFUND SALDO AGEN
    if (statusBaru === "gagal") {
      await refundTransaksi(supabase, transaksi);
    }

    return balas({ pesan: `Transaksi ${transaksi.id} diupdate menjadi ${statusBaru}` });

  } catch (err) {
    console.error("wa-webhook error:", err);
    return balas({ error: "Terjadi kesalahan sistem" }, 500);
  }
});
