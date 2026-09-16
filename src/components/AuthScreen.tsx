import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cn, getErrorMessage } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { AUTH_CALLBACK_URL } from '@/lib/auth-deep-links'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'
import { ConfirmSignUpStep } from '@/components/auth/ConfirmSignUpStep'
import { MagicLinkStep } from '@/components/auth/MagicLinkStep'
import { ResetPasswordFlow } from '@/components/auth/ResetPasswordFlow'
import { InviteAcceptStep } from '@/components/auth/InviteAcceptStep'

type Mode = 'signin' | 'signup'
type Step = 'auth' | 'confirm-signup' | 'magic-link' | 'reset-password' | 'invite-accept'

export function AuthScreen() {
  const { pendingAuthAction } = useAuth()
  const [step, setStep] = useState<Step>('auth')
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  if (pendingAuthAction?.type === 'recovery') {
    return <ResetPasswordFlow onBack={() => setStep('auth')} />
  }
  if (pendingAuthAction?.type === 'invite') {
    return <InviteAcceptStep onBack={() => setStep('auth')} />
  }

  if (step === 'confirm-signup') {
    return <ConfirmSignUpStep email={email} onBack={() => setStep('auth')} />
  }
  if (step === 'magic-link') {
    return <MagicLinkStep onBack={() => setStep('auth')} />
  }
  if (step === 'reset-password') {
    return <ResetPasswordFlow onBack={() => setStep('auth')} />
  }
  if (step === 'invite-accept') {
    return <InviteAcceptStep onBack={() => setStep('auth')} />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const nombreUsuarioTrim = nombreUsuario.trim()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: nombreUsuarioTrim ? { nombre_usuario: nombreUsuarioTrim } : undefined,
            emailRedirectTo: AUTH_CALLBACK_URL,
          },
        })
        if (error) throw error
        if (!data.session) {
          setConfirmationSent(true)
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold">
        {mode === 'signin' ? 'Iniciar sesión en Zion' : 'Crear cuenta en Zion'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === 'signin'
          ? 'Entrá con tu correo y contraseña.'
          : 'Registrate para empezar a crear servidores.'}
      </p>

      {confirmationSent ? (
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
          Te enviamos un correo de confirmación a <strong>{email}</strong>. Tocá el enlace o
          ingresá el código que te llegó para activar tu cuenta.
          <Button type="button" className="mt-3 w-full" onClick={() => setStep('confirm-signup')}>
            Ingresar código
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre_usuario">Nombre de usuario</Label>
              <Input
                id="nombre_usuario"
                value={nombreUsuario}
                onChange={(event) => setNombreUsuario(event.target.value)}
                placeholder="opcional"
                autoComplete="username"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                className="pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Cargando…'
              : mode === 'signin'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
          </Button>

          {mode === 'signin' && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('magic-link')}
                className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
              >
                Iniciar sesión con código o enlace
              </button>
              <button
                type="button"
                onClick={() => setStep('reset-password')}
                className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <button
                type="button"
                onClick={() => setStep('invite-accept')}
                className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
              >
                Tengo una invitación
              </button>
            </div>
          )}
        </form>
      )}

      <button
        type="button"
        onClick={() => {
          setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
          setError(null)
          setConfirmationSent(false)
        }}
        className={cn(
          'mt-4 text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline'
        )}
      >
        {mode === 'signin'
          ? '¿No tenés cuenta? Creá una'
          : '¿Ya tenés cuenta? Iniciá sesión'}
      </button>
    </AuthCard>
  )
}
