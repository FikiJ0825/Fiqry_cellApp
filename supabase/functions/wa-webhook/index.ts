import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================
// PARSER BALASAN JW ADMINISTRASI
// =====================
function parseBalasan(teks: string): {
  tipe: "berhasil" | "gagal" | "diproses" | "tidak_dikenal";
  kode_produk?: string;
  nomor_tujuan?: string;
  alasan?: string;
} {
  // Pola: berhasil — "TSEL10.081234567890.SUCCESS.150000"
  const polaBerhasil = /^(\w+)\.(\d+)\.(SUCCESS|SUKSES|BERHASIL)/i;
  // Pola: saldo tidak mencukupi
  const polaSaldoKurang = /TRX (\w+)\.(\d+) tdk diproses, saldo/i;
  // Pola: PIN salah
  const polaPinSalah = /kode PIN Anda salah/i;
  // Pola: nomor diluar area
  const polaLuarArea = /pembelian (\w+)\.(\d+) gagal diproses, No ponsel diluar area/i;
  // Pola: sedang diproses (>1 menit)
  const polaDiproses = /Pembelian (\w+)\.(\d+) Transaksi sdng dlm proses/i;

  if (polaBerhasil.test(teks)) {
    const match = teks.match(polaBerhasil)!;
    return { tipe: "berhasil", kode_produk: match[1], nomor_tujuan: match[2] };
  }

  if (polaSaldoKurang.test(teks)) {
    const match = teks.match(polaSaldoKurang)!;
    return { tipe: "gagal", kode_produk: match[1], nomor_tujuan: match[2], alasan: "Saldo master tidak mencukupi" };
  }

  if (polaPinSalah.test(teks)) {
    return { tipe: "gagal", alasan: "PIN master salah" };
  }

  if (polaLuarArea.test(teks)) {
    const match = teks.match(polaLuarArea)!;
    return { tipe: "gagal", kode_produk: match[1], nomor_tujuan: match[2], alasan: "Nomor diluar area" };
  }

  if (polaDiproses.test(teks)) {
    const match = teks.match(polaDiproses)!;
    return { tipe: "diproses", kode_produk: match[1], nomor_tujuan: match[2] };
  }

  return { tipe: "tidak_dikenal" };
}

// =====================
// MAIN HANDLER
// =====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { nomor, pesan } = body;

    if (typeof pesan !== "string" || !pesan.trim()) {
      return new Response(
        JSON.stringify({ error: "Field pesan wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. LOG PESAN MASUK KE wa_log
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
      return new Response(
        JSON.stringify({ pesan: "Balasan tidak dikenal, diabaikan" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusBaru =
      hasil.tipe === "berhasil" ? "berhasil" :
      hasil.tipe === "diproses" ? "diproses" : "gagal";

    // 3. MATCHING KE TRANSAKSI YANG MASIH BERJALAN
    // Strategi FIFO: ambil transaksi tertua dengan kode_produk + nomor_tujuan yang cocok.
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

    const { data: transaksi, error: transaksiError } = await query.maybeSingle();

    if (transaksiError || !transaksi) {
      // Tidak ada transaksi yang cocok — mungkin sudah final atau salah parse
      return new Response(
        JSON.stringify({ pesan: "Tidak ada transaksi berjalan yang cocok" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. UPDATE STATUS TRANSAKSI (idempotent)
    // Guard .in("status", ...) membuat update hanya berlaku sekali: kalau balasan yang sama
    // datang dua kali / dua request balapan, yang kedua mendapat 0 baris dan berhenti di sini,
    // sehingga refund dan bonus tidak terpanggil dua kali.
    const { data: diupdate, error: updateError } = await supabase
      .from("transaksi")
      .update({
        status: statusBaru,
        pesan_balasan_mentah: pesan,
      })
      .eq("id", transaksi.id)
      .in("status", statusBisaDiubah)
      .select("id");

    if (updateError) {
      console.error("Gagal update status transaksi:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Gagal update status transaksi" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!diupdate || diupdate.length === 0) {
      return new Response(
        JSON.stringify({ pesan: "Transaksi sudah diproses oleh balasan lain, diabaikan" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      // Refund pakai saldo_sebelum - saldo_sesudah yang sudah tercatat di transaksi
      // (lebih akurat daripada query ulang harga produk, karena harga bisa saja
      // sudah berubah di tabel produk sejak transaksi ini dibuat)
      const jumlahRefund = transaksi.saldo_sebelum - transaksi.saldo_sesudah;

      if (jumlahRefund > 0) {
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
    }

    return new Response(
      JSON.stringify({
        pesan: `Transaksi ${transaksi.id} diupdate menjadi ${statusBaru}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("wa-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan sistem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
