import { Download, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'

import { useAppUpdate } from '@/hooks/use-app-update'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function UpdateBadge() {
  const { status, info, error, everShown, download, retryCheck } = useAppUpdate()

  if (status === 'idle') return null
  if (status === 'checking' && !everShown) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Actualización disponible"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-2 text-xs font-medium text-foreground shadow-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {status === 'error' ? (
            <TriangleAlert className="size-4 text-destructive" />
          ) : status === 'checking' ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="size-4 text-primary" />
          )}
          <span>
            {status === 'checking'
              ? 'Comprobando actualizaciones…'
              : status === 'error'
                ? 'Error al comprobar actualizaciones'
                : 'Actualización disponible'}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Zion {info ? `v${info.version}` : ''}
          </DialogTitle>
          <DialogDescription>
            {status === 'error'
              ? 'No se pudo comprobar si hay actualizaciones.'
              : info?.releaseDate
                ? `Publicada el ${new Date(info.releaseDate).toLocaleDateString('es-AR')}`
                : 'Hay una nueva versión disponible.'}
          </DialogDescription>
        </DialogHeader>

        {info?.releaseNotes && (
          <ScrollArea className="max-h-64 rounded-md border border-border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
              {info.releaseNotes}
            </pre>
          </ScrollArea>
        )}

        {status === 'checking' && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Comprobando actualizaciones…
          </p>
        )}

        {status === 'error' && error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          {status === 'checking' && (
            <Button disabled className="gap-2">
              <Loader2 className="size-4 animate-spin" />
              Comprobando…
            </Button>
          )}

          {status === 'available' && (
            <Button onClick={download} className="gap-2">
              <Download className="size-4" />
              Descargar actualización
            </Button>
          )}

          {status === 'error' && (
            <Button variant="outline" onClick={retryCheck} className="gap-2">
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
