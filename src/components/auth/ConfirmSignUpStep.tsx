import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/utils'
import { getRateLimitSeconds } from '@/lib/rate-limit'
import { useCooldown } from '@/hooks/use-cooldown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'

interface ConfirmSignUpStepProps {
  email: string
  onBack: () => void
}

export function ConfirmSignUpStep({ email, onBack }: ConfirmSignUpStepProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resendCooldown = useCooldown()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
      if (error) throw error
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } catch (err) {
      const seconds = getRateLimitSeconds(err)
      if (seconds) resendCooldown.start(seconds)
      else setError(getErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold">Confirmá tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Te enviamos un código a <strong>{email}</strong>. Ingresalo para activar tu cuenta, o tocá el
        enlace del correo.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-code">Código de confirmación</Label>
          <Input
            id="confirm-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="000000"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading || !code.trim()} className="w-full">
          {loading ? 'Confirmando…' : 'Confirmar'}
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown.secondsLeft > 0}
          className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline disabled:no-underline"
        >
          {resending
            ? 'Reenviando…'
            : resendCooldown.secondsLeft > 0
              ? `Podés reintentar en ${resendCooldown.secondsLeft}s`
              : resent
                ? 'Código reenviado ✓'
                : '¿No te llegó? Reenviar código'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
        >
          Volver
        </button>
      </div>
    </AuthCard>
  )
}
