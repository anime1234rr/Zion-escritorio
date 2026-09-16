import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

import {
  asignarRolStaff,
  listarRolesStaffUsuario,
  quitarRolStaff,
  type RolStaff,
  type TipoRolStaff,
} from '@/lib/moderation'
import { ETIQUETA_ROL_STAFF } from '@/lib/moderation-display'
import { cn, getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export interface RolStaffTarget {
  targetUserId: string
  targetUserName: string
}

interface RolStaffDialogProps {
  target: RolStaffTarget | null
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

const TIPOS: TipoRolStaff[] = ['moderador', 'frontend_dev', 'core_dev']

export function RolStaffDialog({ target, onOpenChange, onChanged }: RolStaffDialogProps) {
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
    >
      <DialogContent>
        {target && <RolStaffForm target={target} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  )
}

function RolStaffForm({
  target,
  onChanged,
}: {
  target: RolStaffTarget
  onChanged: () => void
}) {
  const [roles, setRoles] = useState<RolStaff[] | null>(null)
  const [tipo, setTipo] = useState<TipoRolStaff>('moderador')
  const [gestionarSanciones, setGestionarSanciones] = useState(true)
  const [verHistorial, setVerHistorial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function seleccionarTipo(opcion: TipoRolStaff) {
    setTipo(opcion)
    const esModerador = opcion === 'moderador'
    setGestionarSanciones(esModerador)
    setVerHistorial(esModerador)
  }

  useEffect(() => {
    listarRolesStaffUsuario(target.targetUserId)
      .then(setRoles)
      .catch((err) => setError(getErrorMessage(err)))
  }, [target.targetUserId])

  async function recargar() {
    try {
      setRoles(await listarRolesStaffUsuario(target.targetUserId))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleAsignar() {
    setLoading(true)
    setError(null)
    try {
      await asignarRolStaff(target.targetUserId, tipo, {
        gestionar_sanciones: gestionarSanciones,
        ver_historial_sanciones: verHistorial,
      })
      await recargar()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleQuitar(rolTipo: TipoRolStaff) {
    setError(null)
    try {
      await quitarRolStaff(target.targetUserId, rolTipo)
      await recargar()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Roles de staff de {target.targetUserName}</DialogTitle>
        <DialogDescription>
          Solo el administrador de la plataforma puede otorgar o quitar roles de staff.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label>Roles actuales</Label>
        {!roles && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {roles && roles.length === 0 && (
          <p className="text-sm text-muted-foreground">Este usuario no tiene roles de staff.</p>
        )}
        {roles && roles.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {roles.map((rol) => (
              <div
                key={rol.tipo}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm font-medium text-foreground">{ETIQUETA_ROL_STAFF[rol.tipo]}</span>
                <button
                  type="button"
                  onClick={() => handleQuitar(rol.tipo)}
                  aria-label={`Quitar rol ${ETIQUETA_ROL_STAFF[rol.tipo]}`}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <Label>Otorgar un rol</Label>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => seleccionarTipo(opcion)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                tipo === opcion
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {ETIQUETA_ROL_STAFF[opcion]}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground">Puede gestionar sanciones</span>
          <Switch checked={gestionarSanciones} onCheckedChange={setGestionarSanciones} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground">Puede ver el historial de sanciones</span>
          <Switch checked={verHistorial} onCheckedChange={setVerHistorial} />
        </div>
        <p className="text-xs text-muted-foreground">
          Los roles de desarrollo no incluyen moderación por defecto. Activá estos switches solo si
          esta persona también va a moderar.
        </p>

        <Button type="button" size="sm" disabled={loading} onClick={handleAsignar} className="self-start">
          {loading ? 'Guardando…' : 'Otorgar rol'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
