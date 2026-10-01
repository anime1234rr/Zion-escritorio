import { useEffect, useRef, useState } from 'react'

import {
  checkForUpdates,
  onUpdateAvailable,
  onUpdateError,
  openExternal,
  type UpdateInfoPayload,
} from '@/lib/electron-bridge'
import { pushToast } from '@/hooks/use-toasts'

export type AppUpdateStatus = 'idle' | 'checking' | 'available' | 'error'

export function useAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>('idle')
  const [info, setInfo] = useState<UpdateInfoPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [everShown, setEverShown] = useState(false)
  const notifiedVersionRef = useRef<string | null>(null)

  function notifyAvailable(result: UpdateInfoPayload) {
    if (notifiedVersionRef.current === result.version) return
    notifiedVersionRef.current = result.version
    pushToast({
      title: 'Actualización disponible',
      description: `Zion v${result.version} ya está lista para descargar.`,
      icon: 'sistema',
      onClick: () => openExternal(result.downloadUrl),
    })
  }

  function resolveCheck() {
    return checkForUpdates().then((result) => {
      if (result) {
        setInfo(result)
        setStatus('available')
        setEverShown(true)
        notifyAvailable(result)
      } else {
        setStatus((prev) => (prev === 'checking' ? 'idle' : prev))
      }
    })
  }

  function retryCheck() {
    setError(null)
    setStatus('checking')
    resolveCheck()
  }

  useEffect(() => {
    resolveCheck()

    const unsubAvailable = onUpdateAvailable((result) => {
      setInfo(result)
      setError(null)
      setStatus('available')
      setEverShown(true)
      notifyAvailable(result)
    })

    const unsubError = onUpdateError((message) => {
      setError(message)
      setStatus('error')
      setEverShown(true)
    })

    return () => {
      unsubAvailable()
      unsubError()
    }
  }, [])

  function download() {
    if (info?.downloadUrl) openExternal(info.downloadUrl)
  }

  return { status, info, error, everShown, download, retryCheck }
}
