import { useSyncExternalStore } from 'react'

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

export function getServerNotifPref(serverId: string): ServerNotifPref {
  return serverPrefs[serverId] ?? DEFAULT_SERVER_NOTIF_PREF
}

export function setServerAlertLevel(serverId: string, level: ServerAlertLevel): void {
  serverPrefs = { ...serverPrefs, [serverId]: { ...getServerNotifPref(serverId), level } }
  persistServer()
}

export function setServerMuted(serverId: string, muted: boolean): void {
  serverPrefs = { ...serverPrefs, [serverId]: { ...getServerNotifPref(serverId), muted } }
  persistServer()
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
}

export function olvidarChannelNotifPref(channelId: string): void {
  if (!(channelId in channelPrefs)) return
  const next = { ...channelPrefs }
  delete next[channelId]
  channelPrefs = next
  persistChannel()
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
