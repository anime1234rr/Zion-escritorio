import Dexie, { type EntityTable } from 'dexie'

import type { ChatMessage } from '@/lib/types'
import type { MediaTipo } from '@/lib/media-ref'

export interface CachedChannel {
  key: string
  messages: ChatMessage[]
  updatedAt: number
}

export interface DraftRow {
  key: string
  text: string
  updatedAt: number
}

export interface LocalMediaRow {
  id: string
  tipo: MediaTipo
  mime: string
  nombre: string
  tamano: number
  uso: string
  createdAt: number
}

export interface SavedMessageRow {
  id: string
  scope: 'canal' | 'dm'
  serverId: string | null
  serverName: string | null
  channelId: string | null
  channelName: string | null
  conversationId: string | null
  authorName: string
  preview: string
  link: string | null
  savedAt: number
}

class ZionLocalDB extends Dexie {
  cachedChannels!: EntityTable<CachedChannel, 'key'>
  drafts!: EntityTable<DraftRow, 'key'>
  localMedia!: EntityTable<LocalMediaRow, 'id'>
  savedMessages!: EntityTable<SavedMessageRow, 'id'>

  constructor() {
    super('zion-local')
    this.version(1).stores({
      cachedChannels: 'key, updatedAt',
      drafts: 'key, updatedAt',
      localMedia: 'id, uso, createdAt',
    })
    this.version(2).stores({
      cachedChannels: 'key, updatedAt',
      drafts: 'key, updatedAt',
      localMedia: 'id, uso, createdAt',
      savedMessages: 'id, savedAt',
    })
  }
}

export const db = new ZionLocalDB()
