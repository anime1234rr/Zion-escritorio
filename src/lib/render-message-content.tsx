import { UserProfileCard } from '@/components/UserProfileCard'
import type { MentionableMember } from '@/lib/members'
import type { ServerItem } from '@/lib/types'

const CONTENT_TOKEN_SPLIT_PATTERN =
  /(@(?:todos|aqu[ií])\b|@[a-zA-Z0-9_]{1,32}\b|:[a-zA-Z0-9_]+:)/gi
const ONLY_EMOJI_PATTERN = /^(\s*:[a-zA-Z0-9_]+:\s*)+$/
const EVERYONE_PATTERN = /^@(todos|aqu[ií])$/i

const MENTION_BASE =
  'rounded px-1 font-medium text-primary bg-primary/15 transition-colors'
const MENTION_ME =
  'rounded px-1 font-semibold text-primary-foreground bg-primary ring-1 ring-primary/40'

export interface MentionContext {
  members: MentionableMember[]
  server?: ServerItem
  currentUserId: string
  onMessageUser?: (userId: string) => void
}

export function mensajeMeMenciona(content: string, miUsername?: string): boolean {
  if (/@(todos|aqu[ií])\b/i.test(content)) return true
  if (!miUsername) return false
  const re = new RegExp(`@${miUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return re.test(content)
}

export function renderMessageContent(
  content: string,
  customEmojis: Map<string, string>,
  mention?: MentionContext
) {
  const isJumbo = ONLY_EMOJI_PATTERN.test(content)
  const parts = content.split(CONTENT_TOKEN_SPLIT_PATTERN)
  if (parts.length === 1) return content

  return parts.map((part, index) => {
    if (EVERYONE_PATTERN.test(part)) {
      return (
        <span key={index} className={MENTION_ME}>
          {part}
        </span>
      )
    }

    if (/^@[a-zA-Z0-9_]+$/i.test(part)) {
      const username = part.slice(1).toLowerCase()
      const member = mention?.members.find((m) => m.username.toLowerCase() === username)
      const esYo = Boolean(member && mention && member.id === mention.currentUserId)
      const clase = esYo ? MENTION_ME : MENTION_BASE

      if (mention && member) {
        return (
          <UserProfileCard
            key={index}
            userId={member.id}
            server={mention.server}
            currentUserId={mention.currentUserId}
            onMessageUser={mention.onMessageUser}
          >
            <button
              type="button"
              className={`${clase} outline-none hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring/50`}
            >
              {part}
            </button>
          </UserProfileCard>
        )
      }

      return (
        <span key={index} className={clase}>
          {part}
        </span>
      )
    }
    const emojiMatch = /^:([a-zA-Z0-9_]+):$/.exec(part)
    const emojiUrl = emojiMatch ? customEmojis.get(emojiMatch[1]) : undefined
    if (emojiUrl) {
      return (
        <img
          key={index}
          src={emojiUrl}
          alt={part}
          title={part}
          className={
            isJumbo
              ? 'inline-block size-16 align-middle object-contain'
              : 'inline-block size-5 -translate-y-0.5 align-middle object-contain'
          }
        />
      )
    }
    return <span key={index}>{part}</span>
  })
}
