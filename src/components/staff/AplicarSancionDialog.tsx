import { useState } from 'react'

import { aplicarSancion, type TipoSancion } from '@/lib/moderation'
import { ETIQUETA_TIPO_SANCION } from '@/lib/moderation-display'
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

export interface SancionPreset {
  targetUserId: string
  targetUserName: string
  tipo: TipoSancion
  minutos?: number
}

interface AplicarSancionDialogProps {
  preset: SancionPreset | null
  onOpenChange: (open: boolean) => void
  onApplied: () => void
}

const TIPOS: TipoSancion[] = ['advertencia', 'ban_temporal', 'ban_permanente']

const DURACIONES: { label: string; minutos: number }[] = [
  { label: '1 hora', minutos: 60 },
  { label: '1 día', minutos: 60 * 24 },
  { label: '7 días', minutos: 60 * 24 * 7 },
  { label: '30 días', minutos: 60 * 24 * 30 },
]

export function AplicarSancionDialog({ preset, onOpenChange, onApplied }: AplicarSancionDialogProps) {
  return (
    <Dialog
      open={preset !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
    >
      <DialogContent>{preset && <AplicarSancionForm preset={preset} onOpenChange={onOpenChange} onApplied={onApplied} />}</DialogContent>
    </Dialog>
  )
}

function AplicarSancionForm({
  preset,
  onOpenChange,
  onApplied,
}: {
  preset: SancionPreset
  onOpenChange: (open: boolean) => void
  onApplied: () => void
}) {
  const [tipo, setTipo] = useState<TipoSancion>(preset.tipo)
  const [minutos, setMinutos] = useState(preset.minutos ?? DURACIONES[0].minutos)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiereDuracion = tipo === 'ban_temporal'
  const puedeEnviar = motivo.trim().length > 0

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await aplicarSancion(preset.targetUserId, tipo, motivo, requiereDuracion ? minutos : undefined)
      onOpenChange(false)
      onApplied()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Aplicar sanción a {preset.targetUserName}</DialogTitle>
        <DialogDescription>
          Esta acción queda registrada en el historial de la cuenta y es visible para el usuario.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setTipo(opcion)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                tipo === opcion
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {ETIQUETA_TIPO_SANCION[opcion]}
            </button>
          ))}
        </div>
      </div>

      {requiereDuracion && (
        <div className="flex flex-col gap-1.5">
          <Label>Duración</Label>
          <div className="flex flex-wrap gap-1.5">
            {DURACIONES.map((opcion) => (
              <button
                key={opcion.label}
                type="button"
                onClick={() => setMinutos(opcion.minutos)}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  minutos === opcion.minutos
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motivo_sancion">Motivo</Label>
        <Textarea
          id="motivo_sancion"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          rows={3}
          placeholder="El usuario va a ver este motivo exacto en el estado de su cuenta"
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="destructive" disabled={loading || !puedeEnviar} onClick={handleConfirm}>
          {loading ? 'Aplicando…' : 'Aplicar sanción'}
        </Button>
      </DialogFooter>
    </>
  )
}
