/**
 * 見本のページの画像の置き場（このブラウザの IndexedDB）。
 * linkshelf の uploadImage / loadImage に渡す。画像はほかの端末やほかの人には見えない。
 * リンクの URL は「このページの /local-images/<id>.<拡張子>」にしておき、読むときに IndexedDB から取り出す。
 */

const DB_NAME = 'linkshelf-example-images'
const STORE = 'images'
const PREFIX = '/local-images/'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** 画像をこのブラウザに置いて、その URL を返す */
export async function saveLocalImage(file: File): Promise<{ url: string }> {
  if (file.size > 10 * 1024 * 1024) throw new Error('10MB まで / up to 10MB')
  const id = crypto.randomUUID()
  await run('readwrite', (s) => s.put(file, id))
  return { url: `${PREFIX}${id}.${EXT[file.type] ?? 'img'}` }
}

/** このブラウザに置いた画像なら取り出す。それ以外の画像は URL のまま読む */
export async function loadLocalImage(url: string): Promise<Blob | string> {
  const path = new URL(url, location.href).pathname
  if (!path.startsWith(PREFIX)) return url
  const id = path.slice(PREFIX.length).replace(/\.[^.]*$/, '')
  const blob = await run<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>)
  if (!blob) throw new Error('この画像は、別のブラウザで置いたものです / This image was added in another browser')
  return blob
}
