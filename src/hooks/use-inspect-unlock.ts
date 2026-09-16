import { useEffect } from 'react'

import { desbloquearInspeccion } from '@/lib/platform-admin'
import { pushToast } from '@/hooks/use-toasts'

export function useInspectUnlock(): void {
  useEffect(() => {
    let ocupado = false

    async function onKeyDown(event: KeyboardEvent) {
      const combo =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.altKey &&
        event.key.toLowerCase() === 'i'
      if (!combo || ocupado) return

      event.preventDefault()
      ocupado = true
      try {
        const resultado = await desbloquearInspeccion()
        if (resultado === 'ok') {
          pushToast({ title: 'Herramientas de desarrollo activadas', icon: 'sistema' })
        } else if (resultado === 'denegado') {
          pushToast({ title: 'No tenés permiso para abrir la inspección', icon: 'sistema' })
        }
      } finally {
        ocupado = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
