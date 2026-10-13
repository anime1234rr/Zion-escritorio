import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  Hash,
  Mail,
  Paperclip,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserSearch,
} from 'lucide-react'

import {
  ETIQUETA_ESTADO_REPORTE,
  ETIQUETA_MOTIVO,
  staffListarReportes,
  staffObtenerEvidencias,
  staffResolverReporte,
  type EstadoReporte,
  type EvidenciaStaff,
  type FiltroReportes,
  type ReporteStaff,
  type SancionPorReporte,
} from '@/lib/reports'
import { suscribirseAlPanelStaff } from '@/lib/realtime-avisos'
import { formatFullDate, initials, relativeTime } from '@/lib/internal/core-utils'
import { cn, getErrorMessage } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const FILTROS: { valor: FiltroReportes; label: string }[] = [
  { valor: 'abiertos', label: 'Abiertos' },
  { valor: 'resuelto', label: 'Resueltos' },
  { valor: 'descartado', label: 'Descartados' },
  { valor: 'falso', label: 'Falsos' },
  { valor: 'todos', label: 'Todos' },
]

const ESTADO_CLASE: Record<EstadoReporte, string> = {
  pendiente: 'bg-idle/15 text-idle',
  en_revision: 'bg-primary/15 text-primary',
  resuelto: 'bg-online/15 text-online',
  descartado: 'bg-muted text-muted-foreground',
  falso: 'bg-destructive/15 text-destructive',
}

type OpcionSancion = { id: string; label: string; tipo?: SancionPorReporte; minutos?: number }

const OPCIONES_SANCION: OpcionSancion[] = [
  { id: 'ninguna', label: 'Sin sanción' },
  { id: 'advertencia', label: 'Advertencia', tipo: 'advertencia' },
  { id: 'ban_1d', label: 'Ban 1 día', tipo: 'ban_temporal', minutos: 60 * 24 },
  { id: 'ban_7d', label: 'Ban 7 días', tipo: 'ban_temporal', minutos: 60 * 24 * 7 },
  { id: 'ban_30d', label: 'Ban 30 días', tipo: 'ban_temporal', minutos: 60 * 24 * 30 },
  { id: 'permanente', label: 'Suspensión permanente', tipo: 'ban_permanente' },
]

function EstadoChip({ estado }: { estado: EstadoReporte }) {
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', ESTADO_CLASE[estado])}>
      {ETIQUETA_ESTADO_REPORTE[estado]}
    </span>
  )
}

export function ReportesTab({
  onVerUsuario,
  onCambio,
}: {
  onVerUsuario: (usuario: { id: string; nombre: string; avatarUrl: string | null }) => void
  onCambio: () => void
}) {
  const [filtro, setFiltro] = useState<FiltroReportes>('abiertos')
  const [reportes, setReportes] = useState<ReporteStaff[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [ultimoSeleccionado, setUltimoSeleccionado] = useState<ReporteStaff | null>(null)

  useEffect(() => {
    let cancelado = false
    staffListarReportes(filtro)
      .then((data) => {
        if (cancelado) return
        setReportes(data)
        setError(null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [filtro, refreshKey])

  useEffect(() => suscribirseAlPanelStaff(() => setRefreshKey((k) => k + 1)), [])

  const seleccionado = seleccionadoId
    ? (reportes?.find((r) => r.id === seleccionadoId) ??
      (ultimoSeleccionado?.id === seleccionadoId ? ultimoSeleccionado : null))
    : null

  if (seleccionado) {
    return (
      <ReporteDetalle
        key={seleccionado.id}
        reporte={seleccionado}
        onVolver={() => setSeleccionadoId(null)}
        onVerUsuario={onVerUsuario}
        onResuelto={() => {
          setRefreshKey((k) => k + 1)
          onCambio()
        }}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => {
              setFiltro(f.valor)
              setReportes(null)
            }}
            className={cn(
              'rounded-full border border-border px-3 py-1 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
              filtro === f.valor && 'border-primary bg-primary/10 text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!reportes && !error && <p className="text-sm text-muted-foreground">Cargando reportes…</p>}
        {reportes && reportes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-8 text-online" />
            No hay reportes en esta lista.
          </div>
        )}
        {reportes?.map((reporte) => (
          <button
            key={reporte.id}
            type="button"
            onClick={() => {
              setSeleccionadoId(reporte.id)
              setUltimoSeleccionado(reporte)
            }}
            className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar className="size-9">
              {reporte.reportadoAvatar && <AvatarImage src={reporte.reportadoAvatar} />}
              <AvatarFallback>{initials(reporte.reportadoNombre)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{reporte.reportadoNombre}</span>
                <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                  {ETIQUETA_MOTIVO[reporte.motivo]}
                </span>
                {reporte.reportesContraReportado > 1 && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {reporte.reportesContraReportado} reportes
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Por {reporte.reportanteNombre} · {reporte.cantidadEvidencias}{' '}
                {reporte.cantidadEvidencias === 1 ? 'evidencia' : 'evidencias'} · {reporte.descripcion}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <EstadoChip estado={reporte.estado} />
              <span className="text-[11px] text-muted-foreground">{relativeTime(reporte.creadoAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ReporteDetalle({
  reporte,
  onVolver,
  onVerUsuario,
  onResuelto,
}: {
  reporte: ReporteStaff
  onVolver: () => void
  onVerUsuario: (usuario: { id: string; nombre: string; avatarUrl: string | null }) => void
  onResuelto: () => void
}) {
  const [evidencias, setEvidencias] = useState<EvidenciaStaff[] | null>(null)
  const [evidenciaError, setEvidenciaError] = useState<string | null>(null)
  const [resolucion, setResolucion] = useState('')
  const [sancionId, setSancionId] = useState('ninguna')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abierto = reporte.estado === 'pendiente' || reporte.estado === 'en_revision'

  useEffect(() => {
    let cancelado = false
    staffObtenerEvidencias(reporte.id)
      .then((data) => !cancelado && setEvidencias(data))
      .catch((err) => !cancelado && setEvidenciaError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [reporte.id])

  async function resolver(estado: Exclude<EstadoReporte, 'pendiente'>) {
    setError(null)
    const opcion = OPCIONES_SANCION.find((o) => o.id === sancionId)
    setBusy(true)
    try {
      await staffResolverReporte({
        reporteId: reporte.id,
        estado,
        resolucion,
        sancion: estado === 'resuelto' ? opcion?.tipo : undefined,
        minutos: estado === 'resuelto' ? opcion?.minutos : undefined,
      })
      onResuelto()
      if (estado !== 'en_revision') onVolver()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const alteradas = evidencias?.filter((e) => !e.integridadOk).length ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onVolver}>
        <ArrowLeft className="size-4" />
        Volver a reportes
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <PersonaReporte
          titulo="Reportado"
          nombre={reporte.reportadoNombre}
          avatar={reporte.reportadoAvatar}
          detalle={`${reporte.reportesContraReportado} ${reporte.reportesContraReportado === 1 ? 'reporte válido o abierto' : 'reportes válidos o abiertos'}`}
          onVer={() =>
            onVerUsuario({ id: reporte.reportadoId, nombre: reporte.reportadoNombre, avatarUrl: reporte.reportadoAvatar })
          }
        />
        <PersonaReporte
          titulo="Reportante"
          nombre={reporte.reportanteNombre}
          avatar={reporte.reportanteAvatar}
          detalle={`${reporte.reportesFalsosReportante} ${reporte.reportesFalsosReportante === 1 ? 'reporte falso' : 'reportes falsos'}`}
          alerta={reporte.reportesFalsosReportante > 0}
          onVer={() =>
            onVerUsuario({ id: reporte.reportanteId, nombre: reporte.reportanteNombre, avatarUrl: reporte.reportanteAvatar })
          }
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            {ETIQUETA_MOTIVO[reporte.motivo]}
          </span>
          <EstadoChip estado={reporte.estado} />
        </div>
        <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{reporte.descripcion}</p>
        <p className="mt-2 text-xs text-muted-foreground">Enviado {formatFullDate(reporte.creadoAt)}</p>
        {reporte.resolucion && (
          <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Resolución</span>
            {reporte.revisadoPorNombre ? ` de ${reporte.revisadoPorNombre}` : ''}: {reporte.resolucion}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Evidencia</p>
          {evidencias && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                alteradas === 0 ? 'text-online' : 'text-destructive'
              )}
            >
              {alteradas === 0 ? <ShieldCheck className="size-3.5" /> : <ShieldX className="size-3.5" />}
              {alteradas === 0 ? 'Todas las copias son íntegras' : `${alteradas} copias no coinciden`}
            </span>
          )}
        </div>
        {evidenciaError && (
          <p className="text-sm text-destructive" role="alert">
            {evidenciaError}
          </p>
        )}
        {!evidencias && !evidenciaError && <p className="text-sm text-muted-foreground">Cargando evidencia…</p>}
        {evidencias?.map((e) => (
          <div key={e.id} className="rounded-lg border border-border p-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {e.origen === 'directo' ? <Mail className="size-3" /> : <Hash className="size-3" />}
              <span>{e.contexto}</span>
              <span>· {formatFullDate(e.mensajeCreadoAt)}</span>
              {e.editado && <span>· ya estaba editado</span>}
              {!e.sigueExistiendo && (
                <span className="flex items-center gap-0.5 text-idle">
                  <Trash2 className="size-3" />
                  Borrado después del reporte
                </span>
              )}
              {e.cambioDespues && (
                <span className="flex items-center gap-0.5 text-idle">
                  <FileWarning className="size-3" />
                  Editado después del reporte
                </span>
              )}
              {!e.integridadOk && (
                <span className="flex items-center gap-0.5 text-destructive">
                  <ShieldX className="size-3" />
                  La copia no coincide con su huella
                </span>
              )}
            </div>
            {e.contenido && (
              <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground">{e.contenido}</p>
            )}
            {e.adjuntoUrl &&
              (e.adjuntoTipo?.startsWith('image') ? (
                <a href={e.adjuntoUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                  <img src={e.adjuntoUrl} alt="Adjunto de la evidencia" className="max-h-48 rounded-md object-contain" />
                </a>
              ) : (
                <a
                  href={e.adjuntoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Paperclip className="size-3" />
                  Ver adjunto{e.adjuntoTipo ? ` (${e.adjuntoTipo})` : ''}
                </a>
              ))}
          </div>
        ))}
      </div>

      {abierto && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">Decisión</p>
          <div className="flex flex-col gap-1.5">
            <Label>Sanción para {reporte.reportadoNombre} (solo si lo resolvés)</Label>
            <div className="flex flex-wrap gap-1.5">
              {OPCIONES_SANCION.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSancionId(o.id)}
                  className={cn(
                    'rounded-md border border-border px-2.5 py-1 text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                    sancionId === o.id && 'border-primary bg-primary/10 text-foreground',
                    sancionId === o.id && o.tipo === 'ban_permanente' && 'border-destructive bg-destructive/10'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reporte-resolucion">Resolución</Label>
            <Textarea
              id="reporte-resolucion"
              value={resolucion}
              onChange={(event) => setResolucion(event.target.value)}
              placeholder="Qué revisaste y por qué tomás esta decisión. Se guarda en el historial."
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {reporte.estado === 'pendiente' && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => resolver('en_revision')}>
                Tomar en revisión
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => resolver('falso')}>
              <AlertTriangle className="size-4" />
              Marcar como falso
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => resolver('descartado')}>
              Descartar
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => resolver('resuelto')}>
              {busy ? 'Guardando…' : 'Resolver'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonaReporte({
  titulo,
  nombre,
  avatar,
  detalle,
  alerta,
  onVer,
}: {
  titulo: string
  nombre: string
  avatar: string | null
  detalle: string
  alerta?: boolean
  onVer: () => void
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
      <Avatar className="size-9">
        {avatar && <AvatarImage src={avatar} />}
        <AvatarFallback>{initials(nombre)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</p>
        <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
        <p className={cn('truncate text-xs', alerta ? 'text-destructive' : 'text-muted-foreground')}>{detalle}</p>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ver historial de ${nombre}`} onClick={onVer}>
        <UserSearch className="size-4" />
      </Button>
    </div>
  )
}
