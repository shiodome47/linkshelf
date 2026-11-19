import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { useLinkShelf } from '../context'
import { useMessages } from '../i18n'
import { parseShelfData, type ShelfData } from '../backup'

/**
 * 棚の中身を JSON のファイルに書き出す・読み込む（<LinkShelf backup>）。
 * 読み込むときは「置き換える」か「足す」かを選んでもらう。閲覧専用では書き出しだけ
 */
export function BackupButton({ readOnly }: { readOnly: boolean }) {
  const m = useMessages()
  const { exportData, importData } = useLinkShelf()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ShelfData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const download = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `linkshelf-${data.exportedAt.slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      setPending(parseShelfData(JSON.parse(await file.text())))
    } catch (e) {
      setPending(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const run = async (mode: 'replace' | 'merge') => {
    if (!pending) return
    setBusy(true)
    try {
      await importData(pending, mode)
      setPending(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={download} title={m.exportData} aria-label={m.exportData}>
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{m.exportData}</span>
      </Button>
      {!readOnly && (
        <>
          <Button size="sm" onClick={() => fileInput.current?.click()} title={m.importData} aria-label={m.importData}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{m.importData}</span>
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="backup-file"
            onChange={(e) => {
              void pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </>
      )}
      <Dialog isOpen={pending !== null || error !== ''} onClose={() => (setPending(null), setError(''))} title={m.importData} size="sm">
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {m.importFailed(error)}
          </p>
        ) : (
          pending && (
            <>
              <p className="text-sm text-neutral-300">{m.importSummary(pending.categories.length, pending.links.length)}</p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button size="sm" onClick={() => setPending(null)} disabled={busy}>
                  {m.cancel}
                </Button>
                <Button size="sm" onClick={() => void run('merge')} disabled={busy}>
                  {m.importMerge}
                </Button>
                <Button size="sm" variant="danger" onClick={() => void run('replace')} disabled={busy}>
                  {m.importReplace}
                </Button>
              </div>
            </>
          )
        )}
      </Dialog>
    </>
  )
}
