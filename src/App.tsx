import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useAuthDeepLinks } from '@/lib/auth-deep-links'
import { useSystemStatus } from '@/hooks/use-system-status'
import { useAccountStatus } from '@/hooks/use-account-status'
import { useStaffCaps } from '@/hooks/use-staff-caps'
import { useInspectUnlock } from '@/hooks/use-inspect-unlock'
import { useChannelAccess } from '@/hooks/use-channel-access'
import { useRolePreview } from '@/hooks/use-role-preview'
import { cn } from '@/lib/utils'
import { actualizarPerfil, obtenerPerfil } from '@/lib/profiles'
import { aplicarFondoLocalSiCorresponde } from '@/lib/local-background'
import {
  iniciarHeartbeat,
  marcarConectado,
  marcarDesconectadoPorCierre,
  marcarDesconectadoPorCierreAwait,
} from '@/lib/presence'
import {
  listarServidores,
  suscribirseAServidores,
} from '@/lib/servers'
import { listarCanales, suscribirseACanalesDeServidor } from '@/lib/channels'
import {
  contarMencionesNoLeidas,
  marcarMencionesCanalLeidas,
  suscribirseANotificaciones,
} from '@/lib/notifications'
import {
  listarCanalesNoLeidos,
  listarServidoresNoLeidos,
  marcarCanalLeido,
} from '@/lib/read-state'
import { mensajeErrorAutomod } from '@/lib/automod'
import { mensajeErrorSancion } from '@/lib/moderation'
import { debeAlertarNotificacion } from '@/lib/server-notification-prefs'
import { pushToast } from '@/hooks/use-toasts'
import { updateAppBadge } from '@/lib/badge'
import { leaveVoiceChannel, toggleDeafen, toggleMute, useVoiceConnection } from '@/hooks/use-voice-connection'
import {
  editarMensaje,
  eliminarMensaje,
  enviarMensaje,
  listarMensajes,
  suscribirseACanal,
} from '@/lib/messages'
import { claveCanal, guardarMensajesEnCache, leerMensajesDeCache } from '@/lib/message-cache'
import { parseZionLink, type ZionLink } from '@/lib/deep-links'
import {
  getInitialDeepLink,
  isWindowFocused,
  onBeforeQuit,
  onActive,
  onDeepLink,
  onIdle,
  onNotificationClicked,
  onToggleDeafenShortcut,
  onToggleMuteShortcut,
  readyToQuit,
  showNativeNotification,
} from '@/lib/electron-bridge'
import type {
  ChannelCategory,
  ChatAttachment,
  ChatMessage,
  ChatUser,
  CodeBlock,
  ReplyPreview,
  ServerItem,
  UserStatus,
} from '@/lib/types'
import type { ServerRole } from '@/lib/members'

import { AuthScreen } from '@/components/AuthScreen'
import { MaintenanceScreen } from '@/components/MaintenanceScreen'
import { AccountStatusScreen } from '@/components/AccountStatusScreen'
import { SancionNoticeDialog } from '@/components/SancionNoticeDialog'
import { StaffPanelDialog } from '@/components/staff/StaffPanelDialog'
import { UpdateBadge } from '@/components/UpdateBadge'
import { SidebarServidores } from '@/components/SidebarServidores'
import { PanelCanales } from '@/components/PanelCanales'
import type { ServerSettingsSectionId } from '@/components/server-settings/ServerSettingsPanel'
import { ChatPrincipal } from '@/components/ChatPrincipal'
import { VoiceFloatingPanel } from '@/components/VoiceFloatingPanel'
import { WelcomeDashboard } from '@/components/WelcomeDashboard'
import { PanelMiembros } from '@/components/PanelMiembros'
import { CrearServidorDialog } from '@/components/CrearServidorDialog'
import { UnirseServidorDialog } from '@/components/UnirseServidorDialog'
import { InvitePreviewDialog } from '@/components/InvitePreviewDialog'
import { VistaInicio } from '@/components/inicio/VistaInicio'
import { VistaExplorar } from '@/components/explorar/VistaExplorar'
import { CommandPalette } from '@/components/CommandPalette'
import { ForwardMessageDialog } from '@/components/ForwardMessageDialog'
import { ToastViewport } from '@/components/ToastViewport'
import { ReauthenticateDialog } from '@/components/auth/ReauthenticateDialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppBackgroundLayer } from '@/components/AppBackgroundLayer'

const VoiceChannelView = lazy(() =>
  import('@/components/VoiceChannelView').then((m) => ({ default: m.VoiceChannelView }))
)
const ForumChannelView = lazy(() =>
  import('@/components/forum/ForumChannelView').then((m) => ({ default: m.ForumChannelView }))
)

function ViewLoadingFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  )
}

type ViewMode = 'server' | 'dm' | 'explore'

interface PendingServerAction {
  serverId: string
  kind: 'settings' | 'invite'
  section?: ServerSettingsSectionId
}

function upsertServer(list: ServerItem[], server: ServerItem): ServerItem[] {
  const index = list.findIndex((item) => item.id === server.id)
  if (index === -1) return [...list, server]
  const next = [...list]
  next[index] = server
  return next
}

function AppShell({ userId }: { userId: string }) {
  const { signOut, session } = useAuth()
  const staffCaps = useStaffCaps(userId)
  const [staffPanelOpen, setStaffPanelOpen] = useState(false)

  const [view, setView] = useState<ViewMode>('server')
  const [profile, setProfile] = useState<ChatUser | null>(null)

  function handleProfileUpdated(updated: ChatUser) {
    setProfile((prev) => (prev ? { ...prev, ...updated } : updated))
  }

  const latestStatusRef = useRef<UserStatus | null>(null)
  const autoIdleRef = useRef(false)

  useEffect(() => {
    latestStatusRef.current = profile?.status ?? null
  }, [profile?.status])

  useEffect(() => {
    const unsubIdle = onIdle(() => {
      if (latestStatusRef.current !== 'online') return
      autoIdleRef.current = true
      setProfile((prev) => (prev ? { ...prev, status: 'idle' } : prev))
      actualizarPerfil(userId, { status: 'idle' }).catch((err) =>
        console.error('No se pudo actualizar el estado a ausente', err)
      )
    })
    const unsubActive = onActive(() => {
      if (!autoIdleRef.current) return
      autoIdleRef.current = false
      setProfile((prev) => (prev ? { ...prev, status: 'online' } : prev))
      actualizarPerfil(userId, { status: 'online' }).catch((err) =>
        console.error('No se pudo restaurar el estado', err)
      )
    })
    return () => {
      unsubIdle()
      unsubActive()
    }
  }, [userId])

  const [servers, setServers] = useState<ServerItem[]>([])
  const [activeServerId, setActiveServerId] = useState<string | null>(null)
  const [categories, setCategories] = useState<ChannelCategory[]>([])
  const [categoriesServerId, setCategoriesServerId] = useState<string | null>(null)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  if (categoriesServerId !== activeServerId) {
    setCategoriesServerId(activeServerId)
    setCategories([])
  }
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [unreadChannels, setUnreadChannels] = useState<Map<string, string | null>>(new Map())
  const [unreadServerIds, setUnreadServerIds] = useState<Set<string>>(new Set())
  const [mentionsPorServidor, setMentionsPorServidor] = useState<Map<string, number>>(new Map())
  const [mentionsPorCanal, setMentionsPorCanal] = useState<Map<string, number>>(new Map())
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null)
  const [membersOpen, setMembersOpen] = useState(true)
  const [pendingDmUserId, setPendingDmUserId] = useState<string | null>(null)
  const [pendingConversation, setPendingConversation] = useState<{
    conversationId: string
    messageId?: string
  } | null>(null)
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null)
  const [forwardMessage, setForwardMessage] = useState<{
    message: ChatMessage
    sourceLabel: string
  } | null>(null)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const [previewRole, setPreviewRole] = useState<ServerRole | null>(null)
  const [pendingServerAction, setPendingServerAction] =
    useState<PendingServerAction | null>(null)
  const { connectedChannelId } = useVoiceConnection()
  const notificationClickHandlers = useRef(new Map<number, () => void>())

  function handleSelectServer(serverId: string) {
    setView('server')
    setActiveServerId(serverId)
    setPreviewRole(null)
  }

  function handleServerGone(serverId: string) {
    setServers((prev) => prev.filter((s) => s.id !== serverId))
    setActiveServerId((prev) => (prev === serverId ? null : prev))
    setPendingServerAction((prev) => (prev?.serverId === serverId ? null : prev))
  }

  function requestServerSettings(serverId: string, section?: ServerSettingsSectionId) {
    handleSelectServer(serverId)
    setPendingServerAction({ serverId, kind: 'settings', section })
  }

  function requestServerInvite(serverId: string) {
    handleSelectServer(serverId)
    setPendingServerAction({ serverId, kind: 'invite' })
  }

  function handleReturnToVoiceChannel(serverId: string, channelId: string) {
    setView('server')
    setActiveServerId(serverId)
    setActiveChannelId(channelId)
  }

  function handleMessageUser(targetUserId: string) {
    setView('dm')
    setPendingDmUserId(targetUserId)
  }

  function navigateToZionLink(link: ZionLink) {
    if (link.type === 'channel-message') {
      setView('server')
      setActiveServerId(link.serverId)
      setActiveChannelId(link.channelId)
      setHighlightMessageId(link.messageId)
    } else if (link.type === 'dm-message') {
      setView('dm')
      setPendingConversation({ conversationId: link.conversationId, messageId: link.messageId })
    } else {
      setPendingInviteCode(link.code)
    }
  }

  useEffect(() => {
    return onNotificationClicked((id) => {
      notificationClickHandlers.current.get(id)?.()
      notificationClickHandlers.current.delete(id)
    })
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const unsubMute = onToggleMuteShortcut(() => toggleMute())
    const unsubDeafen = onToggleDeafenShortcut(() => toggleDeafen())
    return () => {
      unsubMute()
      unsubDeafen()
    }
  }, [])

  useEffect(() => {
    return suscribirseANotificaciones(userId, (notificacion) => {
      const link = notificacion.enlace ? parseZionLink(notificacion.enlace) : null
      const canalId = link?.type === 'channel-message' ? link.channelId : null
      if (!debeAlertarNotificacion(notificacion, canalId)) return

      const onClick = link
        ? () => navigateToZionLink(link)
        : notificacion.servidorId
          ? () => handleSelectServer(notificacion.servidorId as string)
          : notificacion.tipo === 'mensaje_privado' || notificacion.tipo === 'solicitud_amistad'
            ? () => setView('dm')
            : undefined

      pushToast({
        title: notificacion.titulo,
        description: notificacion.mensaje,
        icon: notificacion.tipo,
        onClick,
      })

      if (notificacion.tipo === 'mencion') {
        contarMencionesNoLeidas(userId)
          .then((r) => {
            setMentionsPorServidor(r.porServidor)
            setMentionsPorCanal(r.porCanal)
          })
          .catch(() => {})
      }

      isWindowFocused().then((focused) => {
        if (focused) return
        showNativeNotification({ title: notificacion.titulo, body: notificacion.mensaje }).then(
          (id) => {
            if (id != null && onClick) notificationClickHandlers.current.set(id, onClick)
          }
        )
      })
    })
  }, [userId])

  useEffect(() => {
    let cancelado = false
    function refrescar() {
      contarMencionesNoLeidas(userId)
        .then((r) => {
          if (cancelado) return
          setMentionsPorServidor(r.porServidor)
          setMentionsPorCanal(r.porCanal)
        })
        .catch(() => {})
    }
    refrescar()
    const t = setInterval(refrescar, 40_000)
    return () => {
      cancelado = true
      clearInterval(t)
    }
  }, [userId])

  useEffect(() => {
    let cancelado = false
    marcarConectado()
      .catch((err) => console.error('No se pudo marcar como conectado', err))
      .finally(() => {
        if (cancelado) return
        obtenerPerfil(userId)
          .then((data) => !cancelado && setProfile(aplicarFondoLocalSiCorresponde(data)))
          .catch((err) => console.error('No se pudo cargar el perfil', err))
      })

    const detenerHeartbeat = iniciarHeartbeat()

    return () => {
      cancelado = true
      detenerHeartbeat()
    }
  }, [userId])

  useEffect(() => {
    function handleBeforeUnload() {
      if (session?.access_token) {
        marcarDesconectadoPorCierre(session.access_token)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [session])

  useEffect(() => {
    return onBeforeQuit(() => {
      Promise.allSettled([marcarDesconectadoPorCierreAwait(), leaveVoiceChannel()])
        .then(([estadoResult]) => {
          if (estadoResult.status === 'rejected') {
            console.error('No se pudo marcar como desconectado', estadoResult.reason)
          }
        })
        .finally(() => readyToQuit())
    })
  }, [])

  useEffect(() => {
    function handleDeepLink(url: string) {
      const link = parseZionLink(url)
      if (!link) return
      navigateToZionLink(link)
    }

    getInitialDeepLink().then((url) => {
      if (url) handleDeepLink(url)
    })

    return onDeepLink(handleDeepLink)
  }, [])

  useEffect(() => {
    if (!highlightMessageId) return
    const timeout = setTimeout(() => setHighlightMessageId(null), 2500)
    return () => clearTimeout(timeout)
  }, [highlightMessageId])

  useEffect(() => {
    let cancelado = false

    listarServidores()
      .then((data) => {
        if (cancelado) return
        setServers(data)
        setActiveServerId((prev) => prev ?? data[0]?.id ?? null)
      })
      .catch((err) => console.error('No se pudieron cargar los servidores', err))

    const unsubscribe = suscribirseAServidores(userId, {
      onServidorNuevoOActualizado: (servidor) => {
        setServers((prev) => upsertServer(prev, servidor))
        setActiveServerId((prev) => prev ?? servidor.id)
      },
      onServidorRemovido: (servidorId) => {
        setServers((prev) => prev.filter((s) => s.id !== servidorId))
        setActiveServerId((prev) => (prev === servidorId ? null : prev))
      },
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [userId])

  useEffect(() => {
    if (!activeServerId) return

    let cancelado = false

    async function cargarCanales() {
      try {
        const data = await listarCanales(activeServerId as string)
        if (cancelado) return
        setCategories(data)
        setActiveChannelId((prev) => {
          const disponibles = data.flatMap((c) => c.channels)
          if (prev && disponibles.some((ch) => ch.id === prev)) return prev
          const primerNoVoz = disponibles.find((ch) => ch.type !== 'voice')
          return primerNoVoz?.id ?? disponibles[0]?.id ?? null
        })
      } catch (err) {
        console.error('No se pudieron cargar los canales', err)
      }
    }

    cargarCanales()
    const unsubscribe = suscribirseACanalesDeServidor(activeServerId, cargarCanales)

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [activeServerId])

  useEffect(() => {
    const totalMentions = servers.reduce((sum, server) => sum + (server.mentionCount ?? 0), 0)
    updateAppBadge(totalMentions)
  }, [servers])

  const activeServer = servers.find((s) => s.id === activeServerId)

  const hiddenChannelIds = useChannelAccess(activeServer ?? null, categories, userId)

  const visibleCategories = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        channels: category.channels
          .filter((channel) => !hiddenChannelIds.has(channel.id))
          .map((channel) => ({
            ...channel,
            unread: unreadChannels.has(channel.id),
            mentionCount: mentionsPorCanal.get(channel.id) ?? 0,
          })),
      })),
    [categories, hiddenChannelIds, unreadChannels, mentionsPorCanal]
  )

  const visibleChannels = useMemo(
    () => visibleCategories.flatMap((category) => category.channels),
    [visibleCategories]
  )

  const serversConUnread = useMemo(
    () =>
      servers.map((s) => ({
        ...s,
        unread: unreadServerIds.has(s.id),
        mentionCount: mentionsPorServidor.get(s.id) ?? 0,
      })),
    [servers, unreadServerIds, mentionsPorServidor]
  )

  const effectiveChannelId =
    activeChannelId && visibleChannels.some((channel) => channel.id === activeChannelId)
      ? activeChannelId
      : (visibleChannels.find((channel) => channel.type !== 'voice')?.id ??
        visibleChannels[0]?.id ??
        null)

  const rolePreview = useRolePreview(activeServer?.id ?? '', previewRole)
  const activePreviewPermissions = effectiveChannelId
    ? rolePreview.permissionsByChannel[effectiveChannelId]
    : undefined

  useEffect(() => {
    if (!effectiveChannelId) return

    let cancelado = false
    const cacheKey = claveCanal(effectiveChannelId)

    leerMensajesDeCache(cacheKey).then((cached) => {
      if (!cancelado && cached.length) {
        setMessages((prev) => (prev.length === 0 ? cached : prev))
      }
    })

    listarMensajes(effectiveChannelId)
      .then((data) => {
        if (cancelado) return
        setMessages(data)
        void guardarMensajesEnCache(cacheKey, data)
      })
      .catch((err) => console.error('No se pudieron cargar los mensajes', err))

    const unsubscribe = suscribirseACanal(effectiveChannelId, {
      onNuevoMensaje: (mensaje) => {
        setMessages((prev) =>
          prev.some((m) => m.id === mensaje.id) ? prev : [...prev, mensaje]
        )
      },
      onMensajeEditado: (mensaje) => {
        setMessages((prev) => prev.map((m) => (m.id === mensaje.id ? mensaje : m)))
      },
      onMensajeEliminado: (mensajeId) => {
        setMessages((prev) => prev.filter((m) => m.id !== mensajeId))
      },
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [effectiveChannelId])

  useEffect(() => {
    if (!effectiveChannelId || messages.length === 0) return
    const t = setTimeout(() => {
      void guardarMensajesEnCache(claveCanal(effectiveChannelId), messages)
    }, 500)
    return () => clearTimeout(t)
  }, [effectiveChannelId, messages])

  useEffect(() => {
    let cancelado = false
    function refrescar() {
      listarServidoresNoLeidos()
        .then((ids) => !cancelado && setUnreadServerIds(ids))
        .catch(() => {})
    }
    refrescar()
    const t = setInterval(refrescar, 45_000)
    return () => {
      cancelado = true
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!activeServerId) return
    const servidorId = activeServerId
    let cancelado = false
    function refrescar() {
      listarCanalesNoLeidos(servidorId)
        .then((mapa) => !cancelado && setUnreadChannels(mapa))
        .catch(() => {})
    }
    refrescar()
    const t = setInterval(refrescar, 30_000)
    return () => {
      cancelado = true
      clearInterval(t)
    }
  }, [activeServerId])

  useEffect(() => {
    if (!effectiveChannelId) return
    const canalId = effectiveChannelId
    const t = setTimeout(() => {
      marcarCanalLeido(canalId)
        .then(() => {
          setUnreadChannels((prev) => {
            if (!prev.has(canalId)) return prev
            const next = new Map(prev)
            next.delete(canalId)
            return next
          })
          listarServidoresNoLeidos()
            .then(setUnreadServerIds)
            .catch(() => {})
        })
        .catch(() => {})

      marcarMencionesCanalLeidas(canalId)
        .then(() => contarMencionesNoLeidas(userId))
        .then((r) => {
          setMentionsPorServidor(r.porServidor)
          setMentionsPorCanal(r.porCanal)
        })
        .catch(() => {})
    }, 1200)
    return () => clearTimeout(t)
  }, [effectiveChannelId, userId])

  async function handleChannelCreated() {
    if (!activeServerId) return
    try {
      setCategories(await listarCanales(activeServerId))
    } catch (err) {
      console.error('No se pudieron recargar los canales', err)
    }
  }

  async function handleChannelUpdated() {
    if (!activeServerId) return
    try {
      setCategories(await listarCanales(activeServerId))
    } catch (err) {
      console.error('No se pudieron recargar los canales', err)
    }
  }

  async function handleChannelDeleted(channelId: string) {
    if (!activeServerId) return
    try {
      const data = await listarCanales(activeServerId)
      setCategories(data)
      setActiveChannelId((prev) => {
        if (prev !== channelId) return prev
        const disponibles = data.flatMap((c) => c.channels)
        const primerNoVoz = disponibles.find((ch) => ch.type !== 'voice')
        return primerNoVoz?.id ?? disponibles[0]?.id ?? null
      })
    } catch (err) {
      console.error('No se pudieron recargar los canales', err)
    }
  }

  const activeChannel = visibleChannels.find((channel) => channel.id === effectiveChannelId)

  const handleSendMessage = useCallback(
    async (message: {
      content?: string
      code?: CodeBlock
      attachment?: ChatAttachment
      respuestaAId?: string
    }) => {
      if (!effectiveChannelId) return
      try {
        const nuevo = await enviarMensaje(effectiveChannelId, userId, message)
        setMessages((prev) =>
          prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]
        )
        setReplyingTo(null)
        return nuevo
      } catch (err) {
        console.error('No se pudo enviar el mensaje', err)
        const aviso = mensajeErrorAutomod(err) ?? mensajeErrorSancion(err)
        if (aviso) pushToast({ title: aviso, icon: 'sistema' })
      }
    },
    [effectiveChannelId, userId]
  )

  const handleEditMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const editado = await editarMensaje(messageId, content)
      setMessages((prev) => prev.map((m) => (m.id === editado.id ? editado : m)))
    } catch (err) {
      console.error('No se pudo editar el mensaje', err)
    }
  }, [])

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await eliminarMensaje(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      console.error('No se pudo borrar el mensaje', err)
    }
  }, [])

  const handleReplyMessage = useCallback((message: ChatMessage) => {
    setReplyingTo({
      id: message.id,
      authorName: message.author.name,
      preview: message.content ?? (message.code ? 'Código' : 'Adjunto'),
    })
  }, [])

  const forwardSourceLabel =
    activeChannel && activeServer ? `#${activeChannel.name} en ${activeServer.name}` : ''
  const handleForwardMessage = useCallback(
    (message: ChatMessage) => {
      if (!forwardSourceLabel) return
      setForwardMessage({ message, sourceLabel: forwardSourceLabel })
    },
    [forwardSourceLabel]
  )

  return (
    <div
      className={cn(
        'relative isolate flex h-screen w-screen overflow-hidden bg-background text-foreground',
        profile?.backgroundUrl && 'has-app-background'
      )}
    >
      <AppBackgroundLayer url={profile?.backgroundUrl} type={profile?.backgroundType} />

      <SidebarServidores
        servers={serversConUnread}
        activeServerId={activeServerId ?? ''}
        currentUserId={userId}
        view={view}
        onSelectServer={handleSelectServer}
        onSelectHome={() => setView('dm')}
        onOpenExplore={() => setView('explore')}
        onCreateServer={() => setCreateDialogOpen(true)}
        onJoinServer={() => setJoinDialogOpen(true)}
        onOpenServerSettings={requestServerSettings}
        onInviteToServer={requestServerInvite}
        onServerGone={handleServerGone}
        showStaffPanel={staffCaps.canGestionarSanciones}
        onOpenStaffPanel={() => setStaffPanelOpen(true)}
      />

      <StaffPanelDialog open={staffPanelOpen} onOpenChange={setStaffPanelOpen} esAdmin={staffCaps.esAdmin} />

      {view === 'dm' ? (
        <VistaInicio
          currentUserId={userId}
          profile={profile}
          onSignOut={signOut}
          onProfileUpdated={handleProfileUpdated}
          pendingUserId={pendingDmUserId}
          onPendingUserHandled={() => setPendingDmUserId(null)}
          pendingConversation={pendingConversation}
          onPendingConversationHandled={() => setPendingConversation(null)}
        />
      ) : view === 'explore' ? (
        <VistaExplorar
          onJoined={(servidor) => {
            setServers((prev) => upsertServer(prev, servidor))
            handleSelectServer(servidor.id)
          }}
          onOpenServer={handleSelectServer}
        />
      ) : (
        <>
          {activeServer && profile ? (
            <PanelCanales
              server={activeServer}
              categories={visibleCategories}
              activeChannelId={effectiveChannelId ?? ''}
              onSelectChannel={setActiveChannelId}
              currentUser={profile}
              onSignOut={signOut}
              onProfileUpdated={handleProfileUpdated}
              onServerUpdated={(servidor) =>
                setServers((prev) => upsertServer(prev, servidor))
              }
              onServerDeleted={handleServerGone}
              pendingAction={
                pendingServerAction?.serverId === activeServer.id
                  ? pendingServerAction
                  : null
              }
              onChannelCreated={handleChannelCreated}
              onChannelUpdated={handleChannelUpdated}
              onChannelDeleted={handleChannelDeleted}
              previewRole={previewRole}
              rolePreview={rolePreview}
              onPreviewAsRole={setPreviewRole}
              onExitPreview={() => setPreviewRole(null)}
            />
          ) : null}

          {activeChannel && activeServer && activeChannel.type === 'voice' ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <VoiceChannelView
                channel={activeChannel}
                server={activeServer}
                currentUserId={userId}
                previewRole={previewRole}
                previewPermissions={activePreviewPermissions}
                previewLoading={rolePreview.loading}
              />
            </Suspense>
          ) : activeChannel && activeServer && activeChannel.type === 'forum' ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <ForumChannelView
                key={activeChannel.id}
                channel={activeChannel}
                server={activeServer}
                currentUserId={userId}
              />
            </Suspense>
          ) : activeChannel && activeServer ? (
            <ChatPrincipal
              channel={activeChannel}
              messages={messages}
              lastReadAt={
                unreadChannels.has(activeChannel.id)
                  ? (unreadChannels.get(activeChannel.id) ?? null)
                  : undefined
              }
              onSendMessage={handleSendMessage}
              server={activeServer}
              currentUserId={userId}
              membersOpen={membersOpen}
              onToggleMembers={() => setMembersOpen((prev) => !prev)}
              onMessageUser={handleMessageUser}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onReplyMessage={handleReplyMessage}
              onForwardMessage={handleForwardMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              highlightMessageId={highlightMessageId}
              onNavigateToServer={handleSelectServer}
              onNavigateToLink={navigateToZionLink}
              onJumpToChannelMessage={(channelId, messageId) => {
                setActiveChannelId(channelId)
                setHighlightMessageId(messageId)
              }}
              previewRole={previewRole}
              previewPermissions={activePreviewPermissions}
              previewLoading={rolePreview.loading}
            />
          ) : servers.length === 0 ? (
            <WelcomeDashboard
              onCreateServer={() => setCreateDialogOpen(true)}
              onJoinServer={() => setJoinDialogOpen(true)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Elegí un canal para empezar a chatear.
              </p>
            </div>
          )}

          {activeServer && membersOpen && (
            <PanelMiembros
              server={activeServer}
              currentUserId={userId}
              onMessageUser={handleMessageUser}
            />
          )}
        </>
      )}

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        servers={servers}
        channels={visibleChannels}
        activeServerName={activeServer?.name}
        currentUserId={userId}
        onSelectServer={handleSelectServer}
        onSelectChannel={setActiveChannelId}
        onOpenHome={() => setView('dm')}
        onOpenExplore={() => setView('explore')}
        onMessageUser={handleMessageUser}
      />

      <CrearServidorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(servidor) => {
          setServers((prev) => upsertServer(prev, servidor))
          setActiveServerId(servidor.id)
        }}
      />

      <UnirseServidorDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onJoined={(servidor) => {
          setServers((prev) => upsertServer(prev, servidor))
          setActiveServerId(servidor.id)
        }}
      />

      <InvitePreviewDialog
        open={pendingInviteCode !== null}
        code={pendingInviteCode}
        onOpenChange={(open) => {
          if (!open) setPendingInviteCode(null)
        }}
        onJoined={(servidor) => {
          setServers((prev) => upsertServer(prev, servidor))
          setActiveServerId(servidor.id)
          setView('server')
          setPendingInviteCode(null)
        }}
      />

      {forwardMessage && (
        <ForwardMessageDialog
          open={Boolean(forwardMessage)}
          onOpenChange={(open) => !open && setForwardMessage(null)}
          message={forwardMessage.message}
          sourceLabel={forwardMessage.sourceLabel}
          currentUserId={userId}
        />
      )}

      <VoiceFloatingPanel
        currentUserId={userId}
        hidden={view === 'server' && activeChannel?.id === connectedChannelId}
        onReturnToChannel={handleReturnToVoiceChannel}
      />
    </div>
  )
}

function App() {
  const { user, loading, pendingAuthAction, signOut } = useAuth()
  const { isMaintenance, bypass } = useSystemStatus(user?.id)
  const {
    activeBan,
    sanciones,
    loading: statusLoading,
    marcarReconocida,
  } = useAccountStatus(user?.id ?? null)
  const advertenciaPendiente =
    sanciones.find((s) => s.tipo === 'advertencia' && s.activa && !s.reconocidaAt) ?? null
  useAuthDeepLinks()
  useInspectUnlock()

  return (
    <>
      {bypass ? (
        <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-1.5 bg-idle/90 py-1 text-center text-xs font-medium text-black backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-black" />
          Mantenimiento activo — estás viendo Zion con acceso de administrador
        </div>
      ) : null}
      {loading || (user && statusLoading) ? (
        <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : !user || pendingAuthAction ? (
        <AuthScreen />
      ) : isMaintenance ? (
        <MaintenanceScreen />
      ) : activeBan ? (
        <AccountStatusScreen ban={activeBan} onSignOut={signOut} />
      ) : (
        <TooltipProvider>
          <AppShell key={user.id} userId={user.id} />
          {advertenciaPendiente && (
            <SancionNoticeDialog
              sancion={advertenciaPendiente}
              onAcknowledged={() => marcarReconocida(advertenciaPendiente.id)}
            />
          )}
        </TooltipProvider>
      )}
      <UpdateBadge />
      <ToastViewport />
      <ReauthenticateDialog />
    </>
  )
}

export default App
