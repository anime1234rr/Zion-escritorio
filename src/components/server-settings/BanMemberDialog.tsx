import { useState } from 'react'

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

interface BanMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  onConfirm: (razon: string, minutos: number | null) => Promise<void>
}

const DURACIONES_BANEO: { label: string; minutos: number | null }[] = [
  { label: 'Permanente', minutos: null },
  { label: '1 hora', minutos: 60 },
  { label: '1 día', minutos: 60 * 24 },
  { label: '7 días', minutos: 60 * 24 * 7 },
  { label: '30 días', minutos: 60 * 24 * 30 },
]

export function BanMemberDialog({ open, onOpenChange, memberName, onConfirm }: BanMemberDialogProps) {
  const [razon, setRazon] = useState('')
  const [minutos, setMinutos] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm(razon, minutos)
      onOpenChange(false)
      setRazon('')
      setMinutos(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Banear a {memberName}</DialogTitle>
          <DialogDescription>
            {memberName} va a dejar de ser miembro y no va a poder volver a unirse con ningún enlace de
            invitación{minutos === null ? ' hasta que lo desbanees' : ' mientras dure el baneo'}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Duración</Label>
          <div className="flex flex-wrap gap-1.5">
            {DURACIONES_BANEO.map((opcion) => (
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="razon_baneo">Motivo (opcional)</Label>
          <Textarea
            id="razon_baneo"
            value={razon}
            onChange={(event) => setRazon(event.target.value)}
            rows={2}
            placeholder="Solo lo van a ver los moderadores del servidor"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="destructive" disabled={loading} onClick={handleConfirm}>
            {loading ? 'Baneando…' : 'Banear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
