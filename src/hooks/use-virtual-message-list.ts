import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import type { MessageGroup } from '@/lib/message-grouping'

const GAP = 12
const PADDING = 16
const BOTTOM_THRESHOLD = 140
const ESTIMATED_GROUP_HEIGHT = 96

interface UseVirtualMessageListParams {
  groups: MessageGroup[]
  resetKey: string
  currentUserId: string
  highlightMessageId?: string | null
  localHighlightId?: string | null
}

function firmaDeGrupos(groups: MessageGroup[]): string {
  const last = groups[groups.length - 1]
  if (!last) return `${groups.length}`
  return `${groups.length}:${last.items[0]?.id ?? ''}:${last.items.length}:${
    last.items[last.items.length - 1]?.id ?? ''
  }`
}

export function useVirtualMessageList({
  groups,
  resetKey,
  currentUserId,
  highlightMessageId,
  localHighlightId,
}: UseVirtualMessageListParams) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const atBottomRef = useRef(true)
  const firmaRef = useRef('')

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_GROUP_HEIGHT,
    overscan: 12,
    gap: GAP,
    paddingStart: PADDING,
    paddingEnd: PADDING,
    getItemKey: (index) => groups[index]?.items[0]?.id ?? index,
  })

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const parent = parentRef.current
      if (!parent) return
      if (groups.length > 0) {
        virtualizer.scrollToIndex(groups.length - 1, { align: 'end', behavior })
      }
      requestAnimationFrame(() => {
        const el = parentRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
      atBottomRef.current = true
    },
    [virtualizer, groups.length]
  )

  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el) return
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD
  }, [])

  useLayoutEffect(() => {
    firmaRef.current = firmaDeGrupos(groups)
    atBottomRef.current = true
    scrollToBottom('auto')
    const rafs = [
      requestAnimationFrame(() => scrollToBottom('auto')),
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToBottom('auto'))
      ),
    ]
    const timer = setTimeout(() => scrollToBottom('auto'), 150)
    return () => {
      rafs.forEach(cancelAnimationFrame)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  useLayoutEffect(() => {
    const firma = firmaDeGrupos(groups)
    const previa = firmaRef.current
    firmaRef.current = firma
    if (previa === '' || previa === firma) return

    const ultimoGrupo = groups[groups.length - 1]
    const ultimoMensaje = ultimoGrupo?.items[ultimoGrupo.items.length - 1]
    const esMio = ultimoMensaje?.author.id === currentUserId
    if (esMio || atBottomRef.current) scrollToBottom('auto')
  }, [groups, currentUserId, scrollToBottom])

  useEffect(() => {
    const el = listRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) {
        const parent = parentRef.current
        if (parent) parent.scrollTop = parent.scrollHeight
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const targetId = highlightMessageId || localHighlightId
    if (!targetId) return

    const idx = groups.findIndex((g) => g.items.some((m) => m.id === targetId))
    if (idx === -1) return

    virtualizer.scrollToIndex(idx, { align: 'center' })

    let intentos = 0
    let raf = 0
    const afinar = () => {
      const node = document.getElementById(`message-${targetId}`)
      if (node) {
        node.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } else if (intentos++ < 12) {
        raf = requestAnimationFrame(afinar)
      }
    }
    raf = requestAnimationFrame(afinar)
    return () => cancelAnimationFrame(raf)
  }, [highlightMessageId, localHighlightId, groups, virtualizer])

  return {
    parentRef,
    listRef,
    handleScroll,
    scrollToBottom,
    totalSize: virtualizer.getTotalSize(),
    virtualItems: virtualizer.getVirtualItems(),
    measureElement: virtualizer.measureElement,
  }
}
