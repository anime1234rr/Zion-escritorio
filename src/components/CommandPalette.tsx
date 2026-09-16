import { useEffect, useMemo, useState } from 'react'
import { Compass, Hash, Home, Megaphone, MessagesSquare, Mic, Search, Server, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { listarAmistades } from '@/lib/friends'
import type { ChannelItem, ChannelType, ServerItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { debounce } from '@/lib/internal/core-utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const channelIcon: Record<ChannelType, LucideIcon> = {
  text: Hash,
  voice: Mic,
  code: Hash,
  announcement: Megaphone,
  forum: MessagesSquare,
}

interface Entry {
  id: string
  grupo: string
  label: string
  sublabel?: string
  icon: LucideIcon
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servers: ServerItem[]
  channels: ChannelItem[]
  activeServerName?: string
  currentUserId: string
  onSelectServer: (id: string) => void
  onSelectChannel: (id: string) => void
  onOpenHome: () => void
  onOpenExplore: () => void
  onMessageUser: (userId: string) => void
}

export function CommandPalette({ open, onOpenChange, ...rest }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Buscar en Zion</DialogTitle>
        <PaletteInner onOpenChange={onOpenChange} {...rest} />
      </DialogContent>
    </Dialog>
  )
}

type PaletteInnerProps = Omit<CommandPaletteProps, 'open'>

function PaletteInner({
  onOpenChange,
  servers,
  channels,
  activeServerName,
  currentUserId,
  onSelectServer,
  onSelectChannel,
  onOpenHome,
  onOpenExplore,
  onMessageUser,
}: PaletteInnerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [amigos, setAmigos] = useState<{ id: string; name: string }[]>([])
  const [activo, setActivo] = useState(0)

  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 150), [])
  useEffect(() => debouncedSetQuery.cancel, [debouncedSetQuery])

  useEffect(() => {
    let cancelado = false
    listarAmistades(currentUserId)
      .then((lista) => {
        if (cancelado) return
        setAmigos(
          lista
            .filter((f) => f.status === 'aceptada')
            .map((f) => ({ id: f.user.id, name: f.user.name }))
        )
      })
      .catch(() => {
        if (!cancelado) setAmigos([])
      })
    return () => {
      cancelado = true
    }
  }, [currentUserId])

  const entradas = useMemo<Entry[]>(() => {
    const cerrarY = (fn: () => void) => () => {
      onOpenChange(false)
      fn()
    }
    const lista: Entry[] = [
      { id: 'accion-inicio', grupo: 'Ir a', label: 'Inicio y mensajes directos', icon: Home, run: cerrarY(onOpenHome) },
      { id: 'accion-explorar', grupo: 'Ir a', label: 'Explorar comunidades', icon: Compass, run: cerrarY(onOpenExplore) },
    ]
    for (const server of servers) {
      lista.push({
        id: `servidor-${server.id}`,
        grupo: 'Servidores',
        label: server.name,
        icon: Server,
        run: cerrarY(() => onSelectServer(server.id)),
      })
    }
    for (const canal of channels) {
      lista.push({
        id: `canal-${canal.id}`,
        grupo: activeServerName ? `Canales · ${activeServerName}` : 'Canales',
        label: canal.name,
        sublabel: canal.topic,
        icon: channelIcon[canal.type] ?? Hash,
        run: cerrarY(() => onSelectChannel(canal.id)),
      })
    }
    for (const amigo of amigos) {
      lista.push({
        id: `persona-${amigo.id}`,
        grupo: 'Personas',
        label: amigo.name,
        icon: User,
        run: cerrarY(() => onMessageUser(amigo.id)),
      })
    }
    return lista
  }, [
    servers,
    channels,
    amigos,
    activeServerName,
    onOpenChange,
    onOpenHome,
    onOpenExplore,
    onSelectServer,
    onSelectChannel,
    onMessageUser,
  ])

  const filtradas = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return entradas.slice(0, 50)
    const conRango = entradas
      .map((entry) => {
        const label = entry.label.toLowerCase()
        if (label.startsWith(q)) return { entry, rango: 0 }
        if (label.includes(q)) return { entry, rango: 1 }
        if (entry.sublabel?.toLowerCase().includes(q)) return { entry, rango: 2 }
        return null
      })
      .filter((x): x is { entry: Entry; rango: number } => x !== null)
    conRango.sort((a, b) => a.rango - b.rango)
    return conRango.slice(0, 50).map((x) => x.entry)
  }, [entradas, debouncedQuery])

  const indiceActivo = Math.min(activo, Math.max(filtradas.length - 1, 0))

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      filtradas[indiceActivo]?.run()
    }
  }

  let grupoActual = ''

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            debouncedSetQuery(event.target.value)
            setActivo(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar servidores, canales, personas…"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="max-h-80 overflow-y-auto py-1">
        {filtradas.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          filtradas.map((entry, index) => {
            const nuevoGrupo = entry.grupo !== grupoActual
            grupoActual = entry.grupo
            return (
              <div key={entry.id}>
                {nuevoGrupo && (
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {entry.grupo}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => entry.run()}
                  onMouseMove={() => setActivo(index)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm outline-none',
                    index === indiceActivo ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <entry.icon className="size-4 shrink-0" />
                  <span className="truncate text-foreground">{entry.label}</span>
                  {entry.sublabel && (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {entry.sublabel}
                    </span>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
