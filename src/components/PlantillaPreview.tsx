import { Code2, Hash, Megaphone, Volume2 } from 'lucide-react'

import { agruparCanalesPorCategoria, type PlantillaServidorDetalle } from '@/lib/templates'

const tipoIcon: Record<string, typeof Hash> = {
  texto: Hash,
  voz: Volume2,
  codigo: Code2,
  anuncios: Megaphone,
}

interface PlantillaPreviewProps {
  plantilla: PlantillaServidorDetalle
}

export function PlantillaPreview({ plantilla }: PlantillaPreviewProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        {agruparCanalesPorCategoria(plantilla.canales).map((grupo, index) => (
          <div key={grupo.categoria ?? index}>
            {grupo.categoria && (
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {grupo.categoria}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {grupo.canales.map((canal) => {
                const Icon = tipoIcon[canal.tipo] ?? Hash
                return (
                  <span
                    key={canal.nombre}
                    className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    <Icon className="size-3" />
                    {canal.nombre}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {plantilla.roles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plantilla.roles.map((rol) => (
            <span
              key={rol.nombre}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {rol.nombre}
            </span>
          ))}
        </div>
      )}
    </>
  )
}
