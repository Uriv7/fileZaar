import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { CONVERSION_MAP, FORMAT_META } from '../data/conversions'

function getOutputFormats(filename) {
  if (!filename) return []
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  // Direct lookup from CONVERSION_MAP — single source of truth
  const targets = CONVERSION_MAP[ext]
  if (targets && targets.length > 0) return targets
  // Alias: jpeg = jpg
  if (ext === 'jpeg' && CONVERSION_MAP['jpg']) return CONVERSION_MAP['jpg']
  if (ext === 'htm' && CONVERSION_MAP['html']) return CONVERSION_MAP['html']
  return []
}

function getCategoryIcon(fmt) {
  const m = FORMAT_META[fmt]
  if (!m) return ''
  if (m.cat === 'image') return '🖼'
  if (m.cat === 'audio' || m.cat === 'video') return '🎬'
  if (m.cat === 'document') return '📄'
  if (m.cat === 'archive') return '📦'
  return ''
}

export function FormatPicker({ file, onSelect, selectedFormat }) {
  const [options, setOptions] = useState([])

  useEffect(() => {
    if (!file) return
    const outs = getOutputFormats(file.name)
    setOptions(outs)
    // Auto-select first option if nothing selected yet
    if (outs.length > 0 && !selectedFormat) {
      onSelect(outs[0])
    }
  }, [file?.name])

  if (!file) return null

  const ext = file.name.split('.').pop()?.toUpperCase() || '?'

  if (options.length === 0) {
    return (
      <div className="fz-format-picker">
        <div className="fz-format-picker__row">
          <span className="fz-badge fz-badge--src">.{ext}</span>
          <span className="fz-format-arrow">→</span>
          <span className="fz-format-label">No conversions available</span>
        </div>
        <p className="fz-format-empty">
          .{ext} files are not yet supported for conversion.
          Try exporting to PDF, DOCX, or a common image format first.
        </p>
      </div>
    )
  }

  return (
    <div className="fz-format-picker">
      <div className="fz-format-picker__row">
        <span className="fz-badge fz-badge--src">.{ext}</span>
        <span className="fz-format-arrow">→</span>
        <span className="fz-format-label">Choose output:</span>
      </div>
      <div className="fz-format-grid">
        {options.map(fmt => (
          <button
            key={fmt}
            className={`fz-fmt-btn${selectedFormat === fmt ? ' fz-fmt-btn--active' : ''}`}
            onClick={() => onSelect(fmt)}
            type="button"
            title={FORMAT_META[fmt]?.fullName || fmt.toUpperCase()}
          >
            .{fmt}
          </button>
        ))}
      </div>
    </div>
  )
}
