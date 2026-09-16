import { db } from '@/lib/db'
import type { ChatMessage } from '@/lib/types'

const MAX_MENSAJES_CACHE = 80
const MAX_CANALES_CACHE = 60

export function claveCanal(channelId: string): string {
  return `channel:${channelId}`
}

export function claveDM(conversationId: string): string {
  return `dm:${conversationId}`
}

export async function leerMensajesDeCache(key: string): Promise<ChatMessage[]> {
  try {
    const fila = await db.cachedChannels.get(key)
    return fila?.messages ?? []
  } catch (err) {
    console.error('No se pudo leer la caché de mensajes', err)
    return []
  }
}

export async function guardarMensajesEnCache(
  key: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    await db.cachedChannels.put({
      key,
      messages: messages.slice(-MAX_MENSAJES_CACHE),
      updatedAt: Date.now(),
    })
    await podarCache()
  } catch (err) {
    console.error('No se pudo escribir la caché de mensajes', err)
  }
}

export async function olvidarCacheDeCanal(key: string): Promise<void> {
  try {
    await db.cachedChannels.delete(key)
  } catch {
    return
  }
}

async function podarCache(): Promise<void> {
  const total = await db.cachedChannels.count()
  if (total <= MAX_CANALES_CACHE) return
  const sobrantes = await db.cachedChannels
    .orderBy('updatedAt')
    .limit(total - MAX_CANALES_CACHE)
    .primaryKeys()
  await db.cachedChannels.bulkDelete(sobrantes)
}
