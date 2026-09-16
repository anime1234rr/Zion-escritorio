import { useEffect, useState } from 'react'
import { Bookmark, BookmarkX, CornerUpRight } from 'lucide-react'

import { listarMensajesGuardados, quitarMensajeGuardado } from '@/lib/saved-messages'
import { parseZionLink, type ZionLink } from '@/lib/deep-links'
import type { SavedMessageRow } from '@/lib/db'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SavedMessagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToLink: (link: ZionLink) => void
}

function origenDe(row: SavedMessageRow): string {
  if (row.scope === 'dm') return 'Mensaje directo'
  const canal = row.channelName ? `#${row.channelName}` : 'un canal'
  return row.serverName ? `${canal} · ${row.serverName}` : canal
}

export function SavedMessagesDialog({ open, onOpenChange, onNavigateToLink }: SavedMessagesDialogProps) {
  const [rows, setRows] = useState<SavedMessageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelado = false
    listarMensajesGuardados()
      .then((data) => !cancelado && setRows(data))
      .catch(() => !cancelado && setRows([]))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [open])

  async function handleQuitar(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    await quitarMensajeGuardado(id).catch(() => {})
  }

  function handleIr(row: SavedMessageRow) {
    const link = row.link ? parseZionLink(row.link) : null
    if (link) {
      onNavigateToLink(link)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="size-4" />
            Mensajes guardados
          </DialogTitle>
          <DialogDescription>Tu lista privada, guardada solo en este dispositivo.</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex max-h-96 flex-col gap-1 overflow-y-auto">
          {loading && (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">
              Todavía no guardaste ningún mensaje. Usá clic derecho → «Guardar mensaje».
            </p>
          )}
          {!loading &&
            rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-1 rounded-lg p-2 hover:bg-muted/50">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {row.authorName}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{origenDe(row)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{row.preview}</p>
                <div className="mt-1 flex items-center gap-3">
                  {row.link && (
                    <button
                      type="button"
                      onClick={() => handleIr(row)}
                      className="flex items-center gap-1 text-xs font-medium text-primary outline-none hover:underline"
                    >
                      <CornerUpRight className="size-3" />
                      Ir al mensaje
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleQuitar(row.id)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground outline-none hover:text-destructive hover:underline"
                  >
                    <BookmarkX className="size-3" />
                    Quitar
                  </button>
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
