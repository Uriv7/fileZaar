import { useState, useRef } from 'react'
import { AdSlot } from '../components/AdSlot'
import { Link, useParams, Navigate } from 'react-router-dom'
import { DropZone } from '../components/DropZone'
import { FileStager } from '../components/FileStager'
import { ConversionQueue } from '../components/ConversionQueue'
import { SEOHead } from '../seo/SEOHead'
import { getConversionContent, getRelatedConversions, CONVERSION_MAP, FORMAT_META } from '../data/conversions'
import { useFormats } from '../hooks/useFormats'

export default function ConvertPage() {
  const { slug } = useParams()
  const [staged, setStaged] = useState([])
  const converterRef = useRef(null)
  useFormats()

  const parts = slug?.match(/^(.+)-to-(.+)$/)
  if (!parts) return <Navigate to="/" replace />
  const [, from, to] = parts

  const validTargets = CONVERSION_MAP[from] || []
  if (!validTargets.includes(to)) {
    return (
      <div className="fz-error-page">
        <h1>Conversion not supported</h1>
        <p>FileZaar doesn't support <strong>.{from}</strong> → <strong>.{to}</strong> yet.</p>
        <Link to="/" className="fz-btn fz-btn--primary" style={{ marginTop:'1.5rem' }}>← Back to FileZaar</Link>
      </div>
    )
  }

  const content = getConversionContent(from, to)
  const related  = getRelatedConversions(from, to)
  const scroll   = () => converterRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })
  const engineMap = {
    image: 'Pillow (Python Imaging Library)',
    document: 'Pandoc + WeasyPrint',
    media: 'FFmpeg',
    archive: 'Python zipfile / py7zr',
  }
  const engine = engineMap[content.fromMeta.cat] || 'native engine'

  const STEPS = [
    { n:'1', title:`Drop your .${from.toUpperCase()} file`, desc:`Drag & drop your ${content.fromMeta.fullName} onto the FileZaar converter below, or click to browse your computer.` },
    { n:'2', title:`Select .${to.toUpperCase()} as output`,  desc:`${content.toMeta.label} will be pre-selected. Confirm your format and click Convert.` },
    { n:'3', title:'FileZaar converts securely on our server', desc:`Your file is processed using ${engine}. Files are deleted immediately after conversion.` },
    { n:'4', title:'Download your converted file',           desc:`Your ${content.toMeta.fullName} is ready in seconds. Click Download — it's yours to keep.` },
  ]

  const FAQS = [
    { q:`Is FileZaar's ${from.toUpperCase()} to ${to.toUpperCase()} converter free?`,    a:`Yes. FileZaar is completely free. No account, no watermarks, no file size limits. Always free.` },
    { q:`Is my ${from.toUpperCase()} file safe on FileZaar?`,                            a:`Your ${content.fromMeta.fullName} files are processed on our secure server and deleted immediately after your download. We never store or share your files.` },
    { q:`How long does ${from.toUpperCase()} to ${to.toUpperCase()} conversion take?`,   a:`Usually seconds. Large video or audio files may take a minute. Our server handles all processing — your device just uploads and downloads.` },
    { q:`Can I batch convert multiple ${from.toUpperCase()} files at once on FileZaar?`, a:`Yes — drop multiple files at once. Each converts in parallel with its own live progress bar.` },
    { q:`What is the maximum file size on FileZaar?`,                                    a:`FileZaar supports up to 2 GB per file. Server-side processing means you only need a good internet connection — not a powerful device.` },
    { q:`Is FileZaar free to use?`,                                                   a:`Yes, completely free. No account, no subscription, no limits on format conversions.` },
  ]

  const pageTitle = `Convert ${content.fromMeta.label} to ${content.toMeta.label} Online Free | FileZaar`
  const pageDesc  = `Convert ${content.fromMeta.fullName} to ${content.toMeta.fullName} online for free with FileZaar. No account needed. Upload your ${content.fromMeta.label} file and download ${content.toMeta.label} in seconds. 100% secure.`

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        keywords={`${from} to ${to}, convert ${from} to ${to} online free, ${from} ${to} converter, FileZaar`}
        canonical={`https://filezaar.com/convert/${slug}`}
        ogTitle={`Convert ${content.fromMeta.label} to ${content.toMeta.label} Free | FileZaar`}
        ogDesc={`Free, instant ${content.fromMeta.label} to ${content.toMeta.label} conversion. No signup — FileZaar.`}
        from={from} to={to}
        fromLabel={content.fromMeta.label}
        toLabel={content.toMeta.label}
      />

      {/* HERO */}
      <section className="fz-convert-hero">
        <div className="fz-inner">
          <nav className="fz-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">FileZaar</Link>
            <span>›</span>
            <Link to={`/#formats`}>{content.fromMeta.cat}</Link>
            <span>›</span>
            <span>{content.fromMeta.label} to {content.toMeta.label} Converter</span>
          </nav>
          <div className="fz-convert-hero__badge">
            <span className="fz-badge-dot" /> Free · Offline · Instant · No Upload
          </div>
          <h1 className="fz-convert-hero__h1">
            {content.fromMeta.emoji} {content.fromMeta.label}
            <span className="fz-convert-hero__arrow"> → </span>
            {content.toMeta.emoji} {content.toMeta.label}
            {' '}<span className="fz-convert-hero__sub-h1">Converter</span>
          </h1>
          <p className="fz-convert-hero__intro">{content.intro}</p>
          <div className="fz-convert-hero__btns">
            <button className="fz-btn fz-btn--primary fz-btn--xl" onClick={scroll}>
              ⚡ Convert {content.fromMeta.label} to {content.toMeta.label} — Free on FileZaar
            </button>
          </div>
          <div className="fz-convert-hero__chips">
            {content.benefits.map(b => <span key={b} className="fz-benefit-chip">✓ {b}</span>)}
          </div>
        </div>
      </section>

      {/* CONVERTER */}
      <section ref={converterRef} className="fz-section fz-converter-section">
        <div className="fz-inner">
          <div className="fz-converter-wrap">
            {staged.length === 0
              ? <DropZone onFiles={f => setStaged(p => [...p,...f])} />
              : <FileStager stagedFiles={staged} onClear={() => setStaged([])} defaultFormat={to} />
            }
          </div>
          <ConversionQueue />
        </div>
      </section>

      {/* HOW TO */}
      {/* Ad — after converter */}
      <AdSlot slot="3333333333" format="auto" />

      <section className="fz-section fz-how-section">
        <div className="fz-inner fz-inner--narrow">
          <div className="fz-section__label">Step by Step</div>
          <h2 className="fz-section__h2">How to convert {content.fromMeta.label} to {content.toMeta.label} on FileZaar</h2>
          <div className="fz-convert-steps">
            {STEPS.map(s => (
              <div key={s.n} className="fz-convert-step">
                <div className="fz-convert-step__n">{s.n}</div>
                <div>
                  <h3 className="fz-convert-step__title">{s.title}</h3>
                  <p className="fz-convert-step__desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="fz-section fz-usecase-section">
        <div className="fz-inner fz-inner--narrow">
          <div className="fz-section__label">Use Cases</div>
          <h2 className="fz-section__h2">Why convert {content.fromMeta.label} to {content.toMeta.label}?</h2>
          <div className="fz-usecase-card">
            <div className="fz-usecase-card__icon">{content.toMeta.emoji}</div>
            <p className="fz-usecase-card__text">{content.useCases}</p>
          </div>
          <div className="fz-benefit-list">
            {content.benefits.map(b => (
              <div key={b} className="fz-benefit-row">
                <span className="fz-benefit-row__check">✓</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED */}
      <section className="fz-section fz-related-section">
        <div className="fz-inner">
          <div className="fz-section__label">Related Tools on FileZaar</div>
          <h2 className="fz-section__h2">More converters you might need</h2>
          {related.sameInput.length > 0 && (
            <div className="fz-related-group">
              <h3 className="fz-related-group__title">Convert {content.fromMeta.label} to other formats on FileZaar</h3>
              <div className="fz-related-cards">
                {related.sameInput.map(r => {
                  const tm = FORMAT_META[r.to] || { label:r.to.toUpperCase(), emoji:'📁' }
                  return (
                    <Link key={r.slug} to={`/convert/${r.slug}`} className="fz-related-card">
                      <span>{content.fromMeta.emoji} {content.fromMeta.label} → {tm.emoji} {tm.label}</span>
                      <span className="fz-related-card__arrow">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          {related.sameOutput.length > 0 && (
            <div className="fz-related-group" style={{ marginTop:'1.75rem' }}>
              <h3 className="fz-related-group__title">Convert other formats to {content.toMeta.label} on FileZaar</h3>
              <div className="fz-related-cards">
                {related.sameOutput.map(r => {
                  const fm = FORMAT_META[r.from] || { label:r.from.toUpperCase(), emoji:'📁' }
                  return (
                    <Link key={r.slug} to={`/convert/${r.slug}`} className="fz-related-card">
                      <span>{fm.emoji} {fm.label} → {content.toMeta.emoji} {content.toMeta.label}</span>
                      <span className="fz-related-card__arrow">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      {/* Ad — before FAQ */}
      <AdSlot slot="4444444444" format="auto" />

      <section className="fz-section fz-faq-section">
        <div className="fz-inner fz-inner--narrow">
          <div className="fz-section__label">FAQ</div>
          <h2 className="fz-section__h2">{content.fromMeta.label} to {content.toMeta.label} on FileZaar — Questions</h2>
          <div className="fz-faq-list">
            {FAQS.map(f => (
              <details key={f.q} className="fz-faq">
                <summary className="fz-faq__q">{f.q}</summary>
                <p className="fz-faq__a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
