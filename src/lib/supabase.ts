import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const oyentesMfa = new Set<() => void>()

export function alRequerirMfa(oyente: () => void): () => void {
  oyentesMfa.add(oyente)
  return () => oyentesMfa.delete(oyente)
}

async function fetchConControlMfa(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const respuesta = await fetch(input, init)
  if ((respuesta.status === 401 || respuesta.status === 403) && String(input).includes('/rest/v1/')) {
    respuesta
      .clone()
      .json()
      .then((cuerpo: { hint?: string } | null) => {
        if (cuerpo?.hint === 'mfa_requerida') for (const oyente of oyentesMfa) oyente()
      })
      .catch(() => {})
  }
  return respuesta
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchConControlMfa },
})
