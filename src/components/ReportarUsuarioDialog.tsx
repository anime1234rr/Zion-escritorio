import { useEffect, useState } from 'react'
import { Check, CheckCircle2, Flag, Hash, Mail, Paperclip, ShieldCheck } from 'lucide-react'

import {
  DESCRIPCION_MAXIMA,
  DESCRIPCION_MINIMA,
  MAX_EVIDENCIAS,
  MOTIVOS_REPORTE,
  crearReporteUsuario,
  listarMensajesReportables,
  type MensajeReportable,
  type MotivoReporte,
} from '@/lib/reports'
import { relativeTime } from '@/lib/internal/core-utils'
import { cn, getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ReportarUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuarioId: string
  usuarioNombre: string
}

type Paso = 'motivo' | 'evidencia' | 'detalle' | 'enviado'

export function ReportarUsuarioDialog({
  open,
  onOpenChange,
  usuarioId,
  usuarioNombre,
}: ReportarUsuarioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        {open && (
          <ReportarUsuarioBody
            usuarioId={usuarioId}
            usuarioNombre={usuarioNombre}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReportarUsuarioBody({
  usuarioId,
  usuarioNombre,
  onClose,
}: {
  usuarioId: string
  usuarioNombre: string
  onClose: () => void
}) {
  const [paso, setPaso] = useState<Paso>('motivo')
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null)
  const [mensajes, setMensajes] = useState<MensajeReportable[] | null>(null)
  const [cargaError, setCargaError] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [descripcion, setDescripcion] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarMensajesReportables(usuarioId)
      .then((data) => !cancelado && setMensajes(data))
      .catch((err) => !cancelado && setCargaError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  function alternar(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_EVIDENCIAS) next.add(id)
      return next
    })
  }

  const largo = descripcion.trim().length
  const puedeEnviar =
    motivo !== null &&
    seleccion.size > 0 &&
    largo >= DESCRIPCION_MINIMA &&
    largo <= DESCRIPCION_MAXIMA &&
    confirmado &&
    !enviando

  async function enviar() {
    if (!puedeEnviar || !motivo || !mensajes) return
    setError(null)
    setEnviando(true)
    try {
      await crearReporteUsuario({
        reportadoId: usuarioId,
        motivo,
        descripcion,
        evidencias: mensajes
          .filter((m) => seleccion.has(m.id))
          .map((m) => ({ origen: m.origen, id: m.id })),
      })
      setPaso('enviado')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setEnviando(false)
    }
  }

  if (paso === 'enviado') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-10 text-online" />
        <DialogTitle>Reporte enviado</DialogTitle>
        <p className="max-w-sm text-sm text-muted-foreground">
          El equipo de Zion va a revisar la evidencia. Te avisamos con una notificación cuando el
          reporte se cierre. {usuarioNombre} no va a saber quién lo reportó.
        </p>
        <Button type="button" className="mt-2" onClick={onClose}>
          Listo
        </Button>
      </div>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Flag className="size-4.5 text-destructive" />
          Reportar a {usuarioNombre}
        </DialogTitle>
        <DialogDescription>
          {paso === 'motivo' && 'Paso 1 de 3 · ¿Qué está pasando?'}
          {paso === 'evidencia' &&
            `Paso 2 de 3 · Elegí los mensajes de ${usuarioNombre} que lo demuestran (hasta ${MAX_EVIDENCIAS}).`}
          {paso === 'detalle' && 'Paso 3 de 3 · Contanos qué pasó.'}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {paso === 'motivo' && (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {MOTIVOS_REPORTE.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => setMotivo(m.valor)}
                aria-pressed={motivo === m.valor}
                className={cn(
                  'rounded-lg border border-border px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                  motivo === m.valor && 'border-destructive bg-destructive/10'
                )}
              >
                <span className="block text-sm font-medium text-foreground">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.descripcion}</span>
              </button>
            ))}
          </div>
        )}

        {paso === 'evidencia' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Solo podés adjuntar mensajes reales de {usuarioNombre} que vos podés ver. Al enviar el
              reporte se guarda una copia verificable de cada uno, aunque después los edite o los
              borre. No se aceptan capturas de pantalla.
            </div>

            {cargaError && (
              <p className="text-sm text-destructive" role="alert">
                {cargaError}
              </p>
            )}
            {!mensajes && !cargaError && <p className="text-sm text-muted-foreground">Cargando mensajes…</p>}
            {mensajes && mensajes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No encontramos mensajes de {usuarioNombre} que puedas ver. Sin evidencia no se puede
                enviar un reporte.
              </p>
            )}

            {mensajes?.map((mensaje) => {
              const elegido = seleccion.has(mensaje.id)
              const lleno = !elegido && seleccion.size >= MAX_EVIDENCIAS
              return (
                <button
                  key={mensaje.id}
                  type="button"
                  disabled={lleno}
                  onClick={() => alternar(mensaje.id)}
                  aria-pressed={elegido}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border border-border p-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
                    elegido && 'border-primary bg-primary/10'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-border',
                      elegido && 'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    {elegido && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {mensaje.origen === 'directo' ? <Mail className="size-3" /> : <Hash className="size-3" />}
                      <span className="truncate">{mensaje.contexto}</span>
                      <span className="shrink-0">· {relativeTime(mensaje.creadoAt)}</span>
                      {mensaje.editado && <span className="shrink-0">· editado</span>}
                    </span>
                    {mensaje.contenido && (
                      <span className="mt-0.5 line-clamp-3 block text-sm break-words text-foreground">
                        {mensaje.contenido}
                      </span>
                    )}
                    {mensaje.adjuntoUrl && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="size-3" />
                        Adjunto{mensaje.adjuntoTipo ? ` (${mensaje.adjuntoTipo})` : ''}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {paso === 'detalle' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reporte-descripcion">Descripción</Label>
              <Textarea
                id="reporte-descripcion"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value.slice(0, DESCRIPCION_MAXIMA))}
                placeholder="Explicá qué pasó, cuándo y por qué los mensajes elegidos infringen las normas."
                className="min-h-28"
                autoFocus
              />
              <p
                className={cn(
                  'text-right text-xs',
                  largo < DESCRIPCION_MINIMA ? 'text-muted-foreground' : 'text-online'
                )}
              >
                {largo < DESCRIPCION_MINIMA
                  ? `Faltan ${DESCRIPCION_MINIMA - largo} caracteres`
                  : `${largo}/${DESCRIPCION_MAXIMA}`}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              {seleccion.size} {seleccion.size === 1 ? 'mensaje adjunto' : 'mensajes adjuntos'} como
              evidencia.
            </p>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 text-sm">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(event) => setConfirmado(event.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-muted-foreground">
                Confirmo que este reporte es verdadero. Sé que los reportes falsos pueden limitar mi
                capacidad de reportar y llevar a sanciones en mi cuenta.
              </span>
            </label>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        {paso !== 'motivo' && (
          <Button
            type="button"
            variant="ghost"
            disabled={enviando}
            onClick={() => setPaso(paso === 'detalle' ? 'evidencia' : 'motivo')}
          >
            Atrás
          </Button>
        )}
        {paso === 'motivo' && (
          <Button type="button" disabled={!motivo} onClick={() => setPaso('evidencia')}>
            Siguiente
          </Button>
        )}
        {paso === 'evidencia' && (
          <Button type="button" disabled={seleccion.size === 0} onClick={() => setPaso('detalle')}>
            Siguiente
          </Button>
        )}
        {paso === 'detalle' && (
          <Button type="button" variant="destructive" disabled={!puedeEnviar} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
