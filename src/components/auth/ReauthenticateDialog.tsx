import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { useReauthRequest, resolveReauth } from '@/lib/reauth-gate'
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

export function ReauthenticateDialog() {
  const request = useReauthRequest()

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) resolveReauth(null)
      }}
    >
      <DialogContent>
        {request && <ReauthenticateForm key={request.id} reason={request.reason} />}
      </DialogContent>
    </Dialog>
  )
}

function ReauthenticateForm({ reason }: { reason: string }) {
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { secondsLeft: cooldownLeft, start: startCooldown } = useCooldown()

  const performSend = useCallback(() => {
    return supabase.auth
      .reauthenticate()
      .then(({ error }) => {
        if (!error) return
        const seconds = getRateLimitSeconds(error)
        if (seconds) startCooldown(seconds)
        else setError(getErrorMessage(error))
      })
      .finally(() => setSending(false))
  }, [startCooldown])

  useEffect(() => {
    performSend()
  }, [performSend])

  function handleResend() {
    setSending(true)
    setError(null)
    performSend()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirmá que sos vos</DialogTitle>
        <DialogDescription>{reason}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reauth-code">Código de verificación</Label>
        <Input
          id="reauth-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="000000"
          disabled={sending}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {sending
            ? 'Enviando un código de verificación por correo…'
            : 'Te enviamos un código de verificación por correo. Ingresalo para continuar.'}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending || cooldownLeft > 0}
          className="self-start text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline disabled:no-underline"
        >
          {cooldownLeft > 0 ? `Podés reenviarlo en ${cooldownLeft}s` : 'Reenviar código'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => resolveReauth(null)}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={sending || !code.trim()}
          onClick={() => resolveReauth(code.trim())}
        >
          Confirmar identidad
        </Button>
      </DialogFooter>
    </>
  )
}
