import { Compass, Home, Plus, ShieldAlert, UserPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PerfProfiler } from '@/lib/internal/perf-metrics'
import type { ServerItem } from '@/lib/types'
import type { ServerSettingsSectionId } from '@/components/server-settings/ServerSettingsPanel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ContextMenuTrigger } from '@/components/ui/context-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ServerContextMenu } from '@/components/ServerContextMenu'

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

interface SidebarServidoresProps {
  servers: ServerItem[]
  activeServerId: string
  currentUserId?: string
  view?: 'server' | 'dm' | 'explore'
  onSelectServer: (serverId: string) => void
  onSelectHome?: () => void
  onOpenExplore?: () => void
  onCreateServer?: () => void
  onJoinServer?: () => void
  onOpenServerSettings?: (serverId: string, section?: ServerSettingsSectionId) => void
  onInviteToServer?: (serverId: string) => void
  onServerGone?: (serverId: string) => void
  showStaffPanel?: boolean
  onOpenStaffPanel?: () => void
}

export function SidebarServidores({
  servers,
  activeServerId,
  currentUserId,
  view = 'server',
  onSelectServer,
  onSelectHome,
  onOpenExplore,
  onCreateServer,
  onJoinServer,
  onOpenServerSettings,
  onInviteToServer,
  onServerGone,
  showStaffPanel,
  onOpenStaffPanel,
}: SidebarServidoresProps) {
  return (
    <nav
      aria-label="Servidores"
      className="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3"
    >
      <div className="group/item relative w-full shrink-0 px-2">
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all duration-200',
            view === 'dm' ? 'h-8' : 'h-2 scale-y-0 group-hover/item:scale-y-100'
          )}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSelectHome}
              aria-current={view === 'dm'}
              aria-label="Inicio / Mensajes directos"
              className={cn(
                'relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-all duration-200 outline-none select-none',
                'hover:rounded-xl hover:bg-primary hover:text-primary-foreground',
                'focus-visible:ring-3 focus-visible:ring-ring/50',
                view === 'dm' && 'rounded-xl bg-primary text-primary-foreground'
              )}
            >
              <Home className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Inicio</TooltipContent>
        </Tooltip>
      </div>

      <Separator className="w-8" />

      <PerfProfiler id="ServerSidebar">
      <ScrollArea className="w-full flex-1">
        <ul className="flex flex-col items-center gap-2 px-2">
          {servers.map((server) => {
            const active = view === 'server' && server.id === activeServerId
            return (
              <li key={server.id} className="group/item relative w-full">
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all duration-200',
                    active
                      ? 'h-8'
                      : 'h-2 scale-y-0 group-hover/item:scale-y-100'
                  )}
                />
                <ServerContextMenu
                  server={server}
                  currentUserId={currentUserId}
                  onOpenSettings={(id, section) => onOpenServerSettings?.(id, section)}
                  onInvite={(id) => onInviteToServer?.(id)}
                  onLeft={(id) => onServerGone?.(id)}
                  onDeleted={(id) => onServerGone?.(id)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onSelectServer(server.id)}
                          aria-current={active}
                          aria-label={server.name}
                          className={cn(
                            'relative mx-auto flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground transition-all duration-200 outline-none select-none',
                            'hover:rounded-xl hover:bg-primary hover:text-primary-foreground',
                            'focus-visible:ring-3 focus-visible:ring-ring/50',
                            active && 'rounded-xl bg-primary text-primary-foreground'
                          )}
                        >
                          {server.iconUrl ? (
                            <img
                              src={server.iconUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            getInitials(server.name)
                          )}
                          {server.mentionCount ? (
                            <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white ring-2 ring-sidebar">
                              {server.mentionCount}
                            </span>
                          ) : server.unread ? (
                            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-foreground ring-2 ring-sidebar" />
                          ) : null}
                        </button>
                      </ContextMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">{server.name}</TooltipContent>
                  </Tooltip>
                </ServerContextMenu>
              </li>
            )
          })}
        </ul>
      </ScrollArea>
      </PerfProfiler>

      <Separator className="w-8" />

      <div className="group/item relative w-full shrink-0 px-2">
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all duration-200',
            view === 'explore' ? 'h-8' : 'h-2 scale-y-0 group-hover/item:scale-y-100'
          )}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenExplore}
              aria-current={view === 'explore'}
              aria-label="Explorar comunidades"
              className={cn(
                'relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-all duration-200 outline-none select-none',
                'hover:rounded-xl hover:bg-primary hover:text-primary-foreground',
                'focus-visible:ring-3 focus-visible:ring-ring/50',
                view === 'explore' && 'rounded-xl bg-primary text-primary-foreground'
              )}
            >
              <Compass className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Explorar</TooltipContent>
        </Tooltip>
      </div>

      {showStaffPanel && (
        <div className="w-full shrink-0 px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenStaffPanel}
                aria-label="Panel de staff"
                className="relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-all duration-200 outline-none select-none hover:rounded-xl hover:bg-destructive hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ShieldAlert className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Panel de staff</TooltipContent>
          </Tooltip>
        </div>
      )}

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Añadir servidor"
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground transition-all duration-200 outline-none hover:rounded-xl hover:border-solid hover:border-transparent hover:bg-online hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Plus className="size-5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Añadir servidor</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="start"
          side="right"
          className="w-56"
          collisionPadding={{ bottom: 20 }}
        >
          <DropdownMenuItem onSelect={onCreateServer}>
            <Plus className="size-4" />
            Crear servidor
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onJoinServer}>
            <UserPlus className="size-4" />
            Unirme a un servidor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
