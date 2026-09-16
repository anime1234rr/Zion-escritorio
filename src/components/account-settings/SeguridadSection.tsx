import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import {
  actualizarPreferenciasNotificacionSeguridad,
  obtenerPreferenciasNotificacionSeguridad,
  type SecurityNotificationPrefs,
} from '@/lib/profiles'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { requireReauth } from '@/lib/reauth-gate'
import { getErrorMessage } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChangeEmailDialog } from '@/components/auth/ChangeEmailDialog'

interface SeguridadSectionProps {
  userId: string
}

const OPCIONES: {
  clave: keyof SecurityNotificationPrefs
  label: string
  description: string
}[] = [
  {
    clave: 'cambioContrasena',
    label: 'Contraseña cambiada',
    description: 'Notificar a los usuarios cuando su contraseña haya cambiado.',
  },
  {
    clave: 'cambioEmail',
    label: 'Dirección de correo electrónico cambiada',
    description:
      'Notificar a los usuarios cuando su dirección de correo electrónico haya cambiado.',
  },
  {
    clave: 'cambioTelefono',
    label: 'Número de teléfono cambiado',
    description: 'Notificar a los usuarios cuando su número de teléfono haya cambiado.',
  },
  {
    clave: 'metodoLoginVinculado',
    label: 'Método de inicio de sesión vinculado',
    description:
      'Notificar a los usuarios cuando un método de inicio de sesión se ha vinculado a su cuenta.',
  },
  {
    clave: 'metodoLoginEliminado',
    label: 'Se eliminó el método de inicio de sesión',
    description:
      'Notificar a los usuarios cuando se haya eliminado un método de inicio de sesión de su cuenta.',
  },
  {
    clave: 'mfaAgregado',
    label: 'Se agregó el método MFA',
    description: 'Notificar a los usuarios cuando se haya agregado un método MFA a su cuenta.',
  },
  {
    clave: 'mfaEliminado',
    label: 'Se eliminó el método MFA',
    description: 'Notificar a los usuarios cuando se haya eliminado un método MFA de su cuenta.',
  },
]

export function SeguridadSection({ userId }: SeguridadSectionProps) {
  const { user } = useAuth()
  const [saved, setSaved] = useState<SecurityNotificationPrefs | null>(null)
  const [draft, setDraft] = useState<SecurityNotificationPrefs | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [changeEmailOpen, setChangeEmailOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordChanged, setPasswordChanged] = useState(false)

  useEffect(() => {
    let cancelado = false
    obtenerPreferenciasNotificacionSeguridad(userId)
      .then((data) => {
        if (cancelado) return
        setSaved(data)
        setDraft(data)
      })
      .catch((err) => !cancelado && setLoadError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [userId])

  const isDirty =
    !!saved && !!draft && OPCIONES.some((opcion) => saved[opcion.clave] !== draft[opcion.clave])

  function handleToggle(clave: keyof SecurityNotificationPrefs, checked: boolean) {
    setDraft((prev) => (prev ? { ...prev, [clave]: checked } : prev))
  }

  async function handleSave() {
    if (!saved || !draft) return
    const cambios: Partial<SecurityNotificationPrefs> = {}
    for (const opcion of OPCIONES) {
      if (saved[opcion.clave] !== draft[opcion.clave]) cambios[opcion.clave] = draft[opcion.clave]
    }
    if (Object.keys(cambios).length === 0) return

    setSaving(true)
    try {
      await actualizarPreferenciasNotificacionSeguridad(userId, cambios)
      setSaved(draft)
    } catch (err) {
      setLoadError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    const nonce = await requireReauth('Para cambiar tu contraseña, primero confirmá tu identidad.')
    if (nonce === null) return

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword, nonce })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChanged(true)
      setTimeout(() => setPasswordChanged(false), 3000)
    } catch (err) {
      setPasswordError(getErrorMessage(err))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Cuenta</h1>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Correo electrónico</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user?.email ?? '—'}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setChangeEmailOpen(true)}>
            Cambiar correo
          </Button>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">Cambiar contraseña</p>
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  className="pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive" role="alert">
                {passwordError}
              </p>
            )}
            <Button
              type="button"
              size="sm"
              className="self-start"
              disabled={changingPassword || !newPassword || !confirmPassword}
              onClick={handleChangePassword}
            >
              {changingPassword
                ? 'Cambiando…'
                : passwordChanged
                  ? 'Contraseña actualizada ✓'
                  : 'Cambiar contraseña'}
            </Button>
          </div>
        </div>
      </div>

      <h1 className="mt-8 text-lg font-semibold text-foreground">Notificaciones de seguridad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elegí sobre qué eventos de seguridad de tu cuenta querés recibir una notificación.
      </p>

      {loadError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}
      {!draft && !loadError && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

      {draft && (
        <div className="mt-5 flex flex-col gap-4">
          {OPCIONES.map((opcion) => (
            <div key={opcion.clave} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{opcion.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{opcion.description}</p>
              </div>
              <Switch
                checked={draft[opcion.clave]}
                onCheckedChange={(checked) => handleToggle(opcion.clave, checked)}
                className="mt-0.5 shrink-0"
              />
            </div>
          ))}

          <Button type="button" className="mt-2 self-start" disabled={!isDirty || saving} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      )}

      <ChangeEmailDialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen} />
    </div>
  )
}
