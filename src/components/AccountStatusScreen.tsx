import { ShieldAlert } from 'lucide-react'

import type { Sancion } from '@/lib/moderation'

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface AccountStatusScreenProps {
  ban: Sancion
  onSignOut: () => void
}

export function AccountStatusScreen({ ban, onSignOut }: AccountStatusScreenProps) {
  const esPermanente = ban.tipo === 'ban_permanente'

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/15 blur-3xl" />

      <div className="relative flex w-full max-w-sm animate-in fade-in-0 zoom-in-95 flex-col items-center gap-4 rounded-2xl border border-border bg-card/90 p-8 text-center text-card-foreground shadow-2xl shadow-destructive/10 backdrop-blur-sm duration-300">
        <div className="relative flex size-16 items-center justify-center">
          <span className="relative flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <ShieldAlert className="size-7" />
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="mx-auto flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            <span className="size-1.5 rounded-full bg-destructive" />
            {esPermanente ? 'Suspensión permanente' : 'Suspensión temporal'}
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Tu cuenta está suspendida</h1>
          <p className="text-sm text-muted-foreground">{ban.motivo}</p>
          {!esPermanente && ban.expiraAt && (
            <p className="text-sm text-muted-foreground">
              Vuelve a estar activa el <strong className="text-foreground">{formatFecha(ban.expiraAt)}</strong>.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-1 flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/30 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
