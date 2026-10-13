import { useEffect, useMemo, useRef, useState } from 'react'
import { Compass, Loader2, Search, Server, Telescope, Users } from 'lucide-react'

import { explorarComunidades, type CommunityListing } from '@/lib/explore'
import { unirseAServidor } from '@/lib/servers'
import { suscribirseAExplorar } from '@/lib/realtime-avisos'
import type { ServerItem } from '@/lib/types'
import { cn, getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { pushToast } from '@/hooks/use-toasts'
import { CommunityCard } from '@/components/explorar/CommunityCard'
import { PersonasExplorar } from '@/components/explorar/PersonasExplorar'

interface VistaExplorarProps {
  currentUserId: string
  onJoined: (server: ServerItem) => void
  onOpenServer: (serverId: string) => void
  onMessageUser: (userId: string) => void
}

type Modo = 'servidores' | 'personas'

const CATEGORIAS: { id: string; label: string; palabras: string[] }[] = [
  { id: 'todos', label: 'Todos', palabras: [] },
  { id: 'anime', label: 'Anime', palabras: ['anime', 'manga', 'otaku', 'waifu', 'weeb', 'cosplay'] },
  {
    id: 'gaming',
    label: 'Gaming',
    palabras: [
      'gaming', 'gamer', 'juego', 'videojuego', 'game', 'esport', 'fps', 'rpg',
      'minecraft', 'valorant', 'league', 'fortnite', 'roblox', 'steam',
    ],
  },
  {
    id: 'tecnologia',
    label: 'Tecnología',
    palabras: [
      'tech', 'tecnolog', 'program', 'desarroll', 'codigo', 'code', 'software',
      'hardware', 'linux', 'javascript', 'python', 'inteligencia artificial', 'devops',
    ],
  },
  {
    id: 'musica',
    label: 'Música',
    palabras: ['music', 'musica', 'beat', 'productor', 'rap', 'rock', 'pop', 'trap', 'dj', 'banda'],
  },
  {
    id: 'arte',
    label: 'Arte',
    palabras: ['arte', 'art', 'dibujo', 'draw', 'ilustra', 'diseno', 'design', 'pixel', 'nft'],
  },
  {
    id: 'social',
    label: 'Social',
    palabras: ['comunidad', 'amigos', 'chat', 'social', 'hangout', 'charla', 'conocer'],
  },
]

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
}

function coincideCategoria(comunidad: CommunityListing, categoriaId: string) {
  const cat = CATEGORIAS.find((c) => c.id === categoriaId)
  if (!cat || cat.palabras.length === 0) return true
  const heno = normalizar(`${comunidad.name} ${comunidad.description ?? ''}`)
  return cat.palabras.some((palabra) => heno.includes(normalizar(palabra)))
}

export function VistaExplorar({ currentUserId, onJoined, onOpenServer, onMessageUser }: VistaExplorarProps) {
  const [modo, setModo] = useState<Modo>('servidores')
  const [query, setQuery] = useState('')
  const [queryPersonas, setQueryPersonas] = useState('')
  const [categoria, setCategoria] = useState('todos')
  const [comunidades, setComunidades] = useState<CommunityListing[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uniendo, setUniendo] = useState<string | null>(null)
  const queryRef = useRef(query)

  useEffect(() => {
    queryRef.current = query
  }, [query])

  useEffect(
    () =>
      suscribirseAExplorar(() => {
        explorarComunidades(queryRef.current)
          .then(setComunidades)
          .catch(() => {})
      }),
    []
  )

  useEffect(() => {
    let cancelado = false

    const timeout = setTimeout(() => {
      setCargando(true)
      setError(null)
      explorarComunidades(query)
        .then((data) => {
          if (!cancelado) setComunidades(data)
        })
        .catch((err) => {
          if (!cancelado) setError(getErrorMessage(err))
        })
        .finally(() => {
          if (!cancelado) setCargando(false)
        })
    }, 250)

    return () => {
      cancelado = true
      clearTimeout(timeout)
    }
  }, [query])

  const visibles = useMemo(
    () => comunidades.filter((c) => coincideCategoria(c, categoria)),
    [comunidades, categoria]
  )

  const hayFiltros = query.trim() !== '' || categoria !== 'todos'

  function limpiarFiltros() {
    setQuery('')
    setCategoria('todos')
  }

  async function handleAccion(comunidad: CommunityListing) {
    if (comunidad.isMember) {
      onOpenServer(comunidad.id)
      return
    }
    if (!comunidad.inviteCode) {
      pushToast({ title: 'Esta comunidad no acepta nuevos miembros ahora mismo', icon: 'sistema' })
      return
    }
    setUniendo(comunidad.id)
    try {
      const servidor = await unirseAServidor(comunidad.inviteCode)
      setComunidades((prev) =>
        prev.map((c) =>
          c.id === comunidad.id ? { ...c, isMember: true, memberCount: c.memberCount + 1 } : c
        )
      )
      onJoined(servidor)
    } catch (err) {
      pushToast({ title: getErrorMessage(err), icon: 'sistema' })
    } finally {
      setUniendo(null)
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <h1 className="text-base font-semibold">Explorar</h1>
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {(
              [
                ['servidores', 'Servidores', Server],
                ['personas', 'Personas', Users],
              ] as const
            ).map(([valor, label, Icon]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setModo(valor)}
                aria-pressed={modo === valor}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  modo === valor
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          {modo === 'servidores' ? (
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar comunidades por nombre o tema"
              className="pl-8"
            />
          ) : (
            <Input
              autoFocus
              value={queryPersonas}
              onChange={(event) => setQueryPersonas(event.target.value)}
              placeholder="Buscar personas por nombre"
              className="pl-8"
            />
          )}
        </div>

        {modo === 'servidores' && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoria(cat.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  categoria === cat.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 py-5">
          {modo === 'personas' ? (
            <PersonasExplorar
              query={queryPersonas}
              currentUserId={currentUserId}
              onMessageUser={onMessageUser}
            />
          ) : cargando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Buscando comunidades…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Compass className="size-8 text-muted-foreground/50" />
              No se pudieron cargar las comunidades. Probá de nuevo en un momento.
            </div>
          ) : visibles.length === 0 ? (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Telescope className="size-8" />
              </div>
              {hayFiltros ? (
                <>
                  <p className="text-sm font-semibold text-foreground">Nada por acá todavía</p>
                  <p className="text-xs text-muted-foreground">
                    Ninguna comunidad coincide con tu búsqueda. Probá con otro tema o mirá otras
                    categorías.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    Todavía no hay comunidades públicas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cuando alguien active la comunidad de su servidor, va a aparecer acá. Podés crear
                    el tuyo desde el botón «+» de la barra lateral.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((comunidad) => (
                <CommunityCard
                  key={comunidad.id}
                  community={comunidad}
                  joining={uniendo === comunidad.id}
                  onAction={() => handleAccion(comunidad)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
