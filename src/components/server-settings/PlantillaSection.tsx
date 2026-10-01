import { useEffect, useState } from 'react'

import { listarPlantillasConDetalle, type PlantillaServidorDetalle } from '@/lib/templates'
import { PlantillaPreview } from '@/components/PlantillaPreview'
import { getErrorMessage } from '@/lib/utils'

interface PlantillaSectionProps {
  serverName: string
}

export function PlantillaSection({ serverName }: PlantillaSectionProps) {
  const [plantillas, setPlantillas] = useState<PlantillaServidorDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarPlantillasConDetalle()
      .then((data) => !cancelado && setPlantillas(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Plantilla</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Los canales de {serverName} salieron de una de estas plantillas. Los
        roles que se muestran acá son sugerencias de la plantilla, no se
        crean solos — armalos vos mismo desde Personas &gt; Roles. Volver a
        aplicar una plantilla completa todavía no está disponible.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      )}
      {error && (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {plantillas.map((plantilla) => (
          <div
            key={plantilla.id}
            className="rounded-xl border border-border p-4"
          >
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {plantilla.iconoDefecto && <span aria-hidden>{plantilla.iconoDefecto}</span>}
              {plantilla.nombre}
            </h2>
            {plantilla.descripcion && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plantilla.descripcion}
              </p>
            )}

            <div className="mt-3">
              <PlantillaPreview plantilla={plantilla} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
