import { useEffect, useState } from 'react'
import { Check, Rocket, X } from 'lucide-react'

import { actualizarServidor, activarComunidad, desactivarComunidad } from '@/lib/servers'
import { listarMiembros } from '@/lib/members'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmarAccionDialog } from '@/components/server-settings/ConfirmarAccionDialog'

const DESCRIPCION_MAX = 300

const MIEMBROS_MINIMOS = 10

interface ActivarComunidadSectionProps {
  server: ServerItem
  canEdit: boolean
  onUpdated: (server: ServerItem) => void
}

interface Requisito {
  label: string
  cumplido: boolean
  ayuda: string
}

export function ActivarComunidadSection({ server, canEdit, onUpdated }: ActivarComunidadSectionProps) {
  const [activando, setActivando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(false)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState(server.description ?? '')
  const [descSeenId, setDescSeenId] = useState(server.id)
  const [guardandoDesc, setGuardandoDesc] = useState(false)
  if (descSeenId !== server.id) {
    setDescSeenId(server.id)
    setDescripcion(server.description ?? '')
  }

  useEffect(() => {
    let cancelado = false
    listarMiembros(server.id)
      .then((data) => !cancelado && setMemberCount(data.length))
      .catch(() => !cancelado && setMemberCount(0))
    return () => {
      cancelado = true
    }
  }, [server.id])

  const requisitos: Requisito[] = [
    {
      label: `Al menos ${MIEMBROS_MINIMOS} miembros`,
      cumplido: memberCount !== null && memberCount >= MIEMBROS_MINIMOS,
      ayuda:
        memberCount === null
          ? 'Cargando cantidad de miembros…'
          : `El servidor tiene ${memberCount} de ${MIEMBROS_MINIMOS} miembros.`,
    },
    {
      label: 'El servidor tiene un ícono',
      cumplido: Boolean(server.iconUrl),
      ayuda: 'Configuralo en Resumen.',
    },
    {
      label: 'Canal de bienvenida configurado',
      cumplido: Boolean(server.welcomeChannelId),
      ayuda: 'Configuralo en Canales y Estructura.',
    },
    {
      label: 'Canal de normas configurado',
      cumplido: Boolean(server.rulesChannelId),
      ayuda: 'Configuralo en Canales y Estructura.',
    },
    {
      label: 'Nivel de verificación medio o superior',
      cumplido: server.verificationLevel === 'medio' || server.verificationLevel === 'alto',
      ayuda: 'Configuralo en Moderación.',
    },
  ]

  const todosCumplidos = requisitos.every((r) => r.cumplido)

  async function handleGuardarDescripcion() {
    setGuardandoDesc(true)
    setError(null)
    try {
      const actualizado = await actualizarServidor(server.id, { descripcion })
      onUpdated(actualizado)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGuardandoDesc(false)
    }
  }

  async function handleActivar() {
    setActivando(true)
    setError(null)
    try {
      const actualizado = await activarComunidad(server.id)
      onUpdated(actualizado)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActivando(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-foreground">Activar comunidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Convertí a {server.name} en un espacio público y estructurado, con reglas y bienvenida
        verificadas.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-popover p-3">
        <Rocket className={server.communityEnabled ? 'size-5 text-primary' : 'size-5 text-muted-foreground'} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {server.communityEnabled ? 'Comunidad activada' : 'Comunidad no activada'}
          </p>
          <p className="text-xs text-muted-foreground">
            {server.communityEnabled
              ? 'Este servidor ya cumple los requisitos y tiene la comunidad activa.'
              : 'Cumplí los requisitos de abajo para poder activarla.'}
          </p>
        </div>
      </div>

      {canEdit && server.communityEnabled && (
        <div className="mt-6 flex flex-col gap-1.5">
          <Label htmlFor="comunidad_desc" className="text-xs text-muted-foreground uppercase">
            Descripción de la comunidad
          </Label>
          <Textarea
            id="comunidad_desc"
            value={descripcion}
            maxLength={DESCRIPCION_MAX}
            rows={3}
            placeholder="De qué trata esta comunidad. Se muestra en Explorar."
            onChange={(event) => setDescripcion(event.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {descripcion.length}/{DESCRIPCION_MAX}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={guardandoDesc || (server.description ?? '') === descripcion}
              onClick={handleGuardarDescripcion}
            >
              {guardandoDesc ? 'Guardando…' : 'Guardar descripción'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {requisitos.map((requisito) => (
          <div
            key={requisito.label}
            className="flex items-start gap-2.5 rounded-md border border-border p-2.5"
          >
            {requisito.cumplido ? (
              <Check className="mt-0.5 size-4 shrink-0 text-online" />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-foreground">{requisito.label}</p>
              {!requisito.cumplido && (
                <p className="text-xs text-muted-foreground">{requisito.ayuda}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {canEdit && (
        <div className="mt-6">
          {server.communityEnabled ? (
            <Button type="button" variant="destructive" onClick={() => setConfirmDesactivar(true)}>
              Desactivar comunidad
            </Button>
          ) : (
            <Button type="button" disabled={!todosCumplidos || activando} onClick={handleActivar}>
              {activando ? 'Activando…' : 'Activar comunidad'}
            </Button>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="mt-6 text-xs text-muted-foreground">
          No tenés permiso para gestionar la comunidad de este servidor.
        </p>
      )}

      <ConfirmarAccionDialog
        open={confirmDesactivar}
        onOpenChange={setConfirmDesactivar}
        title={`Desactivar comunidad en "${server.name}"`}
        description="El servidor deja de estar marcado como comunidad. Podés volver a activarla cuando quieras si cumplís los requisitos."
        confirmLabel="Desactivar"
        onConfirm={async () => {
          const actualizado = await desactivarComunidad(server.id)
          onUpdated(actualizado)
        }}
      />
    </div>
  )
}
