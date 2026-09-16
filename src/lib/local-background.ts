import { resolverUrlMedia, type LocalMediaRef, type MediaTipo } from '@/lib/media-ref'
import type { ChatUser } from '@/lib/types'

export type FondoModo = 'local' | 'backend'

const LS_MODO = 'zion:fondo-modo'
const LS_REF_LOCAL = 'zion:fondo-local'

export function leerModoFondo(): FondoModo {
  try {
    return window.localStorage.getItem(LS_MODO) === 'local' ? 'local' : 'backend'
  } catch {
    return 'backend'
  }
}

export function escribirModoFondo(modo: FondoModo): void {
  try {
    window.localStorage.setItem(LS_MODO, modo)
  } catch {
    return
  }
}

export function leerRefFondoLocal(): LocalMediaRef | null {
  try {
    const raw = window.localStorage.getItem(LS_REF_LOCAL)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocalMediaRef>
    if (parsed?.modo !== 'local' || typeof parsed.id !== 'string') return null
    return parsed as LocalMediaRef
  } catch {
    return null
  }
}

export function escribirRefFondoLocal(ref: LocalMediaRef | null): void {
  try {
    if (ref) window.localStorage.setItem(LS_REF_LOCAL, JSON.stringify(ref))
    else window.localStorage.removeItem(LS_REF_LOCAL)
  } catch {
    return
  }
}

export interface FondoEfectivo {
  url: string | undefined
  tipo: MediaTipo | undefined
}

export function resolverFondoEfectivo(perfilBackend: FondoEfectivo): FondoEfectivo {
  if (leerModoFondo() !== 'local') return perfilBackend
  const ref = leerRefFondoLocal()
  return ref ? { url: resolverUrlMedia(ref), tipo: ref.tipo } : { url: undefined, tipo: undefined }
}

export function aplicarFondoLocalSiCorresponde(user: ChatUser): ChatUser {
  const efectivo = resolverFondoEfectivo({
    url: user.backgroundUrl,
    tipo: user.backgroundType,
  })
  if (efectivo.url === user.backgroundUrl && efectivo.tipo === user.backgroundType) return user
  return { ...user, backgroundUrl: efectivo.url, backgroundType: efectivo.tipo }
}
