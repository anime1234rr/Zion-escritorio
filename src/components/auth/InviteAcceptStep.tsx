import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'

export function InviteAcceptStep({ onBack }: { onBack: () => void }) {
  const { user, pendingAuthAction, setPendingAuthAction } = useAuth()
  const sessionReady = user !== null
  const initialEmail = pendingAuthAction?.type === 'invite' ? (pendingAuthAction.email ?? '') : ''

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    (sessionReady || (email.trim() && code.trim())) && password.length >= 6 && password === confirmPassword

  async function handleAccept(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    setPendingAuthAction({ type: 'invite', email: email.trim() || undefined })

    try {
      if (!sessionReady) {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: 'invite',
        })
        if (error) throw error
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setPendingAuthAction(null)
    } catch (err) {
      setError(getErrorMessage(err))
      if (!sessionReady) setPendingAuthAction(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold">Aceptar invitación</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {sessionReady
          ? 'Te invitaron a Zion. Establecé una contraseña para tu cuenta.'
          : 'Ingresá el correo y el código de invitación que recibiste, y elegí tu contraseña.'}
      </p>

      <form onSubmit={handleAccept} className="mt-6 flex flex-col gap-4">
        {!sessionReady && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Correo</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-code">Código de invitación</Label>
              <Input
                id="invite-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="000000"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-password">Contraseña</Label>
          <Input
            id="invite-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-confirm-password">Confirmar contraseña</Label>
          <Input
            id="invite-confirm-password"
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

        <Button type="submit" disabled={loading || !canSubmit} className="w-full">
          {loading ? 'Procesando…' : 'Aceptar y entrar'}
        </Button>
      </form>

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
