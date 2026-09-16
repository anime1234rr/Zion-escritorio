import { useEffect, useState } from 'react'

import {
  AUTOMOD_VACIO,
  guardarAutomodConfig,
  levantarBloqueoRaid,
  obtenerAutomodConfig,
  type AdjuntosPermitidos,
  type AutomodConfig,
} from '@/lib/automod'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AutoModSectionProps {
  server: ServerItem
  canEdit: boolean
}

const SLOWMODE_OPCIONES: { valor: number; label: string }[] = [
  { valor: 0, label: 'Off' },
  { valor: 5, label: '5 s' },
  { valor: 10, label: '10 s' },
  { valor: 30, label: '30 s' },
  { valor: 60, label: '1 min' },
  { valor: 300, label: '5 min' },
]

const EDAD_OPCIONES: { valor: number; label: string }[] = [
  { valor: 0, label: 'Off' },
  { valor: 1, label: '1 h' },
  { valor: 6, label: '6 h' },
  { valor: 24, label: '1 día' },
  { valor: 72, label: '3 días' },
  { valor: 168, label: '7 días' },
]

const RAID_UMBRAL_OPCIONES: { valor: number; label: string }[] = [
  { valor: 0, label: 'Off' },
  { valor: 5, label: '5' },
  { valor: 10, label: '10' },
  { valor: 20, label: '20' },
  { valor: 50, label: '50' },
]

const RAID_VENTANA_OPCIONES: { valor: number; label: string }[] = [
  { valor: 30, label: '30 s' },
  { valor: 60, label: '1 min' },
  { valor: 300, label: '5 min' },
]

const MENCIONES_OPCIONES: { valor: number; label: string }[] = [
  { valor: 0, label: 'Sin límite' },
  { valor: 3, label: '3' },
  { valor: 5, label: '5' },
  { valor: 10, label: '10' },
]

const ADJUNTOS_OPCIONES: { valor: AdjuntosPermitidos; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'solo_imagenes', label: 'Solo imágenes' },
  { valor: 'ninguno', label: 'Bloquear' },
]

const RAID_COOLDOWN_OPCIONES: { valor: number; label: string }[] = [
  { valor: 300, label: '5 min' },
  { valor: 1800, label: '30 min' },
  { valor: 7200, label: '2 h' },
]

function segmento(activo: boolean) {
  return cn(
    'rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
    activo
      ? 'border-primary bg-primary/10 text-foreground'
      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
  )
}

export function AutoModSection({ server, canEdit }: AutoModSectionProps) {
  const [config, setConfig] = useState<AutomodConfig>(AUTOMOD_VACIO)
  const [palabrasTexto, setPalabrasTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okAt, setOkAt] = useState(0)
  const [levantando, setLevantando] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelado = false
    obtenerAutomodConfig(server.id)
      .then((cfg) => {
        if (cancelado) return
        setConfig(cfg)
        setPalabrasTexto(cfg.palabrasBloqueadas.join('\n'))
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [server.id])

  async function handleGuardar() {
    setSaving(true)
    setError(null)
    try {
      const palabras = palabrasTexto
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
      const guardado = await guardarAutomodConfig(server.id, {
        ...config,
        palabrasBloqueadas: palabras,
      })
      setConfig(guardado)
      setPalabrasTexto(guardado.palabrasBloqueadas.join('\n'))
      setOkAt(Date.now())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleLevantarBloqueo() {
    setLevantando(true)
    setError(null)
    try {
      await levantarBloqueoRaid(server.id)
      setConfig((c) => ({ ...c, raidBloqueadoHasta: null }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLevantando(false)
    }
  }

  const bloqueadoRaid =
    config.raidBloqueadoHasta != null && new Date(config.raidBloqueadoHasta).getTime() > ahora

  return (
    <div className="max-w-xl">
      <h2 className="text-base font-semibold text-foreground">AutoMod</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reglas automáticas para los mensajes de {server.name}. El propietario del servidor está
        exento.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="automod_palabras" className="text-xs text-muted-foreground uppercase">
              Palabras bloqueadas
            </Label>
            <Textarea
              id="automod_palabras"
              value={palabrasTexto}
              rows={5}
              disabled={!canEdit}
              placeholder="Una palabra o frase por línea"
              onChange={(event) => setPalabrasTexto(event.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">
              No distingue mayúsculas. Un mensaje que contenga cualquiera de estas se rechaza.
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <Label className="text-xs text-muted-foreground uppercase">Mensajes y archivos</Label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">Bloquear enlaces en los mensajes</span>
              <input
                type="checkbox"
                className="size-4 accent-primary"
                disabled={!canEdit}
                checked={config.bloquearEnlaces}
                onChange={(event) =>
                  setConfig((c) => ({ ...c, bloquearEnlaces: event.target.checked }))
                }
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Máximo de menciones por mensaje:</span>
              {MENCIONES_OPCIONES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setConfig((c) => ({ ...c, maxMenciones: opcion.valor }))}
                  className={segmento(config.maxMenciones === opcion.valor)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Adjuntos permitidos:</span>
              {ADJUNTOS_OPCIONES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setConfig((c) => ({ ...c, adjuntosPermitidos: opcion.valor }))}
                  className={segmento(config.adjuntosPermitidos === opcion.valor)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-muted-foreground">
              «Solo imágenes» rechaza videos, audios y otros archivos. El propietario está exento de
              todas estas reglas.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground uppercase">Modo lento</Label>
            <div className="flex flex-wrap gap-2">
              {SLOWMODE_OPCIONES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setConfig((c) => ({ ...c, slowmodeSegundos: opcion.valor }))}
                  className={segmento(config.slowmodeSegundos === opcion.valor)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Tiempo mínimo entre mensajes de una misma persona, en cualquier canal.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground uppercase">Antigüedad mínima de cuenta</Label>
            <div className="flex flex-wrap gap-2">
              {EDAD_OPCIONES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setConfig((c) => ({ ...c, edadMinimaHoras: opcion.valor }))}
                  className={segmento(config.edadMinimaHoras === opcion.valor)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Las cuentas más nuevas que esto no pueden escribir en el servidor.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground uppercase">Protección anti-raid</Label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Ingresos que disparan el bloqueo:</span>
              {RAID_UMBRAL_OPCIONES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setConfig((c) => ({ ...c, raidUmbralJoins: opcion.valor }))}
                  className={segmento(config.raidUmbralJoins === opcion.valor)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            {config.raidUmbralJoins > 0 && (
              <div className="mt-1 flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">En una ventana de:</span>
                  {RAID_VENTANA_OPCIONES.map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        setConfig((c) => ({ ...c, raidVentanaSegundos: opcion.valor }))
                      }
                      className={segmento(config.raidVentanaSegundos === opcion.valor)}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Pausar ingresos por:</span>
                  {RAID_COOLDOWN_OPCIONES.map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        setConfig((c) => ({ ...c, raidCooldownSegundos: opcion.valor }))
                      }
                      className={segmento(config.raidCooldownSegundos === opcion.valor)}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <span className="text-[11px] text-muted-foreground">
              Si entran muchas cuentas de golpe, se rechazan los ingresos nuevos hasta que pase el
              enfriamiento.
            </span>

            {bloqueadoRaid && (
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
                <span className="text-xs text-destructive">
                  Ingresos bloqueados hasta {new Date(config.raidBloqueadoHasta!).toLocaleTimeString()}
                </span>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={levantando}
                    onClick={handleLevantarBloqueo}
                  >
                    {levantando ? '…' : 'Levantar ahora'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {canEdit ? (
            <div className="flex items-center gap-3">
              <Button type="button" disabled={saving} onClick={handleGuardar}>
                {saving ? 'Guardando…' : 'Guardar AutoMod'}
              </Button>
              {okAt > 0 && !saving && (
                <span className="text-xs text-online">Guardado.</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Solo el propietario del servidor puede cambiar estas reglas.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
