import { useState } from 'react'

import { PRIVACIDAD, TERMINOS, type BloqueLegal, type DocumentoLegal } from '@/lib/legal-content'
import { cn } from '@/lib/utils'

type Tab = 'terminos' | 'privacidad'

export function TerminosPrivacidadSection() {
  const [tab, setTab] = useState<Tab>('terminos')
  const documento = tab === 'terminos' ? TERMINOS : PRIVACIDAD

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Términos y Privacidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Las condiciones de uso y la política de privacidad de Zion, para escritorio, móvil y la web.
        Última actualización: {documento.actualizado}.
      </p>

      <div className="mt-5 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <TabButton activo={tab === 'terminos'} onClick={() => setTab('terminos')}>
          Términos de servicio
        </TabButton>
        <TabButton activo={tab === 'privacidad'} onClick={() => setTab('privacidad')}>
          Privacidad
        </TabButton>
      </div>

      <Documento key={tab} documento={documento} />
    </div>
  )
}

function TabButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        activo ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function Documento({ documento }: { documento: DocumentoLegal }) {
  return (
    <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
      <div className="flex flex-col gap-2">
        {documento.intro.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
      </div>

      <nav className="rounded-lg border border-border p-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contenido</p>
        <ol className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {documento.secciones.map((seccion, index) => (
            <li key={seccion.id}>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`legal-${seccion.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="text-left text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:underline"
              >
                {index + 1}. {seccion.titulo}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {documento.secciones.map((seccion, index) => (
        <section key={seccion.id} id={`legal-${seccion.id}`} className="scroll-mt-4">
          <h2 className="text-sm font-semibold text-foreground">
            {index + 1}. {seccion.titulo}
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {seccion.bloques.map((bloque, i) => (
              <Bloque key={i} bloque={bloque} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Bloque({ bloque }: { bloque: BloqueLegal }) {
  if (bloque.tipo === 'p') return <p>{bloque.texto}</p>
  return (
    <ul className="ml-4 flex list-disc flex-col gap-1">
      {bloque.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
