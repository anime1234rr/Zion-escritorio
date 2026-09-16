import { useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { listarPermisosDeRolesEnCanales } from '@/lib/channels'
import {
  listarRolesDeServidor,
  obtenerMembresiaDeUsuario,
  type ServerRole,
} from '@/lib/members'
import type { ChannelCategory, ChannelItem, ServerItem } from '@/lib/types'

const EMPTY_SET = new Set<string>()

export function useChannelAccess(
  server: ServerItem | null,
  categories: ChannelCategory[],
  userId: string | undefined
): Set<string> {
  const isOwner = Boolean(server && userId && server.ownerId === userId)
  const allChannels = useMemo<ChannelItem[]>(
    () => categories.flatMap((category) => category.channels),
    [categories]
  )
  const allChannelIds = useMemo(() => allChannels.map((channel) => channel.id), [allChannels])
  const loadingHidden = useMemo(() => new Set(allChannelIds), [allChannelIds])
  const [state, setState] = useState<{ loaded: boolean; hidden: Set<string> }>({
    loaded: false,
    hidden: new Set(),
  })

  useEffect(() => {
    if (!server?.id || isOwner || !userId) return

    const servidorId = server.id
    let cancelado = false

    async function cargar() {
      const membresia = await obtenerMembresiaDeUsuario(servidorId, userId as string)
      if (cancelado) return

      let roles: ServerRole[] = membresia?.roles ?? []

      const esAdmin = roles.some(
        (r) => r.permisos.todo || r.permisos.admin || r.permisos.admin_servidor
      )
      if (esAdmin) {
        setState({ loaded: true, hidden: new Set() })
        return
      }

      if (roles.length === 0) {
        const todos = await listarRolesDeServidor(servidorId)
        if (cancelado) return
        const base = todos.find((r) => r.esRolBase)
        roles = base ? [base] : []
      }

      if (roles.length === 0) {
        setState({ loaded: true, hidden: new Set(allChannelIds) })
        return
      }

      const overrides = await listarPermisosDeRolesEnCanales(roles.map((r) => r.id))
      if (cancelado) return

      const porRol = new Map<string, Map<string, Record<string, boolean>>>()
      for (const o of overrides) {
        let m = porRol.get(o.rolId)
        if (!m) {
          m = new Map()
          porRol.set(o.rolId, m)
        }
        m.set(o.canalId, o.permisos)
      }

      const rolPuedeVer = (rolId: string, channel: ChannelItem): boolean => {
        const m = porRol.get(rolId)
        const overridesCanal = m?.get(channel.id)
        if (overridesCanal !== undefined) return Boolean(overridesCanal.ver_canal)
        const overridesCategoria = channel.categoryId ? m?.get(channel.categoryId) : undefined
        if (overridesCategoria !== undefined) return Boolean(overridesCategoria.ver_canal)
        return false
      }

      const hidden = new Set<string>()
      for (const channel of allChannels) {
        const visible = roles.some((r) => rolPuedeVer(r.id, channel))
        if (!visible) hidden.add(channel.id)
      }
      setState({ loaded: true, hidden })
    }

    cargar()

    const channel = supabase
      .channel(`acceso-canales-${servidorId}-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permisos_canal_rol' },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'miembros_servidor', filter: `usuario_id=eq.${userId}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'miembros_roles' },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'roles_servidor', filter: `servidor_id=eq.${servidorId}` },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [server?.id, server?.ownerId, userId, isOwner, allChannelIds, allChannels])

  if (isOwner) return EMPTY_SET
  return state.loaded ? state.hidden : loadingHidden
}
