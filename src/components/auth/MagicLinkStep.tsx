import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/utils'
import { getRateLimitSeconds } from '@/lib/rate-limit'
import { useCooldown } from '@/hooks/use-cooldown'
import { AUTH_CALLBACK_URL } from '@/lib/auth-deep-links'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'

type Step = 'request' | 'verify'

export function MagicLinkStep({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestCooldown = useCooldown()

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: AUTH_CALLBACK_URL },
      })
      if (error) throw error
      setStep('verify')
    } catch (err) {
      const seconds = getRateLimitSeconds(err)
      if (seconds) requestCooldown.start(seconds)
      else setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      })
      if (error) throw error
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold">Iniciar sesión sin contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {step === 'request'
          ? 'Te enviamos un enlace y un código de un solo uso a tu correo.'
          : `Ingresá el código que te llegó a ${email}, o tocá el enlace del correo.`}
      </p>

      <form onSubmit={step === 'request' ? handleRequest : handleVerify} className="mt-6 flex flex-col gap-4">
        {step === 'request' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="magic-email">Correo</Label>
            <Input
              id="magic-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="magic-code">Código</Label>
            <Input
              id="magic-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="000000"
              autoFocus
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={
            loading ||
            (step === 'request' ? !email.trim() || requestCooldown.secondsLeft > 0 : !code.trim())
          }
          className="w-full"
        >
          {loading
            ? 'Cargando…'
            : step === 'request'
              ? requestCooldown.secondsLeft > 0
                ? `Podés reintentar en ${requestCooldown.secondsLeft}s`
                : 'Enviar código'
              : 'Verificar e ingresar'}
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2">
        {step === 'verify' && (
          <button
            type="button"
            onClick={() => setStep('request')}
            className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
          >
            Usar otro correo
          </button>
        )}
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
