import { useServerPermissions } from '@/hooks/use-server-permissions'
import type { ServerItem } from '@/lib/types'

export type ServerRoleTier = 'owner' | 'staff' | 'member'

export interface ServerMenuCaps {
  tier: ServerRoleTier
  loading: boolean
  isOwner: boolean

  canEditServer: boolean
  canManageRoles: boolean
  canManageChannels: boolean
  canViewAudit: boolean
  canManageMembers: boolean
  canInvite: boolean

  canTransferOwnership: boolean
  canDeleteServer: boolean

  canLeave: boolean
}

const CLAVES_STAFF = [
  'gestionar_servidor',
  'gestionar_roles',
  'gestionar_canales',
  'ver_registros',
  'expulsar_miembros',
  'banear_miembros',
  'silenciar_miembros',
  'gestionar_apodos',
  'gestionar_invitaciones',
] as const

export function useServerMenuCaps(
  server: ServerItem,
  userId: string | undefined
): ServerMenuCaps {
  const { loading, isOwner, hasPermission } = useServerPermissions(server, userId)

  const canEditServer = isOwner || hasPermission('gestionar_servidor')
  const canManageRoles = isOwner || hasPermission('gestionar_roles')
  const canManageChannels = isOwner || hasPermission('gestionar_canales')
  const canViewAudit = isOwner || hasPermission('ver_registros')
  const canManageMembers =
    isOwner ||
    hasPermission('expulsar_miembros') ||
    hasPermission('banear_miembros') ||
    hasPermission('silenciar_miembros') ||
    hasPermission('gestionar_apodos')
  const canInvite = isOwner || hasPermission('gestionar_invitaciones')

  const esStaff = !isOwner && CLAVES_STAFF.some((clave) => hasPermission(clave))
  const tier: ServerRoleTier = isOwner ? 'owner' : esStaff ? 'staff' : 'member'

  return {
    tier,
    loading,
    isOwner,
    canEditServer,
    canManageRoles,
    canManageChannels,
    canViewAudit,
    canManageMembers,
    canInvite,
    canTransferOwnership: isOwner,
    canDeleteServer: isOwner,
    canLeave: Boolean(userId) && !isOwner,
  }
}
