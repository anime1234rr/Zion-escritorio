import type { LocalMediaRef, MediaTipo } from '@/lib/media-ref'
import { olvidarMediaLocal, registrarMediaLocal } from '@/lib/local-media-registry'

const MB = 1024 * 1024
const MAX_LOCAL_BYTES = 100 * MB

const MIME_TIPO: Record<string, MediaTipo> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/gif': 'imagen',
  'image/webp': 'imagen',
  'video/mp4': 'video',
  'video/webm': 'video',
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

export const LOCAL_MEDIA_ACCEPT = Object.keys(MIME_TIPO).join(',')

export function soportaMediaLocal(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.media
}

export function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

export async function guardarMediaLocal(
  file: File,
  uso = 'adjunto'
): Promise<LocalMediaRef> {
  const api = window.electronAPI?.media
  if (!api) {
    throw new Error('El almacenamiento local no está disponible en esta plataforma.')
  }

  const tipo = MIME_TIPO[file.type]
  const ext = MIME_EXT[file.type]
  if (!tipo || !ext) {
    throw new Error('Solo se pueden usar imágenes (jpeg, png, gif, webp) o videos (mp4, webm).')
  }
  if (file.size > MAX_LOCAL_BYTES) {
    throw new Error(`El archivo no puede pesar más de ${MAX_LOCAL_BYTES / MB} MB.`)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const id = await api.save(bytes, ext)

  const ref: LocalMediaRef = {
    modo: 'local',
    id,
    tipo,
    mime: file.type,
    nombre: file.name,
    tamano: file.size,
  }
  await registrarMediaLocal(ref, uso)
  return ref
}

export async function eliminarMediaLocal(id: string): Promise<void> {
  try {
    await window.electronAPI?.media?.remove(id)
  } catch (err) {
    console.error('No se pudo borrar el archivo local', err)
  }
  await olvidarMediaLocal(id)
}

export function usoMediaLocal(): Promise<{ count: number; bytes: number }> {
  return window.electronAPI?.media?.usage() ?? Promise.resolve({ count: 0, bytes: 0 })
}

export function abrirCarpetaMediaLocal(): void {
  window.electronAPI?.media?.openFolder()
}
