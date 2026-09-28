import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { getInitialDeepLink, onDeepLink } from '@/lib/electron-bridge'
import { getErrorMessage } from '@/lib/utils'
import type { PendingAuthAction } from '@/lib/auth-context-core'

export const AUTH_CALLBACK_URL = 'zion://auth-callback'

const AUTH_STATE_STORAGE_KEY = 'zion_pending_auth_state'
const AUTH_STATE_TTL_MS = 15 * 60 * 1000

type AuthLinkType = 'signup' | 'invite' | 'recovery' | 'email_change' | 'magiclink' | 'email'

interface ParsedAuthLink {
  type: AuthLinkType | null
  tokenHash: string | null
  accessToken: string | null
  refreshToken: string | null
  email: string | null
  state: string | null
}

function randomState(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createAuthCallbackUrl(): string {
  const state = randomState()
  try {
    localStorage.setItem(
      AUTH_STATE_STORAGE_KEY,
      JSON.stringify({ value: state, expiresAt: Date.now() + AUTH_STATE_TTL_MS })
    )
  } catch (err) {
    void err
  }
  return `${AUTH_CALLBACK_URL}?state=${state}`
}

function consumeAuthState(candidate: string | null): boolean {
  if (!candidate) return false
  try {
    const raw = localStorage.getItem(AUTH_STATE_STORAGE_KEY)
    localStorage.removeItem(AUTH_STATE_STORAGE_KEY)
    if (!raw) return false
    const stored = JSON.parse(raw) as { value: string; expiresAt: number }
    if (Date.now() > stored.expiresAt) return false
    return stored.value === candidate
  } catch {
    return false
  }
}

function extractParams(url: string): URLSearchParams | null {
  const queryIndex = url.indexOf('?')
  const hashIndex = url.indexOf('#')
  const parts: string[] = []
  if (queryIndex !== -1) {
    parts.push(url.slice(queryIndex + 1, hashIndex !== -1 ? hashIndex : undefined))
  }
  if (hashIndex !== -1) {
    parts.push(url.slice(hashIndex + 1))
  }
  if (parts.length === 0) return null
  return new URLSearchParams(parts.join('&'))
}

export function parseAuthCallbackUrl(url: string): ParsedAuthLink | null {
  if (!url.startsWith('zion://auth-callback')) return null
  const params = extractParams(url)
  if (!params) return null

  return {
    type: (params.get('type') as AuthLinkType | null) ?? null,
    tokenHash: params.get('token_hash'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    email: params.get('email'),
    state: params.get('state'),
  }
}

export function useAuthDeepLinks() {
  const { setPendingAuthAction } = useAuth()

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return
      const parsed = parseAuthCallbackUrl(url)
      if (!parsed || !parsed.type) return

      const pendingForType: PendingAuthAction =
        parsed.type === 'recovery'
          ? { type: 'recovery', email: parsed.email ?? undefined }
          : parsed.type === 'invite'
            ? { type: 'invite', email: parsed.email ?? undefined }
            : null

      if (pendingForType) setPendingAuthAction(pendingForType)

      const stateValid = consumeAuthState(parsed.state)

      try {
        if (parsed.accessToken && parsed.refreshToken) {
          if (!stateValid) {
            console.warn(
              'Enlace de autenticación descartado: state ausente o inválido (posible enlace no solicitado).'
            )
            return
          }
          const { error } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          })
          if (error) throw error
        } else if (parsed.tokenHash) {
          if (!stateValid) {
            console.warn(
              'Enlace de autenticación descartado: state ausente o inválido (posible enlace no solicitado).'
            )
            return
          }
          const { error } = await supabase.auth.verifyOtp({
            token_hash: parsed.tokenHash,
            type: parsed.type,
          })
          if (error) throw error
        } else if (pendingForType) {
          setPendingAuthAction(null)
        }
      } catch (err) {
        if (pendingForType) setPendingAuthAction(null)
        console.error('No se pudo procesar el enlace de autenticación:', getErrorMessage(err))
      }
    }

    getInitialDeepLink().then(handleUrl)
    return onDeepLink(handleUrl)
  }, [setPendingAuthAction])
}
