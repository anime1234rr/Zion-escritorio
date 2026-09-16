export type MediaTipo = 'imagen' | 'video'

export interface BackendMediaRef {
  modo: 'backend'
  url: string
  tipo: MediaTipo
}

export interface LocalMediaRef {
  modo: 'local'
  id: string
  tipo: MediaTipo
  mime: string
  nombre: string
  tamano: number
}

export type MediaRef = BackendMediaRef | LocalMediaRef

export const LOCAL_MEDIA_PROTOCOL = 'zion-media'

export function esRefLocal(ref: MediaRef | null | undefined): ref is LocalMediaRef {
  return ref?.modo === 'local'
}

export function esRefBackend(ref: MediaRef | null | undefined): ref is BackendMediaRef {
  return ref?.modo === 'backend'
}

export function resolverUrlMedia(ref: MediaRef | null | undefined): string | undefined {
  if (!ref) return undefined
  return ref.modo === 'local' ? `${LOCAL_MEDIA_PROTOCOL}://${ref.id}` : ref.url
}
