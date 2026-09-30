import { useCallback, useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, ShieldCheck, Trash2 } from 'lucide-react'

import {
  actualizarPreferenciasNotificacionSeguridad,
  obtenerPreferenciasNotificacionSeguridad,
  type SecurityNotificationPrefs,
} from '@/lib/profiles'
import {
  confirmarEnrolamientoMfa,
  iniciarEnrolamientoMfa,
  listarFactoresMfa,
  quitarFactorMfa,
  type MfaEnrollment,
  type MfaFactor,
} from '@/lib/mfa'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { requireReauth } from '@/lib/reauth-gate'
import { writeClipboard } from '@/lib/electron-bridge'
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

  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [mfaLoading, setMfaLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<MfaEnrollment | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

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

  const cargarMfa = useCallback(() => {
    listarFactoresMfa()
      .then(setFactors)
      .catch(() => setFactors([]))
      .finally(() => setMfaLoading(false))
  }, [])

  useEffect(() => {
    cargarMfa()
  }, [cargarMfa])

  async function empezarMfa() {
    setMfaError(null)
    setMfaBusy(true)
    try {
      setEnrolling(await iniciarEnrolamientoMfa('Zion escritorio'))
      setMfaCode('')
    } catch (err) {
      setMfaError(getErrorMessage(err))
    } finally {
      setMfaBusy(false)
    }
  }

  async function cancelarEnrolamiento() {
    const pendiente = enrolling
    setEnrolling(null)
    setMfaCode('')
    if (pendiente) {
      await quitarFactorMfa(pendiente.factorId).catch(() => {})
    }
  }

  async function confirmarMfa() {
    if (!enrolling || mfaCode.trim().length < 6) return
    setMfaError(null)
    setMfaBusy(true)
    try {
      await confirmarEnrolamientoMfa(enrolling.factorId, mfaCode)
      setEnrolling(null)
      cargarMfa()
    } catch (err) {
      setMfaError(getErrorMessage(err))
    } finally {
      setMfaBusy(false)
    }
  }

  async function quitarMfa(factor: MfaFactor) {
    try {
      await quitarFactorMfa(factor.id)
      cargarMfa()
    } catch (err) {
      setMfaError(getErrorMessage(err))
    }
  }

  async function copiarSecreto() {
    if (!enrolling) return
    await writeClipboard(enrolling.secret).catch(() => {})
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  const factoresActivos = factors.filter((f) => f.status === 'verified')

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

      <h1 className="mt-8 text-lg font-semibold text-foreground">Verificación en dos pasos (TOTP)</h1>

      {mfaLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>
      ) : enrolling ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">
            Agregá esta clave a tu app de autenticación (Google Authenticator, Authy, 1Password…) y
            después ingresá el código de 6 dígitos.
          </p>
          <button
            type="button"
            onClick={copiarSecreto}
            className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate font-mono text-sm text-foreground">{enrolling.secret}</span>
            <Copy className="size-4 shrink-0 text-muted-foreground" />
          </button>
          {secretCopied && <p className="text-xs text-muted-foreground">Copiado ✓</p>}
          <Input
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
          />
          {mfaError && (
            <p className="text-sm text-destructive" role="alert">
              {mfaError}
            </p>
          )}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={cancelarEnrolamiento}
              disabled={mfaBusy}
              className="text-sm text-muted-foreground outline-none hover:text-foreground"
            >
              Cancelar
            </button>
            <Button
              type="button"
              size="sm"
              disabled={mfaCode.trim().length < 6 || mfaBusy}
              onClick={confirmarMfa}
            >
              {mfaBusy ? 'Verificando…' : 'Activar'}
            </Button>
          </div>
        </div>
      ) : factoresActivos.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {factoresActivos.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center gap-2 rounded-lg border border-border p-3"
            >
              <ShieldCheck className="size-4.5 shrink-0 text-online" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {factor.friendlyName || 'App de autenticación'}
              </p>
              <button
                type="button"
                onClick={() => quitarMfa(factor)}
                aria-label="Quitar verificación en dos pasos"
                className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {mfaError && (
            <p className="text-sm text-destructive" role="alert">
              {mfaError}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Sumá una capa extra pidiendo un código de tu app de autenticación al iniciar sesión.
          </p>
          {mfaError && (
            <p className="text-sm text-destructive" role="alert">
              {mfaError}
            </p>
          )}
          <Button type="button" size="sm" className="self-start" disabled={mfaBusy} onClick={empezarMfa}>
            Activar verificación en dos pasos
          </Button>
        </div>
      )}

      <ChangeEmailDialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen} />
    </div>
  )
}
