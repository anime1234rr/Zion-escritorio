import type { PersistAdapter } from './persist-adapter'

const DB_NAME = 'zion-local-cache'
const DB_VERSION = 1
const STORE_NAME = 'kv'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
    request.onblocked = () => {
      dbPromise = null
      reject(new Error('La base local de caché está bloqueada por otra pestaña.'))
    }
  })
  return dbPromise
}

function fullKey(namespace: string, key: string): string {
  return `${namespace}::${key}`
}

const UPPER_BOUND = String.fromCharCode(0xffff)

function prefixRange(namespace: string): IDBKeyRange {
  const prefix = `${namespace}::`
  return IDBKeyRange.bound(prefix, prefix + UPPER_BOUND, false, false)
}

export const indexedDbAdapter: PersistAdapter = {
  async getAll(namespace) {
    try {
      const db = await openDb()
      const prefix = `${namespace}::`
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const result: Record<string, unknown> = {}
        const cursorRequest = store.openCursor(prefixRange(namespace))
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result
          if (!cursor) {
            resolve(result)
            return
          }
          result[String(cursor.key).slice(prefix.length)] = cursor.value
          cursor.continue()
        }
        cursorRequest.onerror = () => reject(cursorRequest.error)
      })
    } catch {
      return {}
    }
  },

  async set(namespace, key, value) {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(value, fullKey(namespace, key))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      return
    }
  },

  async delete(namespace, key) {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(fullKey(namespace, key))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      return
    }
  },

  async clear(namespace) {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(prefixRange(namespace))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      return
    }
  },
}
