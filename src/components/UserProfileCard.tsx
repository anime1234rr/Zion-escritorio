import { lazy, Suspense, useEffect, useState } from 'react'
import { Check, Crown, MessageSquare, Plus, UserPlus, X } from 'lucide-react'

import {
  aceptarSolicitudAmistad,
  enviarSolicitudAmistad,
  listarAmistades,
} from '@/lib/friends'
import {
  agregarRolMiembro,
  listarRolesDeServidor,
  obtenerMembresiaDeUsuario,
  quitarRolMiembro,
  type ServerRole,
} from '@/lib/members'
import { obtenerPerfilPublico, type PublicProfile } from '@/lib/profiles'
import { UserBadges } from '@/components/UserBadges'
import { ErrorBoundary } from '@/lib/internal/perf-metrics'
import { parseBioRichText } from '@/lib/bio-format'
import { cn, getErrorMessage } from '@/lib/utils'
import { formatFullDate as formatFecha } from '@/lib/internal/core-utils'
import type { ChatUser, FriendStatus, ServerItem, UserStatus } from '@/lib/types'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
const AccountSettingsPanel = lazy(() =>
  import('@/components/account-settings/AccountSettingsPanel').then((m) => ({
    default: m.AccountSettingsPanel,
  }))
)

const statusColor: Record<UserStatus, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-muted-foreground/60',
}

const statusLabel: Record<UserStatus, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
}

interface UserProfileCardProps {
  userId: string
  server?: ServerItem
  currentUserId: string
  children: React.ReactNode
  onMessageUser?: (userId: string) => void
}

export function UserProfileCard({
  userId,
  server,
  currentUserId,
  children,
  onMessageUser,
}: UserProfileCardProps) {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [membresia, setMembresia] = useState<{
    membershipId: string
    roles: ServerRole[]
    joinedAt: string
  } | null>(null)
  const [serverRoles, setServerRoles] = useState<ServerRole[]>([])
  const [canManageRoles, setCanManageRoles] = useState(false)
  const [rolePickerOpen, setRolePickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amistad, setAmistad] = useState<{ id: string; status: FriendStatus } | null>(null)
  const [friendBusy, setFriendBusy] = useState(false)
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null)

  async function handleAddFriend() {
    setFriendRequestError(null)
    setFriendBusy(true)
    try {
      await enviarSolicitudAmistad(userId)
      setAmistad({ id: '', status: 'pendiente_enviada' })
    } catch (err) {
      setFriendRequestError(getErrorMessage(err))
    } finally {
      setFriendBusy(false)
    }
  }

  async function handleAcceptFriend() {
    if (!amistad?.id) return
    setFriendRequestError(null)
    setFriendBusy(true)
    try {
      await aceptarSolicitudAmistad(amistad.id)
      setAmistad({ id: amistad.id, status: 'aceptada' })
    } catch (err) {
      setFriendRequestError(getErrorMessage(err))
    } finally {
      setFriendBusy(false)
    }
  }

  const isOwnProfile = userId === currentUserId
  const isServerOwner = server ? userId === server.ownerId : false

  useEffect(() => {
    if (!open) return
    let cancelado = false

    const puedeVerRoles = Boolean(server) && !isOwnProfile

    Promise.all([
      obtenerPerfilPublico(userId),
      server ? obtenerMembresiaDeUsuario(server.id, userId) : Promise.resolve(null),
      puedeVerRoles && server
        ? listarRolesDeServidor(server.id)
        : Promise.resolve([] as ServerRole[]),
      puedeVerRoles && server
        ? obtenerMembresiaDeUsuario(server.id, currentUserId)
        : Promise.resolve(null),
      isOwnProfile ? Promise.resolve([]) : listarAmistades(currentUserId).catch(() => []),
    ])
      .then(([p, m, roles, viewer, amistades]) => {
        if (cancelado) return
        setProfile(p)
        setMembresia(m)
        setServerRoles(roles)
        const rel = amistades.find((f) => f.user.id === userId)
        setAmistad(rel ? { id: rel.id, status: rel.status } : null)
        setCanManageRoles(
          (Boolean(server) && server?.ownerId === currentUserId) ||
            (viewer?.roles ?? []).some(
              (r) =>
                r.permisos.todo ||
                r.permisos.admin ||
                r.permisos.admin_servidor ||
                r.permisos.gestionar_roles
            )
        )
        setError(null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))

    return () => {
      cancelado = true
    }
  }, [open, userId, server?.id, server?.ownerId, currentUserId, isOwnProfile])

  async function handleToggleRole(role: ServerRole) {
    if (!membresia || role.esRolBase) return
    const tiene = membresia.roles.some((r) => r.id === role.id)
    const previo = membresia
    setError(null)
    setMembresia({
      ...membresia,
      roles: tiene
        ? membresia.roles.filter((r) => r.id !== role.id)
        : [...membresia.roles, role].sort((a, b) => a.posicion - b.posicion),
    })
    try {
      if (tiene) await quitarRolMiembro(membresia.membershipId, role.id)
      else await agregarRolMiembro(membresia.membershipId, role.id)
    } catch (err) {
      setMembresia(previo)
      setError(getErrorMessage(err))
    }
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setRolePickerOpen(false)
        }}
      >
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent side="right" align="start" className="bg-black p-0">
          {loading && (
            <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
          )}
          {error && (
            <p className="p-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && profile && (
            <ErrorBoundary label="UserProfileCard" fallbackMessage="No se pudo mostrar este perfil.">
            <div className="relative">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={
                  profile.bannerUrl
                    ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundColor: profile.colorBanner }
                    : { backgroundColor: profile.colorBanner }
                }
              />
              <div className="absolute inset-0 bg-black/80" />

              <div className="relative z-10 px-4 pt-4 pb-4">
                <Avatar className="size-16 ring-4 ring-black">
                  {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
                  <AvatarFallback className="text-lg">
                    {(profile.nombreCompleto || profile.nombreUsuario)
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                  <AvatarBadge className={statusColor[profile.status]} />
                </Avatar>

                <div className="mt-2 flex items-center gap-1.5">
                  <p className="truncate text-base font-semibold text-foreground">
                    {profile.nombreCompleto || profile.nombreUsuario}
                  </p>
                  {isServerOwner && (
                    <Crown className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <UserBadges userId={profile.id} size="size-4" />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  @{profile.nombreUsuario} · {statusLabel[profile.status]}
                </p>

                {server && membresia && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {membresia.roles.length === 1 ? 'Rol' : 'Roles'}
                      </p>
                      {canManageRoles && (
                        <button
                          type="button"
                          onClick={() => setRolePickerOpen((v) => !v)}
                          aria-label="Agregar o quitar roles"
                          aria-expanded={rolePickerOpen}
                          className="flex size-5 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {membresia.roles.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {membresia.roles.map((rol) => {
                          const removable = canManageRoles && !rol.esRolBase
                          return (
                            <span
                              key={rol.id}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-2 text-xs text-foreground',
                                removable ? 'pr-1' : 'pr-2'
                              )}
                            >
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: rol.color ?? '#9ca3af' }}
                              />
                              {rol.nombre}
                              {removable && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRole(rol)}
                                  aria-label={`Quitar rol ${rol.nombre}`}
                                  className="flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Sin rol asignado</p>
                    )}

                    {rolePickerOpen && (
                      <div className="mt-1.5 flex flex-col gap-0.5 rounded-md border border-border bg-popover p-1">
                        {serverRoles.length === 0 && (
                          <p className="px-1.5 py-1 text-xs text-muted-foreground">
                            Todavía no hay roles creados.
                          </p>
                        )}
                        {serverRoles.map((rol) => {
                          const tiene = membresia.roles.some((r) => r.id === rol.id)
                          return (
                            <button
                              key={rol.id}
                              type="button"
                              disabled={rol.esRolBase}
                              onClick={() => handleToggleRole(rol)}
                              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                            >
                              <span className="flex size-3.5 shrink-0 items-center justify-center">
                                {tiene && <Check className="size-3" />}
                              </span>
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: rol.color ?? '#9ca3af' }}
                              />
                              <span className="truncate">{rol.nombre}</span>
                              {rol.esRolBase && (
                                <span className="ml-auto text-[10px] text-muted-foreground">
                                  base
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {profile.biografia && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Acerca de mí
                    </p>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap text-foreground/90">
                      {parseBioRichText(profile.biografia)}
                    </p>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Miembro desde
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">
                    {formatFecha(membresia?.joinedAt ?? profile.creadoAt)}
                  </p>
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  {isOwnProfile ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setEditOpen(true)
                        setOpen(false)
                      }}
                    >
                      Editar perfil
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        {onMessageUser ? (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              onMessageUser(userId)
                              setOpen(false)
                            }}
                          >
                            <MessageSquare className="size-4" />
                            Mensaje
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-1">
                                <Button variant="outline" className="w-full" disabled>
                                  <MessageSquare className="size-4" />
                                  Mensaje
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              No se puede enviar un mensaje directo desde acá.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {(() => {
                          const st = amistad?.status
                          if (st === 'aceptada') {
                            return (
                              <Button variant="outline" className="flex-1" disabled>
                                <Check className="size-4" />
                                Amigos
                              </Button>
                            )
                          }
                          if (st === 'pendiente_enviada') {
                            return (
                              <Button variant="outline" className="flex-1" disabled>
                                <Check className="size-4" />
                                Solicitud enviada
                              </Button>
                            )
                          }
                          if (st === 'pendiente_recibida') {
                            return (
                              <Button
                                variant="outline"
                                className="flex-1"
                                disabled={friendBusy}
                                onClick={handleAcceptFriend}
                              >
                                <UserPlus className="size-4" />
                                Aceptar solicitud
                              </Button>
                            )
                          }
                          if (st === 'bloqueada') {
                            return (
                              <Button variant="outline" className="flex-1" disabled>
                                Bloqueado
                              </Button>
                            )
                          }
                          return (
                            <Button
                              variant="outline"
                              className="flex-1"
                              disabled={friendBusy}
                              onClick={handleAddFriend}
                            >
                              <UserPlus className="size-4" />
                              Agregar
                            </Button>
                          )
                        })()}
                      </div>
                      {friendRequestError && (
                        <p className="text-xs text-destructive" role="alert">
                          {friendRequestError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </ErrorBoundary>
          )}
        </PopoverContent>
      </Popover>

      {isOwnProfile && profile && (
        <Suspense fallback={null}>
          <AccountSettingsPanel
            open={editOpen}
            onOpenChange={setEditOpen}
            initialSection="perfil"
            currentUser={
              {
                id: userId,
                name: profile.nombreCompleto || profile.nombreUsuario,
                avatarUrl: profile.avatarUrl,
                status: profile.status,
              } satisfies ChatUser
            }
            onProfileUpdated={() => {
              obtenerPerfilPublico(userId)
                .then(setProfile)
                .catch(() => {})
            }}
          />
        </Suspense>
      )}
    </>
  )
}
