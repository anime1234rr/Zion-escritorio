import { useEffect, useState } from 'react'

export interface ReauthRequest {
  id: number
  reason: string
}

type Listener = (state: ReauthRequest | null) => void

let seq = 0
let current: ReauthRequest | null = null
let resolver: ((nonce: string | null) => void) | null = null
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(current)
}

export function requireReauth(reason: string): Promise<string | null> {
  return new Promise((resolve) => {
    current = { id: ++seq, reason }
    resolver = resolve
    emit()
  })
}

export function resolveReauth(nonce: string | null): void {
  resolver?.(nonce)
  resolver = null
  current = null
  emit()
}

export function useReauthRequest(): ReauthRequest | null {
  const [state, setState] = useState(current)

  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return state
}
