import { useEffect, useRef, useState } from 'react'
import { Compass, Loader2, Search, Server, Telescope, TrendingUp, Users } from 'lucide-react'

import {
  explorarComunidades,
  explorarComunidadesDestacadas,
  listarEtiquetasPopulares,
  type CommunityListing,
  type EtiquetaPopular,
  type PeriodoDestacado,
} from '@/lib/explore'
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

const PERIODOS: { value: PeriodoDestacado; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mensual' },
  { value: 'anio', label: 'Anual' },
]

export function VistaExplorar({ currentUserId, onJoined, onOpenServer, onMessageUser }: VistaExplorarProps) {
  const [modo, setModo] = useState<Modo>('servidores')
  const [query, setQuery] = useState('')
  const [queryPersonas, setQueryPersonas] = useState('')
  const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState<string | null>(null)
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<EtiquetaPopular[]>([])
  const [comunidades, setComunidades] = useState<CommunityListing[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uniendo, setUniendo] = useState<string | null>(null)
  const [periodoDestacado, setPeriodoDestacado] = useState<PeriodoDestacado>('dia')
  const [destacados, setDestacados] = useState<CommunityListing[]>([])
  const queryRef = useRef(query)
  const etiquetaRef = useRef(etiquetaSeleccionada)

  useEffect(() => {
    queryRef.current = query
  }, [query])

  useEffect(() => {
    etiquetaRef.current = etiquetaSeleccionada
  }, [etiquetaSeleccionada])

  useEffect(() => {
    listarEtiquetasPopulares(20)
      .then(setEtiquetasDisponibles)
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelado = false
    explorarComunidadesDestacadas(periodoDestacado, 10)
      .then((data) => {
        if (!cancelado) setDestacados(data)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [periodoDestacado])

  useEffect(
    () =>
      suscribirseAExplorar(() => {
        explorarComunidades(queryRef.current, { etiqueta: etiquetaRef.current })
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
      explorarComunidades(query, { etiqueta: etiquetaSeleccionada })
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
  }, [query, etiquetaSeleccionada])

  const visibles = comunidades

  const hayFiltros = query.trim() !== '' || etiquetaSeleccionada !== null

  function limpiarFiltros() {
    setQuery('')
    setEtiquetaSeleccionada(null)
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
            <button
              type="button"
              onClick={() => setEtiquetaSeleccionada(null)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                etiquetaSeleccionada === null
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Todos
            </button>
            {etiquetasDisponibles.map((etiqueta) => (
              <button
                key={etiqueta.id}
                type="button"
                onClick={() => setEtiquetaSeleccionada(etiqueta.nombre)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  etiquetaSeleccionada === etiqueta.nombre
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {etiqueta.nombre}
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
          ) : (
            <>
              {destacados.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Destacado</h2>
                  </div>
                  <div className="mb-3 flex gap-1.5">
                    {PERIODOS.map((periodo) => (
                      <button
                        key={periodo.value}
                        type="button"
                        onClick={() => setPeriodoDestacado(periodo.value)}
                        className={cn(
                          'shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                          periodoDestacado === periodo.value
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {periodo.label}
                      </button>
                    ))}
                  </div>
                  <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                    {destacados.map((comunidad) => (
                      <div key={comunidad.id} className="w-56 shrink-0">
                        <CommunityCard
                          community={comunidad}
                          joining={uniendo === comunidad.id}
                          onAction={() => handleAccion(comunidad)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {cargando ? (
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
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
