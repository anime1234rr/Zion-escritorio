import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { reconocerSancion, type Sancion } from '@/lib/moderation'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SancionNoticeDialogProps {
  sancion: Sancion
  onAcknowledged: () => void
}

export function SancionNoticeDialog({ sancion, onAcknowledged }: SancionNoticeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAcknowledge() {
    setLoading(true)
    setError(null)
    try {
      await reconocerSancion(sancion.id)
      onAcknowledged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-idle/10 text-idle ring-1 ring-idle/20">
            <AlertTriangle className="size-6" />
          </div>
          <DialogTitle className="text-center">Recibiste una advertencia</DialogTitle>
          <DialogDescription className="text-center">
            Aplicada el {formatFecha(sancion.creadoAt)}
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
          {sancion.motivo}
        </p>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" disabled={loading} onClick={handleAcknowledge} className="w-full">
            {loading ? 'Confirmando…' : 'Entendido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
