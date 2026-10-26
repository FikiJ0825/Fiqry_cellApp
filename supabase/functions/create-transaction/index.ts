import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. AUTENTIKASI
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token tidak ditemukan" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verifikasi user dari token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token tidak valid" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. AMBIL INPUT
    const body = await req.json();
    const kode_produk = typeof body?.kode_produk === "string" ? body.kode_produk.trim() : "";
    const nomor_tujuan = typeof body?.nomor_tujuan === "string" ? body.nomor_tujuan.trim() : "";
    if (!kode_produk || !nomor_tujuan) {
      return new Response(
        JSON.stringify({ error: "kode_produk dan nomor_tujuan wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // nomor_tujuan masuk apa adanya ke teks perintah JW Administrasi
    // ({KODE.TUJUAN}.PIN). Tanpa validasi, karakter seperti titik, kurung kurawal atau baris
    // baru bisa menyisipkan perintah lain (mis. produk gratis) ke dalam satu pesan.
    if (!/^[A-Za-z0-9]{4,30}$/.test(nomor_tujuan)) {
      return new Response(
        JSON.stringify({ error: "Nomor tujuan tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. VALIDASI PRODUK
    const { data: produk, error: produkError } = await supabase
      .from("produk")
      .select("kode_produk, nama, harga_jual_biasa, harga_jual_master")
      .eq("kode_produk", kode_produk)
      .eq("aktif", true)
      .single();

    if (produkError || !produk) {
      return new Response(
        JSON.stringify({ error: "Produk tidak ditemukan atau tidak aktif" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ambil tier agen untuk tentukan harga yang berlaku
    const { data: profil, error: profilError } = await supabase
      .from("profiles")
      .select("tier, aktif")
      .eq("id", user.id)
      .single();

    if (profilError || !profil) {
      return new Response(
        JSON.stringify({ error: "Profil agen tidak ditemukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profil.aktif === false) {
      return new Response(
        JSON.stringify({ error: "Akun Anda dinonaktifkan, hubungi admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hargaBerlaku = Number(
      profil.tier === "master" ? produk.harga_jual_master : produk.harga_jual_biasa,
    );

    if (!Number.isFinite(hargaBerlaku) || hargaBerlaku <= 0) {
      return new Response(
        JSON.stringify({ error: "Harga produk belum diatur, hubungi admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PIN master wajib ada sebelum saldo dipotong; tanpa ini pesan terkirim dengan "undefined".
    const pinMaster = Deno.env.get("PIN_MASTER");
    if (!pinMaster) {
      console.error("Env PIN_MASTER belum diatur");
      return new Response(
        JSON.stringify({ error: "Konfigurasi server belum lengkap, hubungi admin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. CEK & POTONG SALDO SECARA ATOMIC
    const { data: rpcData, error: rpcError } = await supabase.rpc("potong_saldo_atomic", {
      p_agen_id: user.id,
      p_harga: hargaBerlaku,
    });

    if (rpcError || !rpcData) {
      return new Response(
        JSON.stringify({ error: "Saldo tidak mencukupi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { saldo_sebelum, saldo_sesudah } = rpcData;

    // 5. BUAT BARIS TRANSAKSI
    // Format JW Administrasi: KODE.TUJUAN.PIN (tanpa kurung). PIN master hanya dikirim ke WA
    // Center; yang disimpan di DB adalah versi tersamar supaya PIN tidak tercatat di tabel.
    const pesan_request = `${kode_produk}.${nomor_tujuan}.${pinMaster}`;
    const pesan_request_tersimpan = `${kode_produk}.${nomor_tujuan}.****`;

    const { data: transaksi, error: transaksiError } = await supabase
      .from("transaksi")
      .insert({
        agen_id: user.id,
        kode_produk,
        nomor_tujuan,
        status: "pending",
        pesan_request: pesan_request_tersimpan,
        saldo_sebelum,
        saldo_sesudah,
      })
      .select("id")
      .single();

    if (transaksiError || !transaksi) {
      // Kalau insert transaksi gagal, refund saldo
      await supabase.rpc("refund_saldo", {
      p_agen_id: user.id,
      p_jumlah: hargaBerlaku,
    });
      return new Response(
        JSON.stringify({ error: "Gagal mencatat transaksi" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. KIRIM PESAN KE WA BRIDGE
    const waBridgeUrl = Deno.env.get("WA_BRIDGE_URL");
    const waCenterNumber = Deno.env.get("WA_CENTER_NUMBER");

    // Endpoint bridge: POST /send-message { nomor_tujuan, pesan } + Bearer WA_BRIDGE_SECRET
    // (sebelumnya memanggil /send tanpa Authorization dengan field "nomor", sehingga
    // setiap transaksi pasti gagal di langkah ini).
    const waBridgeSecret = Deno.env.get("WA_BRIDGE_SECRET");

    // "pasti_tidak_terkirim" = bridge menjawab error, pesan jelas tidak sampai ke WA Center,
    // aman di-refund. "tidak_pasti" = timeout / koneksi putus, pesan MUNGKIN sudah terkirim;
    // tidak di-refund otomatis supaya tidak rugi dobel, perlu cek manual oleh admin.
    let kegagalan: "pasti_tidak_terkirim" | "tidak_pasti" | null = null;

    if (!waBridgeUrl || !waCenterNumber || !waBridgeSecret) {
      console.error("Env WA_BRIDGE_URL / WA_CENTER_NUMBER / WA_BRIDGE_SECRET belum lengkap");
      kegagalan = "pasti_tidak_terkirim";
    } else {
      try {
        const waResponse = await fetch(`${waBridgeUrl}/send-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${waBridgeSecret}`,
          },
          body: JSON.stringify({
            nomor_tujuan: waCenterNumber,
            pesan: pesan_request,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!waResponse.ok) {
          console.error("WA Bridge menjawab status", waResponse.status);
          kegagalan = "pasti_tidak_terkirim";
        }
      } catch (waError) {
        console.error("Gagal menghubungi WA Bridge:", waError);
        kegagalan = "tidak_pasti";
      }
    }

    if (kegagalan) {
      const direfund = kegagalan === "pasti_tidak_terkirim";

      if (direfund) {
        const { error: refundError } = await supabase.rpc("refund_saldo", {
          p_agen_id: user.id,
          p_jumlah: hargaBerlaku,
        });
        if (refundError) {
          console.error(
            `REFUND GAGAL transaksi ${transaksi.id} (agen ${user.id}, Rp${hargaBerlaku}):`,
            refundError.message,
          );
        }
      }

      await supabase
        .from("transaksi")
        .update({
          status: "gagal",
          pesan_balasan_mentah: direfund
            ? "Gagal mengirim ke WA Bridge (saldo dikembalikan)"
            : "Gagal mengirim ke WA Bridge (status pengiriman tidak pasti, cek manual)",
        })
        .eq("id", transaksi.id);

      return new Response(
        JSON.stringify({
          error: direfund
            ? "Gagal menghubungi server transaksi, saldo dikembalikan. Coba lagi nanti."
            : "Pengiriman transaksi tidak pasti, hubungi admin sebelum mencoba lagi.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. RETURN SUKSES
    return new Response(
      JSON.stringify({
        transaksi_id: transaksi.id,
        status: "pending",
        pesan: "Transaksi sedang diproses",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("create-transaction error:", err);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan sistem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});