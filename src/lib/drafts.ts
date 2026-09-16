import { db } from '@/lib/db'

export function claveDraftCanal(channelId: string): string {
  return `channel:${channelId}`
}

export function claveDraftDM(conversationId: string): string {
  return `dm:${conversationId}`
}

export async function leerDraft(key: string): Promise<string> {
  try {
    const fila = await db.drafts.get(key)
    return fila?.text ?? ''
  } catch (err) {
    console.error('No se pudo leer el borrador', err)
    return ''
  }
}

export async function guardarDraft(key: string, text: string): Promise<void> {
  try {
    if (text.trim()) {
      await db.drafts.put({ key, text, updatedAt: Date.now() })
    } else {
      await db.drafts.delete(key)
    }
  } catch (err) {
    console.error('No se pudo guardar el borrador', err)
  }
}
