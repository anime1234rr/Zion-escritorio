import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/utils'
import { getRateLimitSeconds } from '@/lib/rate-limit'
import { useCooldown } from '@/hooks/use-cooldown'
import { AUTH_CALLBACK_URL } from '@/lib/auth-deep-links'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'

type Step = 'request' | 'confirm'

export function ResetPasswordFlow({ onBack }: { onBack: () => void }) {
  const { user, pendingAuthAction, setPendingAuthAction } = useAuth()
  const sessionReady = user !== null
  const initialEmail = pendingAuthAction?.type === 'recovery' ? (pendingAuthAction.email ?? '') : ''

  const [step, setStep] = useState<Step>(sessionReady ? 'confirm' : 'request')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestCooldown = useCooldown()

  async function sendResetEmail() {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: AUTH_CALLBACK_URL,
      })
      if (error) throw error
      setStep('confirm')
    } catch (err) {
      const seconds = getRateLimitSeconds(err)
      if (seconds) requestCooldown.start(seconds)
      else setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleRequest(event: React.FormEvent) {
    event.preventDefault()
    sendResetEmail()
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    setPendingAuthAction({ type: 'recovery', email: email.trim() || undefined })

    try {
      if (!sessionReady) {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: 'recovery',
        })
        if (error) throw error
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPendingAuthAction(null)
    } catch (err) {
      setError(getErrorMessage(err))
      if (!sessionReady) setPendingAuthAction(null)
    } finally {
      setLoading(false)
    }
  }

  const canConfirm =
    (sessionReady || (email.trim() && code.trim())) &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold">
        {step === 'request' ? 'Recuperar contraseña' : 'Nueva contraseña'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {step === 'request'
          ? 'Ingresá tu correo y te enviamos un enlace y un código para restablecer tu contraseña.'
          : sessionReady
            ? 'Elegí una nueva contraseña para tu cuenta.'
            : 'Ingresá el código que te llegó por correo junto con tu nueva contraseña.'}
      </p>

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-email">Correo</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !email.trim() || requestCooldown.secondsLeft > 0}
            className="w-full"
          >
            {loading
              ? 'Enviando…'
              : requestCooldown.secondsLeft > 0
                ? `Podés reintentar en ${requestCooldown.secondsLeft}s`
                : 'Enviar instrucciones'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="mt-6 flex flex-col gap-4">
          {!sessionReady && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-confirm-email">Correo</Label>
                <Input
                  id="reset-confirm-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-code">Código</Label>
                <Input
                  id="reset-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                />
              </div>
              <button
                type="button"
                onClick={sendResetEmail}
                disabled={loading || requestCooldown.secondsLeft > 0}
                className="self-start text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline disabled:no-underline"
              >
                {requestCooldown.secondsLeft > 0
                  ? `Podés reintentar en ${requestCooldown.secondsLeft}s`
                  : '¿No te llegó? Reenviar código'}
              </button>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-new-password">Nueva contraseña</Label>
            <Input
              id="reset-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-confirm-password">Confirmar contraseña</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading || !canConfirm} className="w-full">
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
        </form>
      )}

      {!sessionReady && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
        >
          Volver
        </button>
      )}
    </AuthCard>
  )
}
