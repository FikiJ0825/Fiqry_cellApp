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
    const { kode_produk, nomor_tujuan } = await req.json();
    if (!kode_produk || !nomor_tujuan) {
      return new Response(
        JSON.stringify({ error: "kode_produk dan nomor_tujuan wajib diisi" }),
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
      .select("tier")
      .eq("id", user.id)
      .single();

    if (profilError || !profil) {
      return new Response(
        JSON.stringify({ error: "Profil agen tidak ditemukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hargaBerlaku = profil.tier === "master" 
      ? produk.harga_jual_master 
      : produk.harga_jual_biasa;

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
    const pesan_request = `{${kode_produk}.${nomor_tujuan}}.${Deno.env.get("PIN_MASTER")}`;

    const { data: transaksi, error: transaksiError } = await supabase
      .from("transaksi")
      .insert({
        agen_id: user.id,
        kode_produk,
        nomor_tujuan,
        status: "pending",
        pesan_request,
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

    try {
      const waResponse = await fetch(`${waBridgeUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomor: waCenterNumber,
          pesan: pesan_request,
        }),
      });

      if (!waResponse.ok) throw new Error("WA Bridge response tidak ok");

    } catch (waError) {
      // Kalau WA Bridge gagal, update status transaksi jadi gagal
      // Saldo TIDAK di-refund dulu — perlu cek manual
      await supabase
        .from("transaksi")
        .update({
          status: "gagal",
          pesan_balasan_mentah: "Gagal mengirim ke WA Bridge",
        })
        .eq("id", transaksi.id);

      return new Response(
        JSON.stringify({ error: "Gagal menghubungi WA Bridge, hubungi admin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan sistem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});