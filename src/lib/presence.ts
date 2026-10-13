import { supabase } from '@/lib/supabase'
import type { PerfilRow } from '@/lib/profiles'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const HEARTBEAT_INTERVAL_MS = 45_000

export async function marcarConectado(): Promise<void> {
  const { error } = await supabase.rpc('marcar_conectado')
  if (error) throw error
}

export function marcarDesconectadoPorCierre(accessToken: string): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) return

  fetch(`${SUPABASE_URL}/rest/v1/rpc/actualizar_estado_usuario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ p_nuevo_estado: 'desconectado_cierre' }),
    keepalive: true,
  }).catch(() => {})
}

export async function marcarDesconectadoPorCierreAwait(): Promise<void> {
  const { error } = await supabase.rpc('actualizar_estado_usuario', {
    p_nuevo_estado: 'desconectado_cierre',
  })
  if (error) throw error
}

export function iniciarHeartbeat(): () => void {
  const interval = setInterval(() => {
    supabase.rpc('tocar_presencia').then(({ error }) => {
      if (error) console.error('No se pudo refrescar la presencia', error)
    })
  }, HEARTBEAT_INTERVAL_MS)

  return () => clearInterval(interval)
}

export interface PresenciaDispositivo {
  hayOtrosDispositivos: () => boolean
  pausar: () => void
  reanudar: () => void
  detener: () => void
}

export function iniciarPresenciaDispositivo(userId: string): PresenciaDispositivo {
  const deviceId = crypto.randomUUID()
  let activo = true
  const channel = supabase.channel(`dispositivos-${userId}`, {
    config: { presence: { key: deviceId } },
  })

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED' && activo) channel.track({ plataforma: 'escritorio' }).catch(() => {})
  })

  return {
    hayOtrosDispositivos: () =>
      Object.keys(channel.presenceState()).some((key) => key !== deviceId),
    pausar: () => {
      activo = false
      channel.untrack().catch(() => {})
    },
    reanudar: () => {
      activo = true
      channel.track({ plataforma: 'escritorio' }).catch(() => {})
    },
    detener: () => {
      activo = false
      supabase.removeChannel(channel)
    },
  }
}

export function suscribirseAMiPerfil(userId: string, onCambio: (row: PerfilRow) => void): () => void {
  const channel = supabase
    .channel(`mi-perfil-${userId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'perfiles', filter: `id=eq.${userId}` },
      (payload) => onCambio(payload.new as PerfilRow)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
