import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { ServerItem } from '@/lib/types'

interface MiembroConRolesRow {
  miembros_roles:
    | { roles_servidor: { permisos: Record<string, boolean> | null } | null }[]
    | null
}

function unirPermisos(row: MiembroConRolesRow | null): Record<string, boolean> {
  const merged: Record<string, boolean> = {}
  for (const fila of row?.miembros_roles ?? []) {
    const permisos = fila.roles_servidor?.permisos
    if (!permisos) continue
    for (const [clave, valor] of Object.entries(permisos)) {
      if (valor) merged[clave] = true
    }
  }
  return merged
}

export function useServerPermissions(server: ServerItem, userId: string | undefined) {
  const isOwner = Boolean(userId) && server.ownerId === userId
  const [permisos, setPermisos] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(!isOwner)

  useEffect(() => {
    if (isOwner || !userId) return

    let cancelado = false

    async function cargar() {
      const { data } = await supabase
        .from('miembros_servidor')
        .select('miembros_roles(roles_servidor(permisos))')
        .eq('servidor_id', server.id)
        .eq('usuario_id', userId as string)
        .maybeSingle<MiembroConRolesRow>()

      if (cancelado) return
      setPermisos(unirPermisos(data ?? null))
      setLoading(false)
    }

    cargar()

    const channel = supabase
      .channel(`permisos-propios-${server.id}-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'miembros_servidor',
          filter: `usuario_id=eq.${userId}`,
        },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'miembros_roles' },
        () => cargar()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'roles_servidor',
          filter: `servidor_id=eq.${server.id}`,
        },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [server.id, server.ownerId, userId, isOwner])

  function hasPermission(permiso: string): boolean {
    if (isOwner) return true
    return Boolean(
      permisos.todo || permisos.admin || permisos.admin_servidor || permisos[permiso]
    )
  }

  return { loading, isOwner, hasPermission }
}
