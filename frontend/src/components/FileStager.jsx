import { useState } from 'react'
import { FormatPicker } from './FormatPicker'
import { useConversion } from '../hooks/useConversion'

function sz(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

function emoji(n) {
  const e = n.split('.').pop()?.toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg','avif','bmp','ico','tiff'].includes(e)) return '🖼'
  if (['mp4','mkv','avi','mov','webm','flv','wmv','m4v'].includes(e)) return '🎬'
  if (['mp3','wav','flac','ogg','aac','m4a','opus','aiff'].includes(e)) return '🎵'
  if (['pdf','docx','doc','odt','txt','html','md','rtf','epub','pptx'].includes(e)) return '📄'
  if (['xlsx','xls','csv','json','xml'].includes(e)) return '📊'
  if (['zip','rar','7z','tar','gz'].includes(e)) return '📦'
  return '📁'
}

// Format-specific warnings shown before converting
const FORMAT_WARNINGS = {
  gif:  '⚠ GIF supports only 256 colours — photo images may show colour banding. Videos are capped at 10 seconds.',
  ico:  '⚠ ICO output is capped at 256×256 pixels (Windows ICO format limit).',
  bmp:  '⚠ BMP has no transparency support. Transparent areas will be filled with white.',
  jpg:  '⚠ JPEG is lossy. Transparent backgrounds will be composited onto white.',
  jpeg: '⚠ JPEG is lossy. Transparent backgrounds will be composited onto white.',
}

const LOSSY_DOC_PAIRS = new Set(['pdf→docx','pdf→txt','pdf→md'])

function getWarning(file, fmt) {
  if (!file || !fmt) return null
  const src = file.name.split('.').pop()?.toLowerCase() || ''
  const tgt = fmt.toLowerCase()
  const pair = `${src}→${tgt}`
  if (FORMAT_WARNINGS[tgt]) return FORMAT_WARNINGS[tgt]
  if (LOSSY_DOC_PAIRS.has(pair)) return '⚠ PDF text will be extracted. Complex layouts, tables, and images may not be fully preserved.'
  return null
}

export function FileStager({ stagedFiles, onClear, defaultFormat }) {
  const { convert } = useConversion()
  const [sel, setSel] = useState({})
  const [loading, setLoading] = useState(false)

  const allOk = stagedFiles.every((_, i) => sel[i])

  const go = async () => {
    setLoading(true)
    await Promise.all(
      stagedFiles.map((f, i) => sel[i] ? convert(f, sel[i]) : null).filter(Boolean)
    )
    setLoading(false)
    onClear()
  }

  return (
    <div className="fz-stager">
      <div className="fz-stager__header">
        <div>
          <h2 className="fz-stager__title">
            {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} ready
          </h2>
          <p className="fz-stager__sub">Pick an output format for each file</p>
        </div>
        <button className="fz-btn fz-btn--ghost fz-btn--sm" onClick={onClear}>✕ Cancel</button>
      </div>

      <div className="fz-stager__files">
        {stagedFiles.map((f, i) => {
          const warning = sel[i] ? getWarning(f, sel[i]) : null
          return (
            <div key={i} className="fz-stager__item">
              <div className="fz-stager__file-info">
                <div className="fz-file-icon">{emoji(f.name)}</div>
                <div>
                  <div className="fz-stager__file-name" title={f.name}>{f.name}</div>
                  <div className="fz-stager__file-meta">{sz(f.size)}</div>
                </div>
              </div>
              <FormatPicker
                file={f}
                selectedFormat={sel[i] || defaultFormat}
                onSelect={fmt => setSel(s => ({ ...s, [i]: fmt }))}
              />
              {warning && (
                <div className="fz-stager__warning">{warning}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="fz-stager__actions">
        <button
          className="fz-btn fz-btn--primary fz-btn--lg"
          disabled={!allOk || loading}
          onClick={go}
        >
          {loading ? '⏳ Starting…' : `⚡ Convert ${stagedFiles.length} file${stagedFiles.length !== 1 ? 's' : ''}`}
        </button>
        {!allOk && (
          <p className="fz-stager__hint">Select an output format for each file to continue</p>
        )}
      </div>
    </div>
  )
}
