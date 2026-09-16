import { useEffect, useRef, useState } from 'react'
import { FolderOpen, HardDrive, Cloud, Trash2, Upload } from 'lucide-react'

import { actualizarFondoApp, obtenerFondoApp, type AppBackground } from '@/lib/profiles'
import { subirFondoApp, FONDO_APP_ACCEPT } from '@/lib/storage'
import {
  abrirCarpetaMediaLocal,
  eliminarMediaLocal,
  formatearBytes,
  guardarMediaLocal,
  soportaMediaLocal,
  usoMediaLocal,
  LOCAL_MEDIA_ACCEPT,
} from '@/lib/local-media'
import {
  escribirModoFondo,
  escribirRefFondoLocal,
  leerModoFondo,
  leerRefFondoLocal,
  type FondoModo,
} from '@/lib/local-background'
import { resolverUrlMedia, type LocalMediaRef, type MediaTipo } from '@/lib/media-ref'
import {
  ACCENTS,
  resetAppearance,
  setAppearanceSetting,
  useAppearanceSettings,
  type Density,
  type Radius,
  type ThemeMode,
} from '@/hooks/use-appearance-settings'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const THEME_OPCIONES: { valor: ThemeMode; label: string }[] = [
  { valor: 'sistema', label: 'Sistema' },
  { valor: 'oscuro', label: 'Oscuro' },
  { valor: 'claro', label: 'Claro' },
]

const DENSITY_OPCIONES: { valor: Density; label: string }[] = [
  { valor: 'compacta', label: 'Compacta' },
  { valor: 'normal', label: 'Normal' },
  { valor: 'comoda', label: 'Cómoda' },
]

const RADIUS_OPCIONES: { valor: Radius; label: string }[] = [
  { valor: 'cuadrado', label: 'Cuadrado' },
  { valor: 'suave', label: 'Suave' },
  { valor: 'normal', label: 'Normal' },
  { valor: 'redondo', label: 'Redondo' },
]

function segmentoClase(activo: boolean) {
  return cn(
    'rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
    activo
      ? 'border-primary bg-primary/10 text-foreground'
      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
  )
}

function TemaColorBlock() {
  const apariencia = useAppearanceSettings()

  return (
    <div className="mt-6 flex flex-col gap-5 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase">Tema</Label>
        <div className="flex flex-wrap gap-2">
          {THEME_OPCIONES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setAppearanceSetting('theme', opcion.valor)}
              className={segmentoClase(apariencia.theme === opcion.valor)}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase">Color de acento</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((acento) => (
            <button
              key={acento.valor}
              type="button"
              onClick={() => setAppearanceSetting('accent', acento.valor)}
              aria-label={acento.nombre}
              aria-pressed={apariencia.accent.toLowerCase() === acento.valor.toLowerCase()}
              className={cn(
                'size-7 rounded-full outline-none ring-offset-2 ring-offset-background transition-transform focus-visible:ring-3 focus-visible:ring-ring/50',
                apariencia.accent.toLowerCase() === acento.valor.toLowerCase()
                  ? 'ring-2 ring-foreground'
                  : 'hover:scale-110'
              )}
              style={{ backgroundColor: acento.valor }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase">Densidad</Label>
        <div className="flex flex-wrap gap-2">
          {DENSITY_OPCIONES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setAppearanceSetting('density', opcion.valor)}
              className={segmentoClase(apariencia.density === opcion.valor)}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase">Bordes</Label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPCIONES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setAppearanceSetting('radius', opcion.valor)}
              className={segmentoClase(apariencia.radius === opcion.valor)}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Button type="button" variant="ghost" size="sm" onClick={resetAppearance}>
          Restablecer apariencia
        </Button>
      </div>
    </div>
  )
}

interface AparienciaSectionProps {
  currentUser: ChatUser
  onProfileUpdated: (user: ChatUser) => void
}

type Modo = 'archivo' | 'url'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']

function inferirTipoDesdeUrl(url: string): 'imagen' | 'video' | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'video'
    if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'imagen'
    return null
  } catch {
    return null
  }
}

interface VistaFondo {
  url: string
  tipo: MediaTipo
}

export function AparienciaSection({ currentUser, onProfileUpdated }: AparienciaSectionProps) {
  const userId = currentUser.id
  const localDisponible = soportaMediaLocal()

  const [almacen, setAlmacen] = useState<FondoModo>(() =>
    leerModoFondo() === 'local' && localDisponible ? 'local' : 'backend'
  )

  const [fondoBackend, setFondoBackend] = useState<AppBackground | null>(null)
  const [refLocal, setRefLocal] = useState<LocalMediaRef | null>(() => leerRefFondoLocal())
  const [usoLocal, setUsoLocal] = useState<{ count: number; bytes: number } | null>(null)
  const [usoTick, setUsoTick] = useState(0)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modo, setModo] = useState<Modo>('archivo')
  const [urlInput, setUrlInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false
    obtenerFondoApp(userId)
      .then((data) => !cancelado && setFondoBackend(data))
      .catch((err) => !cancelado && setLoadError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [userId])

  const refrescarUsoLocal = () => setUsoTick((n) => n + 1)
  useEffect(() => {
    if (!localDisponible) return
    let cancelado = false
    usoMediaLocal()
      .then((u) => !cancelado && setUsoLocal(u))
      .catch(() => !cancelado && setUsoLocal(null))
    return () => {
      cancelado = true
    }
  }, [localDisponible, usoTick])

  const vista: VistaFondo | null =
    almacen === 'local'
      ? refLocal
        ? { url: resolverUrlMedia(refLocal)!, tipo: refLocal.tipo }
        : null
      : fondoBackend
        ? { url: fondoBackend.url, tipo: fondoBackend.tipo }
        : null

  function reflejarEnPerfil(v: VistaFondo | null) {
    onProfileUpdated({
      ...currentUser,
      backgroundUrl: v?.url,
      backgroundType: v?.tipo,
    })
  }

  function limpiarSeleccion() {
    setFile(null)
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  function cambiarAlmacen(nuevo: FondoModo) {
    if (nuevo === almacen) return
    setError(null)
    limpiarSeleccion()
    setAlmacen(nuevo)
    escribirModoFondo(nuevo)
    if (nuevo === 'backend') setModo('archivo')

    if (nuevo === 'local') {
      const ref = leerRefFondoLocal()
      setRefLocal(ref)
      reflejarEnPerfil(ref ? { url: resolverUrlMedia(ref)!, tipo: ref.tipo } : null)
    } else {
      reflejarEnPerfil(
        fondoBackend ? { url: fondoBackend.url, tipo: fondoBackend.tipo } : null
      )
    }
  }

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    setError(null)
    setFile(picked)
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(picked)
    })
  }

  async function handleApplyFile() {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      if (almacen === 'local') {
        const nuevaRef = await guardarMediaLocal(file, 'fondo-app')
        const anterior = refLocal
        escribirRefFondoLocal(nuevaRef)
        setRefLocal(nuevaRef)
        if (anterior && anterior.id !== nuevaRef.id) await eliminarMediaLocal(anterior.id)
        reflejarEnPerfil({ url: resolverUrlMedia(nuevaRef)!, tipo: nuevaRef.tipo })
        refrescarUsoLocal()
      } else {
        const subido = await subirFondoApp(userId, file)
        await actualizarFondoApp(userId, subido)
        setFondoBackend(subido)
        reflejarEnPerfil(subido)
      }
      limpiarSeleccion()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyUrl() {
    const url = urlInput.trim()
    if (!url) return

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      setError('Ingresá una URL válida (tiene que empezar con http:// o https://).')
      return
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setError('Solo se admiten URLs http:// o https://.')
      return
    }

    const nuevoFondo: AppBackground = { url, tipo: inferirTipoDesdeUrl(url) ?? 'imagen' }
    setSaving(true)
    setError(null)
    try {
      await actualizarFondoApp(userId, nuevoFondo)
      setFondoBackend(nuevoFondo)
      reflejarEnPerfil(nuevoFondo)
      setUrlInput('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError(null)
    try {
      if (almacen === 'local') {
        const anterior = refLocal
        escribirRefFondoLocal(null)
        setRefLocal(null)
        if (anterior) await eliminarMediaLocal(anterior.id)
        reflejarEnPerfil(null)
        refrescarUsoLocal()
      } else {
        await actualizarFondoApp(userId, null)
        setFondoBackend(null)
        reflejarEnPerfil(null)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const urlPreviewTipo = urlInput.trim() ? inferirTipoDesdeUrl(urlInput.trim()) : null
  const acceptFile = almacen === 'local' ? LOCAL_MEDIA_ACCEPT : FONDO_APP_ACCEPT

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Apariencia</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajustá el tema, los colores y la densidad de la interfaz, y elegí un fondo para la app.
        Estos ajustes se guardan solo en este equipo.
      </p>

      <TemaColorBlock />

      <h2 className="mt-8 text-sm font-semibold text-foreground">Fondo de la app</h2>

      <div className="mt-3 flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase">Dónde se guarda el fondo</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => cambiarAlmacen('local')}
            disabled={!localDisponible || saving}
            aria-pressed={almacen === 'local'}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left outline-none transition-colors',
              'hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              almacen === 'local' && 'border-primary bg-primary/5'
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <HardDrive className="size-4 shrink-0" />
              En este equipo
            </span>
            <span className="text-xs text-muted-foreground">
              El archivo se copia a una carpeta de Zion en tu equipo. No se sube a ningún servidor
              ni se sincroniza.
              {!localDisponible && ' Solo disponible en la app de escritorio.'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => cambiarAlmacen('backend')}
            disabled={saving}
            aria-pressed={almacen === 'backend'}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left outline-none transition-colors',
              'hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              almacen === 'backend' && 'border-primary bg-primary/5'
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Cloud className="size-4 shrink-0" />
              En tu cuenta
            </span>
            <span className="text-xs text-muted-foreground">
              El archivo se sube al servidor y te sigue en los demás dispositivos donde uses Zion.
            </span>
          </button>
        </div>

        {almacen === 'local' && localDisponible && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {usoLocal
              ? `Estás usando ${formatearBytes(usoLocal.bytes)} en ${usoLocal.count} archivo${
                  usoLocal.count === 1 ? '' : 's'
                } local${usoLocal.count === 1 ? '' : 'es'}.`
              : 'Archivos guardados en tu equipo.'}
            <button
              type="button"
              onClick={abrirCarpetaMediaLocal}
              className="inline-flex items-center gap-1 text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <FolderOpen className="size-3.5" />
              Abrir carpeta
            </button>
          </p>
        )}
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {!loading && (
        <div className="mt-5 flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground uppercase">Fondo actual</Label>
          {vista ? (
            <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {vista.tipo === 'video' ? (
                  <video src={vista.url} className="size-full object-cover" muted playsInline />
                ) : (
                  <img src={vista.url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {almacen === 'local' && refLocal ? refLocal.nombre : vista.url}
                </p>
                <p className="text-xs text-muted-foreground">
                  {vista.tipo === 'video' ? 'Video' : 'Imagen'}
                  {' · '}
                  {almacen === 'local' ? 'guardado en este equipo' : 'sincronizado con tu cuenta'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={handleRemove}
              >
                <Trash2 className="size-3.5" />
                Quitar
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
              {almacen === 'local'
                ? 'No tenés un fondo local en este equipo.'
                : 'No tenés un fondo personalizado configurado.'}
            </p>
          )}
        </div>
      )}

      {almacen === 'backend' && (
        <div className="mt-6 flex gap-1 border-b border-border">
          {(
            [
              ['archivo', 'Subir archivo'],
              ['url', 'URL directa'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setModo(id)
                setError(null)
              }}
              className={cn(
                '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground',
                modo === id && 'border-primary font-medium text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {(almacen === 'local' || modo === 'archivo') && (
        <div className="mt-4 flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptFile}
            className="hidden"
            onChange={handlePickFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3 text-left outline-none hover:border-solid hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {filePreview ? (
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {file?.type.startsWith('video/') ? (
                  <video src={filePreview} className="size-full object-cover" muted playsInline />
                ) : (
                  <img src={filePreview} alt="" className="size-full object-cover" />
                )}
              </div>
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Upload className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : 'Elegí una imagen, GIF o video'}
              </p>
              <p className="text-xs text-muted-foreground">
                {almacen === 'local'
                  ? 'jpeg, png, gif, webp, mp4, webm — hasta 100 MB. Se guarda solo en tu equipo.'
                  : 'jpeg, png, gif, webp — hasta 10 MB. mp4, webm — hasta 10 MB.'}
              </p>
            </div>
          </button>

          <div>
            <Button type="button" disabled={!file || saving} onClick={handleApplyFile}>
              {saving
                ? 'Aplicando…'
                : almacen === 'local'
                  ? 'Guardar en este equipo'
                  : 'Subir y aplicar'}
            </Button>
          </div>
        </div>
      )}

      {almacen === 'backend' && modo === 'url' && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fondo_url">URL directa</Label>
            <Input
              id="fondo_url"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://ejemplo.com/fondo.gif"
            />
            <p className="text-xs text-muted-foreground">
              Tiene que ser un enlace directo a una imagen, GIF o video público (no una página
              web).
              {urlInput.trim() &&
                (urlPreviewTipo
                  ? ` Detectado como ${urlPreviewTipo === 'video' ? 'video' : 'imagen'}.`
                  : ' No se pudo detectar el tipo por la extensión — se va a intentar como imagen.')}
            </p>
          </div>

          <div>
            <Button type="button" disabled={!urlInput.trim() || saving} onClick={handleApplyUrl}>
              {saving ? 'Aplicando…' : 'Aplicar URL'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
