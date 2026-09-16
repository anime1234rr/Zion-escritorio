import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

import {
  listarNotificaciones,
  marcarNotificacionLeida,
  suscribirseANotificaciones,
  type AppNotification,
} from '@/lib/notifications'
import { getNotificationSettings } from '@/hooks/use-notification-settings'
import {
  debeAlertarNotificacion,
  setChannelNotifLevel,
  useChannelNotifLevel,
  type ChannelAlertLevel,
} from '@/lib/server-notification-prefs'
import { playNotificationSound } from '@/lib/notification-sound'
import { cn, getErrorMessage } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NotificationDetailDialog } from '@/components/NotificationDetailDialog'
import { parseZionLink, type ZionLink } from '@/lib/deep-links'
import { relativeTime as formatRelativo } from '@/lib/internal/core-utils'

const CHANNEL_LEVEL_OPTIONS: { value: ChannelAlertLevel; label: string }[] = [
  { value: 'heredar', label: 'Servidor' },
  { value: 'todas', label: 'Todas' },
  { value: 'menciones', label: '@menciones' },
  { value: 'nada', label: 'Nada' },
]

interface NotificationsDropdownProps {
  userId: string
  channelId?: string
  onNavigateToServer?: (serverId: string) => void
  onNavigateToLink?: (link: ZionLink) => void
}

export function NotificationsDropdown({
  userId,
  channelId,
  onNavigateToServer,
  onNavigateToLink,
}: NotificationsDropdownProps) {
  const channelLevel = useChannelNotifLevel(channelId ?? '')
  const [notificaciones, setNotificaciones] = useState<AppNotification[]>([])
  const [filtro, setFiltro] = useState<'todas' | 'menciones'>('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null)
  const navigateRef = useRef({ onNavigateToServer, onNavigateToLink })
  useEffect(() => {
    navigateRef.current = { onNavigateToServer, onNavigateToLink }
  }, [onNavigateToServer, onNavigateToLink])

  useEffect(() => {
    let cancelado = false
    listarNotificaciones(userId)
      .then((data) => !cancelado && setNotificaciones(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))

    const unsubscribe = suscribirseANotificaciones(userId, (nueva) => {
      setNotificaciones((prev) =>
        prev.some((n) => n.id === nueva.id) ? prev : [nueva, ...prev]
      )

      const link = nueva.enlace ? parseZionLink(nueva.enlace) : null
      const canalId = link?.type === 'channel-message' ? link.channelId : null
      if (!debeAlertarNotificacion(nueva, canalId)) return

      const settings = getNotificationSettings()
      if (settings.soundOnNotification) playNotificationSound()
      if (settings.desktopNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const browserNotification = new Notification(nueva.titulo, { body: nueva.mensaje })
        browserNotification.onclick = () => {
          window.focus()
          if (link) navigateRef.current.onNavigateToLink?.(link)
          else if (nueva.servidorId) navigateRef.current.onNavigateToServer?.(nueva.servidorId)
        }
      }
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [userId])

  const noLeidas = notificaciones.filter((n) => !n.leida).length
  const mencionesNoLeidas = notificaciones.filter((n) => !n.leida && n.tipo === 'mencion').length
  const notificacionesVisibles =
    filtro === 'menciones' ? notificaciones.filter((n) => n.tipo === 'mencion') : notificaciones

  async function handleMarcarLeida(notificacionId: string) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === notificacionId ? { ...n, leida: true } : n))
    )
    try {
      await marcarNotificacionLeida(notificacionId)
    } catch (err) {
      console.error('No se pudo marcar la notificación como leída', err)
    }
  }

  async function handleMarcarTodasLeidas() {
    const previas = notificaciones
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    try {
      await marcarNotificacionLeida()
    } catch (err) {
      setNotificaciones(previas)
      console.error('No se pudieron marcar las notificaciones como leídas', err)
    }
  }

  function handleOpenNotification(n: AppNotification) {
    setDropdownOpen(false)
    setSelectedNotification(n)
    if (!n.leida) handleMarcarLeida(n.id)
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Bell className="size-4" />
              {mencionesNoLeidas > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
                  {mencionesNoLeidas > 99 ? '99+' : mencionesNoLeidas}
                </span>
              ) : noLeidas > 0 ? (
                <span className="absolute top-1 right-1 flex size-2 rounded-full bg-primary" />
              ) : null}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Notificaciones</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1">
            {(['todas', 'menciones'] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  filtro === valor
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {valor === 'todas' ? 'Todas' : 'Menciones'}
              </button>
            ))}
          </div>
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={handleMarcarTodasLeidas}
              className="text-xs text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Marcar leídas
            </button>
          )}
        </div>

        {channelId && (
          <div className="flex flex-col gap-1.5 border-b border-border px-3 py-2.5">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Avisos de este canal
            </span>
            <div className="grid grid-cols-4 gap-1">
              {CHANNEL_LEVEL_OPTIONS.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setChannelNotifLevel(channelId, opcion.value)}
                  className={cn(
                    'rounded-md border px-1.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    channelLevel === opcion.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          )}
          {error && (
            <p className="px-3 py-4 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && notificacionesVisibles.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {filtro === 'menciones' ? 'No tenés menciones.' : 'No tenés notificaciones.'}
            </p>
          )}
          {!loading &&
            !error &&
            notificacionesVisibles.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left outline-none last:border-b-0 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                  !n.leida && 'bg-primary/5'
                )}
              >
                <span className="flex items-center gap-1.5">
                  {!n.leida && (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="truncate text-sm font-medium text-foreground">
                    {n.titulo}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{n.mensaje}</span>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatRelativo(n.creadoAt)}
                </span>
              </button>
            ))}
        </div>
      </DropdownMenuContent>

      <NotificationDetailDialog
        notification={selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
        onNavigateToServer={onNavigateToServer}
        onNavigateToLink={onNavigateToLink}
      />
    </DropdownMenu>
  )
}
