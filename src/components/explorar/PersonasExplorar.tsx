import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquare, Server, UserCheck, Users } from 'lucide-react'

import { explorarPersonas, suscribirseAPersonas, type PersonaConocida } from '@/lib/explore'
import { estadoPublicoAStatus } from '@/lib/profiles'
import type { UserStatus } from '@/lib/types'
import { cn, getErrorMessage } from '@/lib/utils'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserProfileCard } from '@/components/UserProfileCard'

const statusColor: Record<UserStatus, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-muted-foreground/60',
}

type Filtro = 'todas' | 'amigos' | 'servidores' | 'conectadas'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'amigos', label: 'Amigos' },
  { id: 'servidores', label: 'Servidores en común' },
  { id: 'conectadas', label: 'Conectadas' },
]

export function PersonasExplorar({
  query,
  currentUserId,
  onMessageUser,
}: {
  query: string
  currentUserId: string
  onMessageUser: (userId: string) => void
}) {
  const [personas, setPersonas] = useState<PersonaConocida[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const queryRef = useRef(query)

  useEffect(() => {
    queryRef.current = query
  }, [query])

  useEffect(() => {
    const recargar = () => {
      explorarPersonas(queryRef.current)
        .then(setPersonas)
        .catch(() => {})
    }
    const dejarDeEscuchar = suscribirseAPersonas({
      onPerfil: (perfil) =>
        setPersonas((prev) =>
          prev.some((p) => p.id === perfil.id)
            ? prev.map((p) =>
                p.id === perfil.id ? { ...p, status: estadoPublicoAStatus(perfil.estado, perfil.actualizado_at) } : p
              )
            : prev
        ),
      onRelaciones: recargar,
    })
    const intervalo = setInterval(recargar, 60_000)
    return () => {
      dejarDeEscuchar()
      clearInterval(intervalo)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    const timeout = setTimeout(() => {
      setCargando(true)
      setError(null)
      explorarPersonas(query)
        .then((data) => !cancelado && setPersonas(data))
        .catch((err) => !cancelado && setError(getErrorMessage(err)))
        .finally(() => !cancelado && setCargando(false))
    }, 250)
    return () => {
      cancelado = true
      clearTimeout(timeout)
    }
  }, [query])

  const visibles = useMemo(
    () =>
      personas.filter((p) => {
        if (filtro === 'amigos') return p.isFriend
        if (filtro === 'servidores') return p.mutualServers > 0
        if (filtro === 'conectadas') return p.status !== 'offline'
        return true
      }),
    [personas, filtro]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
              filtro === f.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Buscando personas…
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No se pudieron cargar las personas. Probá de nuevo en un momento.
        </p>
      ) : visibles.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Users className="size-8" />
          </div>
          <p className="text-sm font-semibold text-foreground">No hay nadie por acá</p>
          <p className="text-xs text-muted-foreground">
            Acá aparecen las personas con las que compartís un servidor, una amistad o una conversación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((persona) => (
            <UserProfileCard
              key={persona.id}
              userId={persona.id}
              currentUserId={currentUserId}
              onMessageUser={onMessageUser}
            >
              <button
                type="button"
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Avatar size="lg">
                  {persona.avatarUrl && <AvatarImage src={persona.avatarUrl} />}
                  <AvatarFallback>{persona.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  <AvatarBadge className={statusColor[persona.status]} />
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{persona.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{persona.username}</p>
                  {persona.bio && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{persona.bio}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {persona.isFriend && (
                      <span className="flex items-center gap-1 rounded-full bg-online/15 px-2 py-0.5 text-[11px] font-medium text-online">
                        <UserCheck className="size-3" />
                        Amigo
                      </span>
                    )}
                    {persona.mutualServers > 0 && (
                      <span
                        title={persona.mutualServerNames.join(', ')}
                        className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <Server className="size-3" />
                        {persona.mutualServers === 1
                          ? persona.mutualServerNames[0] ?? '1 servidor en común'
                          : `${persona.mutualServers} servidores en común`}
                      </span>
                    )}
                    {persona.hasConversation && (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <MessageSquare className="size-3" />
                        Chat
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </UserProfileCard>
          ))}
        </div>
      )}
    </div>
  )
}
