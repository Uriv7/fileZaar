import { useEffect } from 'react'
import { getSupportedFormats, checkHealth } from '../services/api'
import { useStore } from '../store'
import { CONVERSION_MAP, FORMAT_META } from '../data/conversions'

// Build a complete formats object from CONVERSION_MAP (always works offline)
function buildFormatsFromMap() {
  const format_map = {}
  const categories = {
    image:    { inputs: [], outputs: [] },
    media:    { inputs: [], outputs: [] },
    document: { inputs: [], outputs: [] },
    archive:  { inputs: [], outputs: [] },
  }

  Object.entries(CONVERSION_MAP).forEach(([src, targets]) => {
    const meta = FORMAT_META[src]
    if (!meta) return
    const cat = meta.cat === 'video' || meta.cat === 'audio' ? 'media' : meta.cat
    format_map[src] = cat
    if (!categories[cat].inputs.includes(src)) categories[cat].inputs.push(src)
    targets.forEach(tgt => {
      const tmeta = FORMAT_META[tgt]
      const tcat  = tmeta
        ? (tmeta.cat === 'video' || tmeta.cat === 'audio' ? 'media' : tmeta.cat)
        : cat
      format_map[tgt] = format_map[tgt] || tcat
      if (!categories[cat].outputs.includes(tgt)) categories[cat].outputs.push(tgt)
    })
  })

  return { format_map, categories }
}

const STATIC_FORMATS = buildFormatsFromMap()

export function useFormats() {
  const { state, actions } = useStore()

  useEffect(() => {
    // Always set static formats immediately so the UI works offline
    if (!state.formats) {
      actions.setFormats(STATIC_FORMATS)
    }

    // Then try to enrich from server (non-blocking)
    getSupportedFormats()
      .then(data => { if (data) actions.setFormats(data) })
      .catch(() => { /* keep static formats */ })

    checkHealth()
      .then(actions.setHealth)
      .catch(() => actions.setHealth({ status: 'offline', tools: {} }))
  }, [])

  return state.formats || STATIC_FORMATS
}

// Used by FormatPicker — always reads from CONVERSION_MAP directly
export function getOutputFormats(ext, _formats) {
  if (!ext) return []
  const lext = ext.toLowerCase()
  const direct = CONVERSION_MAP[lext]
  if (direct && direct.length > 0) return direct
  // alias
  if (lext === 'jpeg') return CONVERSION_MAP['jpg'] || []
  if (lext === 'htm')  return CONVERSION_MAP['html'] || []
  return []
}
