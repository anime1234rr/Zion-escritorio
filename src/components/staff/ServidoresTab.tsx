import { useEffect, useMemo, useState } from 'react'
import { Compass, Search, Sparkles, Users, X } from 'lucide-react'

import {
  staffCambiarListadoServidor,
  staffListarServidores,
  staffQuitarEtiquetaServidor,
  type ServidorStaff,
} from '@/lib/staff-platform'
import { debounce, initials, relativeTime } from '@/lib/internal/core-utils'
import { suscribirseAlPanelStaff } from '@/lib/realtime-avisos'
import { cn, getErrorMessage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Filtro = 'todos' | 'explorar' | 'fuera'

export function ServidoresTab({ onCambio }: { onCambio: () => void }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 300), [])
  useEffect(() => debouncedSetQuery.cancel, [debouncedSetQuery])

  const [servidores, setServidores] = useState<ServidorStaff[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => suscribirseAlPanelStaff(() => setRefreshKey((k) => k + 1)), [])

  useEffect(() => {
    let cancelado = false
    staffListarServidores(debouncedQuery)
      .then((data) => {
        if (cancelado) return
        setServidores(data)
        setError(null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [debouncedQuery, refreshKey])

  async function cambiarListado(servidor: ServidorStaff, listado: boolean) {
    setBusyId(servidor.id)
    setError(null)
    try {
      await staffCambiarListadoServidor(servidor.id, listado)
      setServidores((prev) =>
        prev?.map((s) => (s.id === servidor.id ? { ...s, listadoPorStaff: listado } : s)) ?? prev
      )
      onCambio()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function quitarEtiqueta(servidor: ServidorStaff, etiquetaId: string) {
    setBusyId(servidor.id)
    setError(null)
    try {
      await staffQuitarEtiquetaServidor(servidor.id, etiquetaId)
      setServidores(
        (prev) =>
          prev?.map((s) =>
            s.id === servidor.id ? { ...s, etiquetas: s.etiquetas.filter((e) => e.id !== etiquetaId) } : s
          ) ?? prev
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const visibles = (servidores ?? []).filter((s) => {
    const enExplorar = s.comunidadActiva || s.listadoPorStaff
    if (filtro === 'explorar') return enExplorar
    if (filtro === 'fuera') return !enExplorar
    return true
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Agregá cualquier servidor a Explorar aunque no cumpla los requisitos de comunidad (ícono,
        canales de bienvenida y normas, verificación y 10 miembros). Aparece como destacado.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              debouncedSetQuery(event.target.value)
            }}
            placeholder="Buscar por nombre del servidor o del propietario…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(
            [
              ['todos', 'Todos'],
              ['explorar', 'En Explorar'],
              ['fuera', 'Fuera de Explorar'],
            ] as [Filtro, string][]
          ).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={cn(
                'rounded-full border border-border px-3 py-1 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                filtro === valor && 'border-primary bg-primary/10 text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {!servidores && !error && <p className="text-sm text-muted-foreground">Cargando servidores…</p>}
        {servidores && visibles.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay servidores en esta lista.</p>
        )}
        {visibles.map((servidor) => (
          <div key={servidor.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-xs font-semibold text-foreground">
              {servidor.iconoUrl ? (
                <img src={servidor.iconoUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(servidor.nombre)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">{servidor.nombre}</span>
                {servidor.listadoPorStaff && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    <Sparkles className="size-3" />
                    Destacado
                  </span>
                )}
                {servidor.comunidadActiva && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded bg-online/15 px-1.5 py-0.5 text-[11px] font-medium text-online">
                    <Compass className="size-3" />
                    Comunidad
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Users className="size-3 shrink-0" />
                {servidor.cantidadMiembros} · de {servidor.propietarioNombre ?? 'desconocido'} · creado{' '}
                {relativeTime(servidor.creadoAt)}
                {servidor.listadoPorStaff && servidor.listadoPorNombre
                  ? ` · agregado por ${servidor.listadoPorNombre}`
                  : ''}
              </p>
              {servidor.etiquetas.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {servidor.etiquetas.map((etiqueta) => (
                    <Badge
                      key={etiqueta.id}
                      variant="outline"
                      className={cn('cursor-pointer gap-1', busyId === servidor.id && 'pointer-events-none opacity-50')}
                      onClick={() => quitarEtiqueta(servidor, etiqueta.id)}
                    >
                      {etiqueta.nombre}
                      <X className="size-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {servidor.listadoPorStaff ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === servidor.id}
                onClick={() => cambiarListado(servidor, false)}
              >
                Quitar de Explorar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={busyId === servidor.id}
                onClick={() => cambiarListado(servidor, true)}
              >
                Agregar a Explorar
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
