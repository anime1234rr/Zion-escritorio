import { Code2, FolderGit2, Palette, ScrollText } from 'lucide-react'

import { openExternal } from '@/lib/electron-bridge'

const REPO_URL = 'https://github.com/anime1234rr/zion'
const DEV_URL = 'https://github.com/anime1234rr'
const LOGO_AUTHOR_URL = 'https://github.com/Axolote90'

export function AcercaDeSection() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Acerca de</h1>
      <p className="mt-1 text-sm text-muted-foreground">Información de esta instalación de Zion.</p>

      <div className="mt-6 flex items-center gap-3 rounded-lg border border-border p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
          Z
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Zion</p>
          <p className="text-xs text-muted-foreground">Versión {__APP_VERSION__}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openExternal(`${REPO_URL}/releases`)}
          className="flex items-center gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ScrollText className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-foreground">Ver novedades y versiones anteriores</span>
        </button>
        <button
          type="button"
          onClick={() => openExternal(REPO_URL)}
          className="flex items-center gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <FolderGit2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-foreground">Repositorio en GitHub</span>
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Créditos</h2>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => openExternal(DEV_URL)}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Code2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">Desarrollo</p>
              <p className="text-xs text-muted-foreground">anime1234rr · github.com/anime1234rr</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => openExternal(LOGO_AUTHOR_URL)}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Palette className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">Logotipo</p>
              <p className="text-xs text-muted-foreground">Axolt · github.com/Axolote90</p>
            </div>
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zion. Todos los derechos reservados.
      </p>
    </div>
  )
}
