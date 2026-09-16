import { Crown, Paintbrush, ShieldCheck, Terminal } from 'lucide-react'

import { useInsigniaUsuario, type Insignia } from '@/lib/badges'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const CONFIG: Record<Insignia, { label: string; icon: typeof Crown; className: string; filled?: boolean }> = {
  fundador: { label: 'Fundador de Zion', icon: Crown, className: 'text-idle', filled: true },
  core_dev: { label: 'Desarrollador Core', icon: Terminal, className: 'text-primary' },
  frontend_dev: { label: 'Desarrollador UI/UX', icon: Paintbrush, className: 'text-primary' },
  moderador: { label: 'Moderador', icon: ShieldCheck, className: 'text-online' },
}

interface UserBadgesProps {
  userId: string
  size?: string
}

export function UserBadges({ userId, size = 'size-3.5' }: UserBadgesProps) {
  const insignia = useInsigniaUsuario(userId)
  if (!insignia) return null

  const config = CONFIG[insignia]
  const Icon = config.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon
          className={cn(size, 'shrink-0', config.className)}
          fill={config.filled ? 'currentColor' : 'none'}
          aria-label={config.label}
        />
      </TooltipTrigger>
      <TooltipContent side="top">{config.label}</TooltipContent>
    </Tooltip>
  )
}
