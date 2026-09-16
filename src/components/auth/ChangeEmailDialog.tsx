import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { requireReauth } from '@/lib/reauth-gate'
import { getErrorMessage } from '@/lib/utils'
import { getRateLimitSeconds } from '@/lib/rate-limit'
import { useCooldown } from '@/hooks/use-cooldown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ChangeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'request' | 'confirm' | 'done'

export function ChangeEmailDialog({ open, onOpenChange }: ChangeEmailDialogProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('request')
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestCooldown = useCooldown()

  function reset() {
    setStep('request')
    setNewEmail('')
    setCode('')
    setError(null)
  }

  async function handleRequest() {
    setError(null)
    const email = newEmail.trim()
    if (!email || email === user?.email) {
      setError('Ingresá un correo distinto al actual.')
      return
    }

    const nonce = await requireReauth('Para cambiar tu correo, primero confirmá tu identidad.')
    if (nonce === null) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email, nonce })
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

  async function handleConfirm() {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail.trim(),
        token: code.trim(),
        type: 'email_change',
      })
      if (error) throw error
      setStep('done')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent>
        {step === 'done' ? (
          <>
            <DialogHeader>
              <DialogTitle>Correo actualizado</DialogTitle>
              <DialogDescription>
                Tu correo ahora es <strong>{newEmail.trim()}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{step === 'request' ? 'Cambiar tu correo' : 'Confirmá el nuevo correo'}</DialogTitle>
              <DialogDescription>
                {step === 'request'
                  ? `Correo actual: ${user?.email ?? '—'}`
                  : `Te enviamos un código a ${newEmail.trim()}. Ingresalo para confirmar el cambio.`}
              </DialogDescription>
            </DialogHeader>

            {step === 'request' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-email">Nuevo correo</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="nuevo@correo.com"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-change-code">Código de confirmación</Label>
                <Input
                  id="email-change-code"
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

            <DialogFooter>
              <Button
                type="button"
                disabled={
                  loading ||
                  (step === 'request'
                    ? !newEmail.trim() || requestCooldown.secondsLeft > 0
                    : !code.trim())
                }
                onClick={step === 'request' ? handleRequest : handleConfirm}
              >
                {loading
                  ? 'Procesando…'
                  : step === 'request'
                    ? requestCooldown.secondsLeft > 0
                      ? `Podés reintentar en ${requestCooldown.secondsLeft}s`
                      : 'Continuar'
                    : 'Confirmar cambio'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
