import type { MentionableMember, ServerRole } from '@/lib/members'

interface MentionAutocompleteProps {
  query: string
  members: MentionableMember[]
  roles?: ServerRole[]
  onSelect: (nombre: string) => void
}

export function MentionAutocomplete({ query, members, roles = [], onSelect }: MentionAutocompleteProps) {
  const q = query.toLowerCase()

  const rolesMatch = roles
    .filter((r) => !r.esRolBase && r.nombre.toLowerCase().includes(q))
    .slice(0, 4)

  const membersMatch = members
    .filter(
      (m) =>
        m.username.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q)
    )
    .slice(0, 6)

  if (rolesMatch.length === 0 && membersMatch.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 mb-1.5 flex max-h-64 w-64 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg">
      {rolesMatch.length > 0 && (
        <>
          <p className="px-2 pt-1 pb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Roles
          </p>
          {rolesMatch.map((rol) => (
            <button
              key={rol.id}
              type="button"
              onClick={() => onSelect(rol.nombre)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: rol.color ?? '#9ca3af' }}
              />
              <span className="truncate text-sm font-medium text-foreground">@{rol.nombre}</span>
            </button>
          ))}
        </>
      )}

      {membersMatch.length > 0 && (
        <>
          {rolesMatch.length > 0 && (
            <p className="px-2 pt-1.5 pb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Personas
            </p>
          )}
          {membersMatch.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member.username)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <span className="truncate text-sm font-medium text-foreground">
                {member.displayName}
              </span>
              <span className="truncate text-xs text-muted-foreground">@{member.username}</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
