import { useEffect, useRef } from 'react'

import { guardarDraft, leerDraft } from '@/lib/drafts'

export function useDraftSync(
  key: string,
  draft: string,
  setDraft: (value: string) => void
) {
  const cargadoPara = useRef<string | null>(null)
  const omitirGuardado = useRef(false)

  useEffect(() => {
    let cancelado = false
    omitirGuardado.current = true
    cargadoPara.current = null

    leerDraft(key).then((texto) => {
      if (cancelado) return
      cargadoPara.current = key
      setDraft(texto)
      requestAnimationFrame(() => {
        omitirGuardado.current = false
      })
    })

    return () => {
      cancelado = true
    }
  }, [key, setDraft])

  useEffect(() => {
    if (cargadoPara.current !== key || omitirGuardado.current) return
    const t = setTimeout(() => {
      void guardarDraft(key, draft)
    }, 400)
    return () => clearTimeout(t)
  }, [key, draft])
}
