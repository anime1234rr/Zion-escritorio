import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, Search, ShieldAlert, ShieldQuestion, UserCog } from 'lucide-react'

import { debounce, initials, relativeTime } from '@/lib/internal/core-utils'
import { ErrorBoundary } from '@/lib/internal/perf-metrics'
import {
  buscarUsuariosStaff,
  listarSancionesRecientes,
  listarSancionesUsuario,
  obtenerEstadisticasSanciones,
  revocarSancion,
  type EstadisticasSanciones,
  type EstadoCuenta,
  type SancionConAutor,
  type SancionReciente,
  type TipoSancion,
  type UsuarioStaffResultado,
} from '@/lib/moderation'
import { ESTADO_CUENTA_CONFIG, ETIQUETA_TIPO_SANCION } from '@/lib/moderation-display'
import { cn, getErrorMessage } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { UserBadges } from '@/components/UserBadges'
import { AplicarSancionDialog, type SancionPreset } from '@/components/staff/AplicarSancionDialog'
import { RolStaffDialog, type RolStaffTarget } from '@/components/staff/RolStaffDialog'

interface StaffPanelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  esAdmin: boolean
}

export function StaffPanelDialog({ open, onOpenChange, esAdmin }: StaffPanelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(680px,85vh)] w-[min(720px,92vw)] max-w-none flex-col overflow-hidden sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5" />
            Panel de staff
          </DialogTitle>
        </DialogHeader>

        {open && (
          <ErrorBoundary label="StaffPanel" fallbackMessage="No se pudo cargar el panel de staff. Probá de nuevo.">
            <StaffPanelBody esAdmin={esAdmin} />
          </ErrorBoundary>
        )}
      </DialogContent>
    </Dialog>
  )
}

const DURACIONES_RAPIDAS: { label: string; minutos: number }[] = [
  { label: '1 hora', minutos: 60 },
  { label: '1 día', minutos: 60 * 24 },
  { label: '7 días', minutos: 60 * 24 * 7 },
]

function EstadoBadge({ estado }: { estado: EstadoCuenta }) {
  const config = ESTADO_CUENTA_CONFIG[estado]
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', config.className)}>
      {config.label}
    </span>
  )
}

interface UsuarioBasico {
  id: string
  nombre: string
  avatarUrl: string | null
}

function AccionesRapidasContent({
  esAdmin,
  onSancion,
  onGestionarRol,
}: {
  esAdmin: boolean
  onSancion: (tipo: TipoSancion, minutos?: number) => void
  onGestionarRol: () => void
}) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onSelect={() => onSancion('advertencia')}>
        <AlertTriangle className="size-4" />
        Emitir advertencia
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <ShieldQuestion className="size-4" />
          Ban temporal
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {DURACIONES_RAPIDAS.map((duracion) => (
            <DropdownMenuItem
              key={duracion.minutos}
              onSelect={() => onSancion('ban_temporal', duracion.minutos)}
            >
              {duracion.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem variant="destructive" onSelect={() => onSancion('ban_permanente')}>
        <Ban className="size-4" />
        Suspensión permanente
      </DropdownMenuItem>
      {esAdmin && (
        <DropdownMenuItem onSelect={onGestionarRol}>
          <UserCog className="size-4" />
          Gestionar rol de staff
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  )
}

function UsuarioCard({
  usuario,
  esAdmin,
  onSelect,
  onSancion,
  onGestionarRol,
}: {
  usuario: UsuarioStaffResultado
  esAdmin: boolean
  onSelect: () => void
  onSancion: (tipo: TipoSancion, minutos?: number) => void
  onGestionarRol: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar>
          {usuario.avatarUrl && <AvatarImage src={usuario.avatarUrl} />}
          <AvatarFallback>{initials(usuario.nombreCompleto || usuario.nombreUsuario)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{usuario.nombreUsuario}</span>
            <UserBadges userId={usuario.id} />
          </div>
          <EstadoBadge estado={usuario.estadoCuenta} />
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Acciones
          </Button>
        </DropdownMenuTrigger>
        <AccionesRapidasContent esAdmin={esAdmin} onSancion={onSancion} onGestionarRol={onGestionarRol} />
      </DropdownMenu>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-border py-3">
      <span className="text-xl font-semibold text-foreground">{value}</span>
      <span className="text-center text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function derivarEstadoDesdeHistorial(sanciones: SancionConAutor[]): EstadoCuenta {
  const ahora = Date.now()
  if (sanciones.some((s) => s.activa && s.tipo === 'ban_permanente')) return 'ban_permanente'
  if (
    sanciones.some(
      (s) => s.activa && s.tipo === 'ban_temporal' && (!s.expiraAt || new Date(s.expiraAt).getTime() > ahora)
    )
  ) {
    return 'ban_temporal'
  }
  if (sanciones.some((s) => s.activa && s.tipo === 'advertencia')) return 'advertido'
  return 'activo'
}

function StaffPanelBody({ esAdmin }: { esAdmin: boolean }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 300), [])
  useEffect(() => debouncedSetQuery.cancel, [debouncedSetQuery])

  const [resultados, setResultados] = useState<UsuarioStaffResultado[]>([])
  const [resultadosDeQuery, setResultadosDeQuery] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const buscando = debouncedQuery.trim() !== '' && resultadosDeQuery !== debouncedQuery.trim()

  const [recientes, setRecientes] = useState<SancionReciente[] | null>(null)
  const [stats, setStats] = useState<EstadisticasSanciones | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0)

  const [seleccionado, setSeleccionado] = useState<UsuarioBasico | null>(null)
  const [sanciones, setSanciones] = useState<SancionConAutor[]>([])
  const [sancionesDe, setSancionesDe] = useState<string | null>(null)
  const [detalleError, setDetalleError] = useState<string | null>(null)
  const cargandoDetalle = seleccionado !== null && sancionesDe !== seleccionado.id

  const [sancionPreset, setSancionPreset] = useState<SancionPreset | null>(null)
  const [rolTarget, setRolTarget] = useState<RolStaffTarget | null>(null)

  useEffect(() => {
    let cancelado = false
    listarSancionesRecientes(8)
      .then((data) => !cancelado && setRecientes(data))
      .catch((err) => !cancelado && setOverviewError(getErrorMessage(err)))
    obtenerEstadisticasSanciones()
      .then((data) => !cancelado && setStats(data))
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [overviewRefreshKey])

  useEffect(() => {
    const termino = debouncedQuery.trim()
    if (!termino) return
    let cancelado = false
    buscarUsuariosStaff(termino)
      .then((data) => {
        if (cancelado) return
        setResultados(data)
        setResultadosDeQuery(termino)
      })
      .catch((err) => !cancelado && setSearchError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [debouncedQuery])

  useEffect(() => {
    if (!seleccionado) return
    let cancelado = false
    listarSancionesUsuario(seleccionado.id)
      .then((data) => {
        if (cancelado) return
        setSanciones(data)
        setSancionesDe(seleccionado.id)
      })
      .catch((err) => !cancelado && setDetalleError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [seleccionado])

  function recargarDetalle() {
    if (!seleccionado) return
    setSancionesDe(null)
    listarSancionesUsuario(seleccionado.id)
      .then(setSanciones)
      .then(() => setSancionesDe(seleccionado.id))
      .catch((err) => setDetalleError(getErrorMessage(err)))
  }

  function refrescarTodo() {
    setOverviewRefreshKey((k) => k + 1)
    recargarDetalle()
  }

  async function handleRevocar(sancionId: string) {
    try {
      await revocarSancion(sancionId)
      refrescarTodo()
    } catch (err) {
      setDetalleError(getErrorMessage(err))
    }
  }

  const resultadosVisibles = debouncedQuery.trim() ? resultados : []
  const estadoSeleccionado = seleccionado && sancionesDe === seleccionado.id ? derivarEstadoDesdeHistorial(sanciones) : null

  function abrirSancion(usuario: UsuarioBasico, tipo: TipoSancion, minutos?: number) {
    setSancionPreset({ targetUserId: usuario.id, targetUserName: usuario.nombre, tipo, minutos })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            debouncedSetQuery(event.target.value)
          }}
          placeholder="Buscar usuario por nombre de usuario o nombre…"
          className="pl-9"
          autoFocus
        />
      </div>

      {seleccionado ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setSeleccionado(null)}>
            Volver
          </Button>

          {detalleError && (
            <p className="text-sm text-destructive" role="alert">
              {detalleError}
            </p>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Avatar>
              {seleccionado.avatarUrl && <AvatarImage src={seleccionado.avatarUrl} />}
              <AvatarFallback>{initials(seleccionado.nombre)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-foreground">{seleccionado.nombre}</p>
                <UserBadges userId={seleccionado.id} />
              </div>
              {estadoSeleccionado && <EstadoBadge estado={estadoSeleccionado} />}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  Sancionar
                </Button>
              </DropdownMenuTrigger>
              <AccionesRapidasContent
                esAdmin={esAdmin}
                onSancion={(tipo, minutos) => abrirSancion(seleccionado, tipo, minutos)}
                onGestionarRol={() =>
                  setRolTarget({ targetUserId: seleccionado.id, targetUserName: seleccionado.nombre })
                }
              />
            </DropdownMenu>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {cargandoDetalle && <p className="text-sm text-muted-foreground">Cargando historial…</p>}
            {!cargandoDetalle && sanciones.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin sanciones registradas.</p>
            )}
            {sanciones.map((sancion) => (
              <div key={sancion.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{ETIQUETA_TIPO_SANCION[sancion.tipo]}</span>
                  <Badge variant={sancion.activa ? 'destructive' : 'outline'}>
                    {sancion.activa ? 'Activa' : 'Revocada'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{sancion.motivo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {relativeTime(sancion.creadoAt)}
                  {sancion.aplicadoPorNombre ? ` · aplicada por ${sancion.aplicadoPorNombre}` : ''}
                  {sancion.tipo === 'ban_temporal' && sancion.expiraAt
                    ? ` · vence ${relativeTime(sancion.expiraAt)}`
                    : ''}
                </p>
                {sancion.activa && (
                  <button
                    type="button"
                    onClick={() => handleRevocar(sancion.id)}
                    className="mt-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Revocar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : debouncedQuery.trim() ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {searchError && (
            <p className="text-sm text-destructive" role="alert">
              {searchError}
            </p>
          )}
          {buscando && <p className="text-sm text-muted-foreground">Buscando…</p>}
          {!buscando && resultadosVisibles.length === 0 && !searchError && (
            <p className="text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {resultadosVisibles.map((usuario) => (
            <UsuarioCard
              key={usuario.id}
              usuario={usuario}
              esAdmin={esAdmin}
              onSelect={() => setSeleccionado({ id: usuario.id, nombre: usuario.nombreUsuario, avatarUrl: usuario.avatarUrl })}
              onSancion={(tipo, minutos) =>
                abrirSancion({ id: usuario.id, nombre: usuario.nombreUsuario, avatarUrl: usuario.avatarUrl }, tipo, minutos)
              }
              onGestionarRol={() => setRolTarget({ targetUserId: usuario.id, targetUserName: usuario.nombreUsuario })}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {overviewError && (
            <p className="text-sm text-destructive" role="alert">
              {overviewError}
            </p>
          )}

          {stats && (
            <div className="flex gap-2">
              <StatTile label="Advertencias activas" value={stats.advertenciasActivas} />
              <StatTile label="Bans temporales" value={stats.bansTemporalesActivos} />
              <StatTile label="Suspensiones permanentes" value={stats.bansPermanentesActivos} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sanciones recientes
            </p>
            {recientes === null && <p className="text-sm text-muted-foreground">Cargando…</p>}
            {recientes && recientes.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no se aplicó ninguna sanción.</p>
            )}
            {recientes?.map((sancion) => (
              <button
                key={sancion.id}
                type="button"
                onClick={() =>
                  setSeleccionado({ id: sancion.usuarioId, nombre: sancion.nombreUsuario, avatarUrl: sancion.avatarUrl })
                }
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Avatar className="size-8">
                  {sancion.avatarUrl && <AvatarImage src={sancion.avatarUrl} />}
                  <AvatarFallback>{initials(sancion.nombreUsuario)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{sancion.nombreUsuario}</span>
                    {' · '}
                    {ETIQUETA_TIPO_SANCION[sancion.tipo]}
                    {!sancion.activa ? ' (revocada)' : ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{sancion.motivo}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(sancion.creadoAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <AplicarSancionDialog
        preset={sancionPreset}
        onOpenChange={(open) => !open && setSancionPreset(null)}
        onApplied={() => {
          setSancionPreset(null)
          refrescarTodo()
        }}
      />

      <RolStaffDialog
        target={rolTarget}
        onOpenChange={(open) => !open && setRolTarget(null)}
        onChanged={refrescarTodo}
      />
    </div>
  )
}
