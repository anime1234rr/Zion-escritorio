import { app, ipcMain, net, protocol, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SCHEME = 'zion-media'

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

const MAX_BYTES = 100 * 1024 * 1024
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/

let mediaDir = ''

function getMediaDir(): string {
  if (!mediaDir) mediaDir = path.join(app.getPath('userData'), 'media')
  return mediaDir
}

async function ensureMediaDir(): Promise<string> {
  const dir = getMediaDir()
  await mkdir(dir, { recursive: true })
  return dir
}

function rutaSegura(id: string): string | null {
  if (!ID_RE.test(id)) return null
  const dir = getMediaDir()
  const full = path.join(dir, id)
  if (full !== path.normalize(full) || path.dirname(full) !== dir) return null
  return full
}

export function registerLocalMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: true,
      },
    },
  ])
}

export function setupLocalMedia(): void {
  void ensureMediaDir()

  protocol.handle(SCHEME, async (request) => {
    const id = decodeURIComponent(new URL(request.url).hostname)
    const full = rutaSegura(id)
    if (!full) return new Response('id inválido', { status: 400 })

    try {
      const range = request.headers.get('range')
      const res = await net.fetch(pathToFileURL(full).toString(), {
        headers: range ? { Range: range } : undefined,
      })
      if (res.headers.get('content-type')) return res

      const ext = id.split('.').pop() ?? ''
      const headers = new Headers(res.headers)
      headers.set('content-type', EXT_MIME[ext] ?? 'application/octet-stream')
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
    } catch {
      return new Response('no encontrado', { status: 404 })
    }
  })

  ipcMain.handle(
    'zion:media-save',
    async (_event, payload: { bytes: Uint8Array; ext: string }) => {
      const ext = String(payload?.ext ?? '').toLowerCase()
      if (!EXT_MIME[ext]) throw new Error(`Extensión no permitida: ${ext || '(vacía)'}`)

      const bytes = payload.bytes
      if (!(bytes instanceof Uint8Array)) throw new Error('Datos de archivo inválidos.')
      if (bytes.byteLength === 0) throw new Error('El archivo está vacío.')
      if (bytes.byteLength > MAX_BYTES) {
        throw new Error(`El archivo no puede pesar más de ${MAX_BYTES / 1024 / 1024} MB.`)
      }

      const dir = await ensureMediaDir()
      const id = `${randomUUID()}.${ext}`
      await writeFile(path.join(dir, id), bytes)
      return id
    }
  )

  ipcMain.handle('zion:media-delete', async (_event, id: string) => {
    const full = rutaSegura(String(id ?? ''))
    if (!full) return
    await rm(full, { force: true })
  })

  ipcMain.handle('zion:media-usage', async () => {
    const dir = await ensureMediaDir()
    let count = 0
    let bytes = 0
    for (const nombre of await readdir(dir)) {
      if (!ID_RE.test(nombre)) continue
      try {
        const info = await stat(path.join(dir, nombre))
        if (info.isFile()) {
          count += 1
          bytes += info.size
        }
      } catch {
        continue
      }
    }
    return { count, bytes }
  })

  ipcMain.on('zion:media-open-folder', () => {
    void ensureMediaDir().then((dir) => shell.openPath(dir))
  })
}
