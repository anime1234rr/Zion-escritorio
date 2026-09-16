import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { esBanActivo, obtenerMisSanciones, type Sancion } from '@/lib/moderation'
import { ETIQUETA_TIPO_SANCION } from '@/lib/moderation-display'
import { getErrorMessage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function estadoSancion(sancion: Sancion): { label: string; variant: 'destructive' | 'secondary' | 'outline' } {
  if (!sancion.activa) return { label: 'Revocada', variant: 'outline' }
  if (esBanActivo(sancion)) return { label: 'Activa', variant: 'destructive' }
  if (sancion.tipo !== 'advertencia') return { label: 'Vencida', variant: 'outline' }
  return { label: 'Advertencia', variant: 'secondary' }
}

export function EstadoCuentaSection({ userId }: { userId: string }) {
  const [sanciones, setSanciones] = useState<Sancion[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    obtenerMisSanciones()
      .then((data) => !cancelado && setSanciones(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [userId])

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Estado de mi cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acá vas a ver cualquier sanción aplicada a tu cuenta, con el motivo exacto y el historial
        completo.
      </p>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!sanciones && !error && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

      {sanciones && sanciones.length === 0 && (
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-border p-4">
          <ShieldCheck className="size-5 text-online" />
          <p className="text-sm text-foreground">Tu cuenta no tiene ninguna sanción.</p>
        </div>
      )}

      {sanciones && sanciones.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {sanciones.map((sancion) => {
            const estado = estadoSancion(sancion)
            return (
              <div key={sancion.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {ETIQUETA_TIPO_SANCION[sancion.tipo]}
                  </span>
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{sancion.motivo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aplicada el {formatFecha(sancion.creadoAt)}
                  {sancion.tipo === 'ban_temporal' && sancion.expiraAt
                    ? ` · vence el ${formatFecha(sancion.expiraAt)}`
                    : ''}
                </p>
                {!sancion.activa && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Revocada{sancion.revocadaAt ? ` el ${formatFecha(sancion.revocadaAt)}` : ''}
                    {sancion.revocadaMotivo ? ` — ${sancion.revocadaMotivo}` : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
