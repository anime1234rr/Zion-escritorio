import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { verificarCodigoMfa } from '@/lib/mfa'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'

export function MfaChallengeStep() {
  const { user, signOut, refreshMfa } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (code.trim().length < 6) return
    setError(null)
    setLoading(true)
    try {
      await verificarCodigoMfa(code)
      await refreshMfa()
    } catch (err) {
      setError(getErrorMessage(err))
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <ShieldCheck className="size-8 text-primary" />
      <h1 className="mt-3 text-lg font-semibold">Verificación en dos pasos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu cuenta{user?.email ? ` (${user.email})` : ''} tiene la verificación en dos pasos activada.
        Ingresá el código de 6 dígitos de tu app de autenticación para continuar.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mfa-code">Código</Label>
          <Input
            id="mfa-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading || code.trim().length < 6} className="w-full">
          {loading ? 'Verificando…' : 'Verificar'}
        </Button>
      </form>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    </AuthCard>
  )
}
