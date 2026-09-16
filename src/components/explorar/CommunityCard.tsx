import { Check, Loader2, Users } from 'lucide-react'

import type { CommunityListing } from '@/lib/explore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CommunityCardProps {
  community: CommunityListing
  joining: boolean
  onAction: () => void
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase()
}

function formatearMiembros(total: number) {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)} M`
  if (total >= 1000) return `${(total / 1000).toFixed(total >= 10_000 ? 0 : 1)} k`
  return String(total)
}

export function CommunityCard({ community, joining, onAction }: CommunityCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-primary/40">
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-primary/25 to-primary/5">
        {community.bannerUrl ? (
          <img src={community.bannerUrl} alt="" className="size-full object-cover" />
        ) : community.iconUrl ? (
          <img
            src={community.iconUrl}
            alt=""
            aria-hidden
            className="size-full scale-125 object-cover opacity-25 blur-md"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="-mt-10 flex items-end justify-between gap-2">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-secondary text-sm font-semibold text-secondary-foreground">
            {community.iconUrl ? (
              <img src={community.iconUrl} alt="" className="size-full object-cover" />
            ) : (
              iniciales(community.name)
            )}
          </div>
          <span className="flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Users className="size-3.5" />
            {formatearMiembros(community.memberCount)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{community.name}</h2>
          <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
            {community.description?.trim() || 'Esta comunidad todavía no tiene descripción.'}
          </p>
        </div>

        <Button
          variant={community.isMember ? 'outline' : 'default'}
          className={cn('w-full', !community.isMember && 'font-semibold')}
          disabled={joining}
          onClick={onAction}
        >
          {joining ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uniéndote…
            </>
          ) : community.isMember ? (
            <>
              <Check className="size-4" />
              Ya eres miembro
            </>
          ) : (
            'Unirme'
          )}
        </Button>
      </div>
    </article>
  )
}
