import { useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Code2,
  Eye,
  Hash,
  Lock,
  Megaphone,
  PlusCircle,
  Users,
  Volume2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  agruparCanalesPorCategoria,
  type PlantillaCanalPreview,
  type PlantillaServidorDetalle,
} from '@/lib/templates'
import { Button } from '@/components/ui/button'

const tipoIcon: Record<string, typeof Hash> = {
  texto: Hash,
  voz: Volume2,
  codigo: Code2,
  anuncios: Megaphone,
}

interface PlantillaServidorPreviewProps {
  plantilla: PlantillaServidorDetalle
  nombreServidor: string
  iconoUrl: string | null
  creating: boolean
  onBack: () => void
  onCreate: () => void
}

export function PlantillaServidorPreview({
  plantilla,
  nombreServidor,
  iconoUrl,
  creating,
  onBack,
  onCreate,
}: PlantillaServidorPreviewProps) {
  const grupos = agruparCanalesPorCategoria(plantilla.canales)
  const primerCanal =
    plantilla.canales.find((c) => c.tipo !== 'voz') ?? plantilla.canales[0] ?? null
  const [canalActivo, setCanalActivo] = useState<PlantillaCanalPreview | null>(primerCanal)
  const nombre = nombreServidor.trim() || plantilla.nombre
  const IconoActivo = canalActivo ? (tipoIcon[canalActivo.tipo] ?? Hash) : Hash

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
      <div className="flex shrink-0 items-center gap-3 bg-primary/15 px-4 py-2">
        <Eye className="size-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-sm text-foreground">
          Vista previa de <span className="font-semibold">{plantilla.nombre}</span>: navegá los
          canales y decidí si querés crear el servidor.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={creating}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        <Button type="button" size="sm" onClick={onCreate} disabled={creating}>
          {creating ? 'Creando…' : 'Crear este servidor'}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
            {iconoUrl ? (
              <img src={iconoUrl} alt="" className="size-full object-cover" />
            ) : plantilla.iconoDefecto ? (
              <span className="text-xl leading-none">{plantilla.iconoDefecto}</span>
            ) : (
              nombre.slice(0, 2).toUpperCase()
            )}
          </div>
        </div>

        <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
            <span className="truncate text-sm font-semibold text-sidebar-foreground">{nombre}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
            {grupos.map((grupo, index) => (
              <div key={grupo.categoria ?? index}>
                {grupo.categoria && (
                  <p className="flex items-center gap-1 px-1.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <ChevronDown className="size-3" />
                    <span className="truncate">{grupo.categoria}</span>
                  </p>
                )}
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {grupo.canales.map((canal) => {
                    const Icon = tipoIcon[canal.tipo] ?? Hash
                    const activo = canalActivo === canal
                    return (
                      <li key={`${grupo.categoria ?? ''}-${canal.nombre}`}>
                        <button
                          type="button"
                          onClick={() => setCanalActivo(canal)}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                            activo && 'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{canal.nombre}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {plantilla.canales.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground">Esta plantilla arranca sin canales.</p>
            )}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <IconoActivo className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold text-foreground">
              {canalActivo?.nombre ?? nombre}
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto p-4">
            {canalActivo ? (
              canalActivo.tipo === 'voz' ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <IconoActivo className="size-10 text-muted-foreground" />
                  <p className="text-base font-semibold text-foreground">{canalActivo.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    Canal de voz. Cuando crees el servidor, vas a poder entrar a hablar acá.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <IconoActivo className="size-7 text-foreground" />
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-foreground">
                    ¡Te damos la bienvenida a #{canalActivo.nombre}!
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {canalActivo.tipo === 'anuncios'
                      ? 'Canal de anuncios: ideal para novedades importantes del servidor.'
                      : canalActivo.tipo === 'codigo'
                        ? 'Canal de código: para compartir fragmentos con formato.'
                        : `Este es el comienzo del canal #${canalActivo.nombre}.`}
                  </p>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Elegí un canal para verlo.</p>
            )}
          </div>

          {canalActivo && canalActivo.tipo !== 'voz' && (
            <div className="shrink-0 px-4 pb-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                <PlusCircle className="size-4 shrink-0" />
                <Lock className="size-3.5 shrink-0" />
                No podés escribir en una vista previa. Creá el servidor para empezar a chatear.
              </div>
            </div>
          )}
        </main>

        <aside className="hidden w-56 shrink-0 flex-col gap-3 overflow-y-auto border-l border-sidebar-border bg-sidebar p-3 lg:flex">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Users className="size-3.5" />
            Roles de la plantilla
          </p>
          {plantilla.roles.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {plantilla.roles.map((rol) => (
                <li
                  key={rol.nombre}
                  className="truncate rounded-md px-2 py-1 text-sm text-sidebar-foreground"
                >
                  {rol.nombre}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sin roles predefinidos. Los creás vos desde Configuración &gt; Personas.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
