import { useSyncExternalStore } from 'react'

import { db, type SavedMessageRow } from '@/lib/db'
import type { ChatMessage } from '@/lib/types'

let ids = new Set<string>()
let cargado = false
const listeners = new Set<() => void>()

function emit() {
  ids = new Set(ids)
  for (const listener of listeners) listener()
}

async function asegurarCargado() {
  if (cargado) return
  cargado = true
  try {
    const claves = await db.savedMessages.orderBy('savedAt').primaryKeys()
    ids = new Set(claves as string[])
    emit()
  } catch {
    cargado = false
  }
}

void asegurarCargado()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  void asegurarCargado()
  return () => listeners.delete(listener)
}

function previewDeMensaje(message: ChatMessage): string {
  if (message.content?.trim()) return message.content.trim().slice(0, 200)
  if (message.code?.code?.trim()) return message.code.code.trim().slice(0, 200)
  if (message.attachment) return `[${message.attachment.type}]`
  if (message.embed?.title) return message.embed.title
  return '[mensaje]'
}

export interface SaveMessageContext {
  scope: 'canal' | 'dm'
  serverId?: string | null
  serverName?: string | null
  channelId?: string | null
  channelName?: string | null
  conversationId?: string | null
  link?: string | null
}

export async function alternarMensajeGuardado(
  message: ChatMessage,
  contexto: SaveMessageContext
): Promise<boolean> {
  await asegurarCargado()
  if (ids.has(message.id)) {
    await db.savedMessages.delete(message.id)
    ids.delete(message.id)
    emit()
    return false
  }

  const row: SavedMessageRow = {
    id: message.id,
    scope: contexto.scope,
    serverId: contexto.serverId ?? null,
    serverName: contexto.serverName ?? null,
    channelId: contexto.channelId ?? null,
    channelName: contexto.channelName ?? null,
    conversationId: contexto.conversationId ?? null,
    authorName: message.author.name || 'Alguien',
    preview: previewDeMensaje(message),
    link: contexto.link ?? null,
    savedAt: Date.now(),
  }
  await db.savedMessages.put(row)
  ids.add(message.id)
  emit()
  return true
}

export async function quitarMensajeGuardado(messageId: string): Promise<void> {
  await db.savedMessages.delete(messageId)
  ids.delete(messageId)
  emit()
}

export async function listarMensajesGuardados(): Promise<SavedMessageRow[]> {
  const filas = await db.savedMessages.orderBy('savedAt').reverse().toArray()
  return filas
}

export function useMensajeGuardado(messageId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ids.has(messageId),
    () => false
  )
}

export function useCantidadMensajesGuardados(): number {
  return useSyncExternalStore(
    subscribe,
    () => ids.size,
    () => 0
  )
}
