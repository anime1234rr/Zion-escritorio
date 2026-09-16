import { useState, type ReactNode } from 'react'
import {
  ArrowLeftRight,
  Bell,
  BellOff,
  Copy,
  Hash,
  LogOut,
  ScrollText,
  Settings,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

import { writeClipboard } from '@/lib/electron-bridge'
import { abandonarServidor, eliminarServidor } from '@/lib/servers'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import type { ServerSettingsSectionId } from '@/components/server-settings/ServerSettingsPanel'
import { useServerMenuCaps } from '@/hooks/use-server-menu-caps'
import {
  setServerAlertLevel,
  toggleServerMuted,
  olvidarServerNotifPref,
  useServerNotifPref,
  type ServerAlertLevel,
} from '@/lib/server-notification-prefs'
import { pushToast } from '@/hooks/use-toasts'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import { ConfirmarAccionDialog } from '@/components/server-settings/ConfirmarAccionDialog'

interface ServerContextMenuProps {
  server: ServerItem
  currentUserId: string | undefined
  onOpenSettings: (serverId: string, section?: ServerSettingsSectionId) => void
  onInvite: (serverId: string) => void
  onLeft: (serverId: string) => void
  onDeleted: (serverId: string) => void
  children: ReactNode
}

const NIVELES_ALERTA: { value: ServerAlertLevel; label: string }[] = [
  { value: 'todas', label: 'Todos los mensajes' },
  { value: 'menciones', label: 'Solo @menciones' },
  { value: 'nada', label: 'Nada' },
]

export function ServerContextMenu({
  server,
  currentUserId,
  onOpenSettings,
  onInvite,
  onLeft,
  onDeleted,
  children,
}: ServerContextMenuProps) {
  const caps = useServerMenuCaps(server, currentUserId)
  const notif = useServerNotifPref(server.id)

  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const gestionVisible =
    !caps.loading &&
    (caps.canEditServer ||
      caps.canManageRoles ||
      caps.canManageChannels ||
      caps.canManageMembers ||
      caps.canViewAudit)

  async function copiarId() {
    await writeClipboard(server.id)
    pushToast({ title: 'ID copiado', description: server.name, icon: 'sistema' }, 2500)
  }

  async function handleLeave() {
    await abandonarServidor(server.id)
    olvidarServerNotifPref(server.id)
    onLeft(server.id)
    pushToast({ title: 'Saliste del servidor', description: server.name, icon: 'sistema' })
  }

  async function handleDelete() {
    await eliminarServidor(server.id)
    olvidarServerNotifPref(server.id)
    onDeleted(server.id)
    pushToast({ title: 'Servidor eliminado', description: server.name, icon: 'sistema' })
  }

  return (
    <>
      <ContextMenu>
        {children}
        <ContextMenuContent className="w-60">
          <ContextMenuLabel className="truncate">{server.name}</ContextMenuLabel>

          <ContextMenuCheckboxItem
            checked={notif.muted}
            onCheckedChange={() => toggleServerMuted(server.id)}
            onSelect={(event) => event.preventDefault()}
          >
            {notif.muted ? <BellOff /> : <Bell />}
            Silenciar servidor
          </ContextMenuCheckboxItem>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Bell />
              Notificaciones
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={notif.level}
                onValueChange={(value) =>
                  setServerAlertLevel(server.id, value as ServerAlertLevel)
                }
              >
                {NIVELES_ALERTA.map((opcion) => (
                  <ContextMenuRadioItem
                    key={opcion.value}
                    value={opcion.value}
                    disabled={notif.muted}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {opcion.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {!caps.loading && caps.canInvite && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onInvite(server.id)}>
                <UserPlus />
                Invitar personas
              </ContextMenuItem>
            </>
          )}

          {gestionVisible && (
            <>
              <ContextMenuSeparator />
              {caps.canEditServer && (
                <ContextMenuItem onSelect={() => onOpenSettings(server.id, 'general')}>
                  <Settings />
                  Ajustes del servidor
                </ContextMenuItem>
              )}
              {caps.canManageRoles && (
                <ContextMenuItem
                  onSelect={() => onOpenSettings(server.id, 'roles-permisos')}
                >
                  <Shield />
                  Gestionar roles
                </ContextMenuItem>
              )}
              {caps.canManageChannels && (
                <ContextMenuItem
                  onSelect={() => onOpenSettings(server.id, 'canales-estructura')}
                >
                  <Hash />
                  Gestionar canales
                </ContextMenuItem>
              )}
              {caps.canManageMembers && (
                <ContextMenuItem onSelect={() => onOpenSettings(server.id, 'personas')}>
                  <Users />
                  Gestionar miembros
                </ContextMenuItem>
              )}
              {caps.canViewAudit && (
                <ContextMenuItem onSelect={() => onOpenSettings(server.id, 'auditoria')}>
                  <ScrollText />
                  Ver registros de auditoría
                </ContextMenuItem>
              )}
            </>
          )}

          {caps.canTransferOwnership && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => onOpenSettings(server.id, 'zona-peligro')}
              >
                <ArrowLeftRight />
                Transferir propiedad
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />
          <ContextMenuItem onSelect={copiarId}>
            <Copy />
            Copiar ID del servidor
          </ContextMenuItem>

          {(caps.canLeave || caps.canDeleteServer) && <ContextMenuSeparator />}
          {caps.canLeave && (
            <ContextMenuItem variant="destructive" onSelect={() => setConfirmLeave(true)}>
              <LogOut />
              Abandonar servidor
            </ContextMenuItem>
          )}
          {caps.canDeleteServer && (
            <ContextMenuItem
              variant="destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2 />
              Eliminar servidor
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmarAccionDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`¿Abandonar "${server.name}"?`}
        description="Dejarás de ver sus canales y mensajes. Podés volver a unirte con una invitación."
        confirmLabel="Abandonar servidor"
        onConfirm={async () => {
          try {
            await handleLeave()
          } catch (err) {
            pushToast({
              title: 'No se pudo abandonar el servidor',
              description: getErrorMessage(err),
              icon: 'sistema',
            })
            throw err
          }
        }}
      />

      <ConfirmarAccionDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar "${server.name}"?`}
        description="Se borrarán todos sus canales, roles y mensajes para todos los miembros. Esta acción no se puede deshacer."
        confirmLabel="Eliminar servidor"
        onConfirm={async () => {
          try {
            await handleDelete()
          } catch (err) {
            pushToast({
              title: 'No se pudo eliminar el servidor',
              description: getErrorMessage(err),
              icon: 'sistema',
            })
            throw err
          }
        }}
      />
    </>
  )
}
