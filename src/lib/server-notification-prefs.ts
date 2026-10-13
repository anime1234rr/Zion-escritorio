import { useSyncExternalStore } from 'react'

import { supabase } from '@/lib/supabase'

export type ServerAlertLevel = 'todas' | 'menciones' | 'nada'
export type ChannelAlertLevel = ServerAlertLevel | 'heredar'

export interface ServerNotifPref {
  level: ServerAlertLevel
  muted: boolean
}

export const DEFAULT_SERVER_NOTIF_PREF: ServerNotifPref = {
  level: 'todas',
  muted: false,
}

const SERVER_KEY = 'zion:server-notif-prefs'
const CHANNEL_KEY = 'zion:channel-notif-prefs'
const LEVELS: ServerAlertLevel[] = ['todas', 'menciones', 'nada']
const CHANNEL_LEVELS: ChannelAlertLevel[] = ['todas', 'menciones', 'nada', 'heredar']

type ServerPrefMap = Record<string, ServerNotifPref>
type ChannelPrefMap = Record<string, ChannelAlertLevel>

function readServerPrefs(): ServerPrefMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SERVER_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<ServerNotifPref>>
    const out: ServerPrefMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      out[id] = {
        level: value.level && LEVELS.includes(value.level) ? value.level : 'todas',
        muted: Boolean(value.muted),
      }
    }
    return out
  } catch {
    return {}
  }
}

function readChannelPrefs(): ChannelPrefMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CHANNEL_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ChannelAlertLevel>
    const out: ChannelPrefMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (CHANNEL_LEVELS.includes(value)) out[id] = value
    }
    return out
  } catch {
    return {}
  }
}

let serverPrefs: ServerPrefMap = readServerPrefs()
let channelPrefs: ChannelPrefMap = readChannelPrefs()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function persistServer() {
  try {
    window.localStorage.setItem(SERVER_KEY, JSON.stringify(serverPrefs))
  } catch {
    return
  }
  emit()
}

function persistChannel() {
  try {
    window.localStorage.setItem(CHANNEL_KEY, JSON.stringify(channelPrefs))
  } catch {
    return
  }
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function usuarioActual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function sincronizarServidor(serverId: string): Promise<void> {
  const usuarioId = await usuarioActual()
  if (!usuarioId) return
  const pref = serverPrefs[serverId]
  if (!pref) {
    await supabase
      .from('preferencias_notificacion_servidor')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('servidor_id', serverId)
    return
  }
  await supabase.from('preferencias_notificacion_servidor').upsert({
    usuario_id: usuarioId,
    servidor_id: serverId,
    nivel: pref.level,
    silenciado: pref.muted,
    actualizado_at: new Date().toISOString(),
  })
}

async function sincronizarCanal(channelId: string): Promise<void> {
  const usuarioId = await usuarioActual()
  if (!usuarioId) return
  const nivel = channelPrefs[channelId]
  if (!nivel || nivel === 'heredar') {
    await supabase
      .from('preferencias_notificacion_canal')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('canal_id', channelId)
    return
  }
  await supabase.from('preferencias_notificacion_canal').upsert({
    usuario_id: usuarioId,
    canal_id: channelId,
    nivel,
    actualizado_at: new Date().toISOString(),
  })
}

export async function sincronizarPreferenciasNotificacion(): Promise<void> {
  await Promise.all([
    ...Object.keys(serverPrefs).map((id) => sincronizarServidor(id).catch(() => {})),
    ...Object.keys(channelPrefs).map((id) => sincronizarCanal(id).catch(() => {})),
  ])
}

export function getServerNotifPref(serverId: string): ServerNotifPref {
  return serverPrefs[serverId] ?? DEFAULT_SERVER_NOTIF_PREF
}

export function setServerAlertLevel(serverId: string, level: ServerAlertLevel): void {
  serverPrefs = { ...serverPrefs, [serverId]: { ...getServerNotifPref(serverId), level } }
  persistServer()
  void sincronizarServidor(serverId).catch(() => {})
}

export function setServerMuted(serverId: string, muted: boolean): void {
  serverPrefs = { ...serverPrefs, [serverId]: { ...getServerNotifPref(serverId), muted } }
  persistServer()
  void sincronizarServidor(serverId).catch(() => {})
}

export function toggleServerMuted(serverId: string): void {
  setServerMuted(serverId, !getServerNotifPref(serverId).muted)
}

export function olvidarServerNotifPref(serverId: string): void {
  if (!(serverId in serverPrefs)) return
  const next = { ...serverPrefs }
  delete next[serverId]
  serverPrefs = next
  persistServer()
  void sincronizarServidor(serverId).catch(() => {})
}

export function getChannelNotifLevel(channelId: string): ChannelAlertLevel {
  return channelPrefs[channelId] ?? 'heredar'
}

export function setChannelNotifLevel(channelId: string, level: ChannelAlertLevel): void {
  if (level === 'heredar') {
    olvidarChannelNotifPref(channelId)
    return
  }
  channelPrefs = { ...channelPrefs, [channelId]: level }
  persistChannel()
  void sincronizarCanal(channelId).catch(() => {})
}

export function olvidarChannelNotifPref(channelId: string): void {
  if (!(channelId in channelPrefs)) return
  const next = { ...channelPrefs }
  delete next[channelId]
  channelPrefs = next
  persistChannel()
  void sincronizarCanal(channelId).catch(() => {})
}

function nivelPermiteTipo(level: ServerAlertLevel, tipo: string): boolean {
  if (level === 'nada') return false
  if (level === 'menciones') return tipo === 'mencion'
  return true
}

export function debeAlertarNotificacion(
  notificacion: { servidorId: string | null; tipo: string },
  canalId?: string | null
): boolean {
  if (!notificacion.servidorId) return true

  const pref = getServerNotifPref(notificacion.servidorId)
  if (pref.muted) return false

  const canalLevel = canalId ? getChannelNotifLevel(canalId) : 'heredar'
  const efectivo = canalLevel === 'heredar' ? pref.level : canalLevel
  return nivelPermiteTipo(efectivo, notificacion.tipo)
}

export function useServerNotifPref(serverId: string): ServerNotifPref {
  return useSyncExternalStore(
    subscribe,
    () => serverPrefs[serverId] ?? DEFAULT_SERVER_NOTIF_PREF,
    () => DEFAULT_SERVER_NOTIF_PREF
  )
}

export function useChannelNotifLevel(channelId: string): ChannelAlertLevel {
  return useSyncExternalStore(
    subscribe,
    () => channelPrefs[channelId] ?? 'heredar',
    () => 'heredar'
  )
}
