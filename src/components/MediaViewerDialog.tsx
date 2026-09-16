import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Check,
  Copy,
  Download,
  Forward,
  Loader2,
  Maximize,
  Minus,
  Plus,
  RotateCw,
  X,
} from 'lucide-react'

import { getErrorMessage } from '@/lib/utils'
import { writeClipboardImage } from '@/lib/electron-bridge'
import { db } from '@/lib/db'
import type { ChatAttachment } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface MediaViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachment: ChatAttachment | null
  onForward?: () => void
}

const SCALE_MIN = 1
const SCALE_MAX = 8
const WHEEL_FACTOR = 1.2
const BUTTON_FACTOR = 1.5

const LOCAL_PREFIX = 'zion-media://'

const toolbarButton =
  'flex size-9 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-35'

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={toolbarButton}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function clampScale(value: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, +value.toFixed(3)))
}

function parseFileName(url: string): string {
  try {
    if (url.startsWith(LOCAL_PREFIX)) {
      return decodeURIComponent(url.slice(LOCAL_PREFIX.length).split(/[/?#]/)[0]) || 'archivo'
    }
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || 'archivo'
  } catch {
    return 'archivo'
  }
}

function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(objectUrl)
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob)
        else reject(new Error('No se pudo convertir la imagen.'))
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo cargar la imagen.'))
    }
    img.src = objectUrl
  })
}

export function MediaViewerDialog({
  open,
  onOpenChange,
  attachment,
  onForward,
}: MediaViewerDialogProps) {
  const isImage = attachment?.type === 'image'

  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [displayName, setDisplayName] = useState(() =>
    attachment ? parseFileName(attachment.url) : 'archivo'
  )

  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null
  )

  const reset = useCallback(() => {
    setScale(1)
    setRotation((r) => Math.round(r / 360) * 360)
    setOffset({ x: 0, y: 0 })
    setDragging(false)
  }, [])

  useEffect(() => {
    if (!attachment?.url.startsWith(LOCAL_PREFIX)) return
    const id = attachment.url.slice(LOCAL_PREFIX.length).split(/[/?#]/)[0]
    let cancel = false
    db.localMedia
      .get(id)
      .then((row) => {
        if (!cancel && row?.nombre) setDisplayName(row.nombre)
      })
      .catch(() => undefined)
    return () => {
      cancel = true
    }
  }, [attachment])

  const zoomBy = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    setScale((prev) => {
      const next = clampScale(prev * factor)
      if (next === prev) return prev
      const ratio = next / prev
      setOffset((o) => {
        if (next <= SCALE_MIN) return { x: 0, y: 0 }
        const stage = stageRef.current
        if (!anchor || !stage) return { x: o.x * ratio, y: o.y * ratio }
        const rect = stage.getBoundingClientRect()
        const px = anchor.x - rect.left - rect.width / 2
        const py = anchor.y - rect.top - rect.height / 2
        return {
          x: px - (px - o.x) * ratio,
          y: py - (py - o.y) * ratio,
        }
      })
      return next
    })
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          onOpenChange(false)
          break
        case '+':
        case '=':
          if (isImage) zoomBy(BUTTON_FACTOR)
          break
        case '-':
        case '_':
          if (isImage) zoomBy(1 / BUTTON_FACTOR)
          break
        case 'r':
        case 'R':
          if (isImage) {
            setRotation((r) => r + 90)
            setOffset({ x: 0, y: 0 })
          }
          break
        case '0':
          if (isImage) reset()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isImage, onOpenChange, zoomBy, reset])

  if (!open || !attachment) return null
  const media = attachment

  function handleWheel(event: React.WheelEvent) {
    if (!isImage) return
    event.preventDefault()
    zoomBy(event.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR, {
      x: event.clientX,
      y: event.clientY,
    })
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (!isImage || scale <= SCALE_MIN) return
    event.preventDefault()
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
    }
    setDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    setOffset({
      x: drag.baseX + (event.clientX - drag.startX),
      y: drag.baseY + (event.clientY - drag.startY),
    })
  }

  function handlePointerUp(event: React.PointerEvent) {
    dragRef.current = null
    setDragging(false)
    try {
      ;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      return
    }
  }

  function toggleZoom() {
    if (scale > SCALE_MIN) reset()
    else setScale(2)
  }

  async function handleDownload() {
    setDownloading(true)
    setActionError(null)
    try {
      const response = await fetch(media.url)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = displayName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    if (media.type !== 'image') return
    setCopying(true)
    setActionError(null)
    try {
      const response = await fetch(media.url)
      const blob = await response.blob()
      const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob)
      await writeClipboardImage(pngBlob)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setCopying(false)
    }
  }

  function handleForward() {
    onOpenChange(false)
    onForward?.()
  }

  const stop = (event: React.MouseEvent | React.PointerEvent) => event.stopPropagation()
  const zoomed = scale > SCALE_MIN

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm select-none"
      role="dialog"
      aria-modal
      aria-label="Visor de imagen"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-3 py-2.5"
        onClick={stop}
        onPointerDown={stop}
      >
        <p className="min-w-0 flex-1 truncate pl-2 text-xs text-white/70">{displayName}</p>

        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 p-0.5 ring-1 ring-white/10">
          {isImage && (
            <>
              <ToolButton
                label="Alejar"
                onClick={() => zoomBy(1 / BUTTON_FACTOR)}
                disabled={scale <= SCALE_MIN}
              >
                <Minus className="size-4" />
              </ToolButton>
              <span className="min-w-12 text-center text-xs tabular-nums text-white/70">
                {Math.round(scale * 100)}%
              </span>
              <ToolButton
                label="Acercar"
                onClick={() => zoomBy(BUTTON_FACTOR)}
                disabled={scale >= SCALE_MAX}
              >
                <Plus className="size-4" />
              </ToolButton>
              <ToolButton
                label="Rotar"
                onClick={() => {
                  setRotation((r) => r + 90)
                  setOffset({ x: 0, y: 0 })
                }}
              >
                <RotateCw className="size-4" />
              </ToolButton>
              <ToolButton
                label="Ajustar a la pantalla"
                onClick={reset}
                disabled={!zoomed && rotation % 360 === 0}
              >
                <Maximize className="size-4" />
              </ToolButton>
              <span className="mx-1 h-5 w-px bg-white/15" />
            </>
          )}

          {onForward && (
            <ToolButton label="Reenviar" onClick={handleForward}>
              <Forward className="size-4" />
            </ToolButton>
          )}

          {isImage && (
            <ToolButton
              label={copied ? 'Copiado' : 'Copiar imagen'}
              onClick={handleCopy}
              disabled={copying}
            >
              {copied ? (
                <Check className="size-4 text-online" />
              ) : copying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
            </ToolButton>
          )}

          <ToolButton label="Descargar" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </ToolButton>

          <span className="mx-1 h-5 w-px bg-white/15" />

          <ToolButton label="Cerrar" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </ToolButton>
        </div>
      </div>

      <div
        ref={stageRef}
        className="flex flex-1 items-center justify-center overflow-hidden px-6 pb-4"
        onWheel={handleWheel}
      >
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const el = event.currentTarget
              setDims({ w: el.naturalWidth, h: el.naturalHeight })
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (!dragRef.current) toggleZoom()
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: dragging ? 'none' : 'transform 150ms ease-out',
              cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
            className="max-h-[82vh] max-w-[88vw] object-contain will-change-transform"
          />
        ) : (
          <video
            src={media.url}
            controls
            autoPlay
            onClick={stop}
            className="max-h-[82vh] max-w-[88vw] rounded-lg object-contain"
          />
        )}
      </div>

      <div
        className="flex shrink-0 items-center justify-center gap-2 px-4 pb-3 text-[11px] text-white/45"
        onClick={stop}
      >
        {actionError ? (
          <span className="text-destructive" role="alert">
            {actionError}
          </span>
        ) : (
          <span className="max-w-[80vw] truncate">
            {displayName}
            {isImage && dims && (
              <span className="tabular-nums text-white/35">
                {' · '}
                {dims.w} × {dims.h}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
