import { db, type LocalMediaRow } from '@/lib/db'
import type { LocalMediaRef } from '@/lib/media-ref'

export async function registrarMediaLocal(
  ref: LocalMediaRef,
  uso = 'adjunto'
): Promise<void> {
  try {
    await db.localMedia.put({
      id: ref.id,
      tipo: ref.tipo,
      mime: ref.mime,
      nombre: ref.nombre,
      tamano: ref.tamano,
      uso,
      createdAt: Date.now(),
    })
  } catch (err) {
    console.error('No se pudo registrar el archivo local', err)
  }
}

export async function olvidarMediaLocal(id: string): Promise<void> {
  try {
    await db.localMedia.delete(id)
  } catch {
    return
  }
}

export async function listarMediaLocal(uso?: string): Promise<LocalMediaRow[]> {
  try {
    const coleccion = uso
      ? db.localMedia.where('uso').equals(uso)
      : db.localMedia.toCollection()
    return await coleccion.reverse().sortBy('createdAt')
  } catch (err) {
    console.error('No se pudo listar el multimedia local', err)
    return []
  }
}

export async function idsMediaLocalConocidos(): Promise<Set<string>> {
  try {
    return new Set(await db.localMedia.toCollection().primaryKeys())
  } catch {
    return new Set()
  }
}
