import { useCallback, useEffect, useId, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Notifikasi {
  id: string
  jenis: 'transaksi' | 'topup' | 'saldo'
  judul: string
  isi: string
  ref_id: string | null
  dibaca: boolean
  dibuat_pada: string
}

const BATAS = 50

export async function ambilNotifikasi(): Promise<Notifikasi[]> {
  const { data, error } = await supabase
    .from('notifikasi')
    .select('id, jenis, judul, isi, ref_id, dibaca, dibuat_pada')
    .order('dibuat_pada', { ascending: false })
    .limit(BATAS)
  if (error) throw new Error(error.message)
  return (data ?? []) as Notifikasi[]
}

/** Tandai satu notifikasi dibaca, atau semuanya bila id dikosongkan. */
export async function tandaiDibaca(id?: string): Promise<void> {
  const { error } = await supabase.rpc('tandai_notifikasi_dibaca', { p_id: id ?? null })
  if (error) throw new Error(error.message)
}

/** Jumlah notifikasi belum dibaca milik pengguna, diperbarui langsung lewat Realtime. */
export function useJumlahBelumDibaca(profilId: string | undefined): { jumlah: number; muatUlang: () => void } {
  const [jumlah, setJumlah] = useState(0)

  const muatUlang = useCallback(() => {
    if (!profilId) return
    supabase
      .from('notifikasi')
      .select('id', { count: 'exact', head: true })
      .eq('agen_id', profilId)
      .eq('dibaca', false)
      .then(({ count }) => setJumlah(count ?? 0))
  }, [profilId])

  // Nama channel unik per instance: channel dengan topik yang sama masih terdaftar di klien Realtime
  // saat layar di-mount ulang (mis. setelah Tur Aplikasi), dan .on() setelah subscribe() melempar error.
  const idInstan = useId().replace(/[^a-zA-Z0-9]/g, '')

  useEffect(() => {
    if (!profilId) return
    muatUlang()
    let channel: RealtimeChannel | null = null
    try {
      channel = supabase
        .channel(`notif-badge-${profilId}-${idInstan}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifikasi', filter: `agen_id=eq.${profilId}` },
          () => muatUlang(),
        )
        .subscribe()
    } catch (err) {
      console.warn('Realtime badge notifikasi gagal dimulai', err)
    }
    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [profilId, muatUlang, idInstan])

  return { jumlah, muatUlang }
}
