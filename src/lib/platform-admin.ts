import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function esAdminPlataforma(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('soy_admin_plataforma')
    if (error) return false
    return data === true
  } catch {
    return false
  }
}

export async function desbloquearInspeccion(): Promise<'ok' | 'denegado' | 'no-disponible'> {
  if (!window.electronAPI) return 'no-disponible'

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) return 'denegado'

  const permitido = await window.electronAPI.unlockInspect({
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    accessToken,
  })
  return permitido ? 'ok' : 'denegado'
}
