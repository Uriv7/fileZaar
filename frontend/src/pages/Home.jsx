import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DropZone } from '../components/DropZone'
import { FileStager } from '../components/FileStager'
import { ConversionQueue } from '../components/ConversionQueue'
import { SEOHead } from '../seo/SEOHead'
import { POPULAR_CONVERSIONS, FORMAT_CATEGORIES, CONVERSION_MAP } from '../data/conversions'
import { useStore } from '../store'

const STATS = [
  { value: '200+', label: 'Formats' },
  { value: '∞',    label: 'Conversions' },
  { value: '0',    label: 'Accounts' },
  { value: '2 GB', label: 'Max Size' },
]

const FEATURES = [
  { icon: '🔒', title: 'Files Deleted Instantly',   desc: 'Your files are processed on our secure server and permanently deleted after download. We never store, share, or read your data.' },
  { icon: '⚡', title: 'Blazing Fast',               desc: 'Native engines — FFmpeg, Pillow, Pandoc — run at full hardware speed with no middlemen, no queues, no waiting.' },
  { icon: '🌍', title: '200+ Format Pairs',          desc: 'Images, video, audio, documents, archives — every major format in every direction, all under one roof.' },
  { icon: '🆓', title: '100% Free Forever',          desc: 'No subscriptions, no watermarks, no paywalls. Unlimited conversions, zero cost, always.' },
  { icon: '📦', title: 'Batch Convert',              desc: 'Drop multiple files at once. Each job runs in parallel with real-time progress tracking.' },
  { icon: '🎯', title: 'Smart Format Detection',     desc: 'We auto-detect your file type and show only the formats that actually work — no dead ends.' },
]

const HOW = [
  { step: '01', icon: '📂', title: 'Drop your file',       desc: 'Drag & drop any file or click to browse. We auto-detect the type instantly.' },
  { step: '02', icon: '🎯', title: 'Pick a format',         desc: 'Only valid output formats are shown. No guesswork — everything listed converts successfully.' },
  { step: '03', icon: '⚙️', title: 'We convert it',        desc: 'Your file is processed securely on our server with live progress updates.' },
  { step: '04', icon: '⬇️', title: 'Download instantly',   desc: 'Full-quality output, zero watermarks, ready in seconds.' },
]

const FAQS = [
  { q: 'Is FileZaar free?',                          a: 'Yes, 100% free. No trials, no watermarks, no account — free forever.' },
  { q: 'Are my files safe?',                         a: 'Yes. Files are processed on our secure server and permanently deleted immediately after you download. We never store or share your files.' },
  { q: 'What formats are supported?',                a: 'Over 200 formats across images (PNG, JPG, WEBP, AVIF, GIF…), video (MP4, MKV, WEBM…), audio (MP3, FLAC, WAV…), documents (PDF, DOCX, EPUB…), and archives (ZIP, 7Z, TAR…).' },
  { q: 'How large can my files be?',                 a: 'Up to 2 GB per file. No artificial limits beyond that.' },
  { q: 'Can I convert multiple files at once?',      a: 'Yes — drop multiple files at once. Each gets its own format selector and runs in parallel.' },
  { q: 'Why does PDF show "No supported formats"?',  a: 'Make sure the backend server is running. The frontend now uses CONVERSION_MAP directly so this should work even offline.' },
]

export default function Home() {
  const [staged, setStaged] = useState([])
  const converterRef = useRef(null)
  const { state } = useStore()

  const scroll = () => converterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <SEOHead
        title="FileZaar — Free File Converter | 200+ Formats"
        description="Convert any file format instantly. Images, video, audio, documents, archives — 200+ formats, completely free. No account required."
        keywords="file converter, jpg to png, pdf to word, mp4 to mp3, free converter"
        canonical="https://filezaar.app/"
      />

      {/* ── HERO ── */}
      <section className="fz-hero">
        <div className="fz-hero__content">
          <div className="fz-hero__badge">
            <span className="fz-badge-dot" />
            Free Forever · No Account · 200+ Formats · Files Deleted After Conversion
          </div>

          <h1 className="fz-hero__h1">
            Convert Any File<br />
            <span className="fz-hero__accent">In Seconds.</span>
          </h1>

          <p className="fz-hero__sub">
            FileZaar converts images, videos, audio, documents and archives.
            200+ formats, completely free. Your files are deleted immediately after download.
          </p>

          <div className="fz-hero__btns">
            <button className="fz-btn fz-btn--primary fz-btn--xl" onClick={scroll}>
              ⚡ Start Converting — Free
            </button>
            <a href="#how-it-works" className="fz-btn fz-btn--ghost fz-btn--xl">
              How it works →
            </a>
          </div>

          <div className="fz-stats-row">
            {STATS.map(s => (
              <div key={s.label} className="fz-stat">
                <span className="fz-stat__val">{s.value}</span>
                <span className="fz-stat__lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="fz-trust-bar">
        <div className="fz-trust-bar__inner">
          {[
            '🔒 Files deleted after conversion',
            '⚡ Converts in seconds',
            '🆓 100% free forever',
            '📦 Batch convert multiple files',
            '🔁 200+ format pairs',
          ].map(t => (
            <span key={t} className="fz-trust-item">{t}</span>
          ))}
        </div>
      </div>

      {/* ── POPULAR CONVERSIONS ── */}
      <section className="fz-section fz-pop-section">
        <div className="fz-inner">
          <div className="fz-section__label">Most Used</div>
          <h2 className="fz-section__h2">Popular Conversions</h2>
          <p className="fz-section__p">The most-searched conversion tools — all free, all instant.</p>
          <div className="fz-pop-grid">
            {POPULAR_CONVERSIONS.map(p => (
              <Link key={p.slug} to={`/convert/${p.slug}`} className="fz-pop-card">
                <span className="fz-pop-card__emoji">{p.emoji}</span>
                <span className="fz-pop-card__label">{p.label}</span>
                {p.badge && <span className="fz-pop-card__badge">{p.badge}</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONVERTER ── */}
      <section className="fz-converter-section" ref={converterRef}>
        <div className="fz-inner">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="fz-section__label">The Converter</div>
            <h2 className="fz-section__h2">Drop a file. Get it converted.</h2>
            <p className="fz-section__p" style={{ marginBottom: 0 }}>
              No login. No limit. Drop your file and we'll handle the rest.
            </p>
          </div>
          <div className="fz-converter-wrap">
            {staged.length === 0 ? (
              <DropZone onFiles={setStaged} />
            ) : (
              <FileStager
                stagedFiles={staged}
                onClear={() => setStaged([])}
                defaultFormat={null}
              />
            )}
            <ConversionQueue />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="fz-section fz-features-section" id="features">
        <div className="fz-inner">
          <div className="fz-section__label">Why FileZaar</div>
          <h2 className="fz-section__h2">Built for power users.<br />Loved by everyone.</h2>
          <p className="fz-section__p">No compromises on privacy, speed, or quality.</p>
          <div className="fz-feat-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="fz-feat-card">
                <span className="fz-feat-card__icon">{f.icon}</span>
                <h3 className="fz-feat-card__title">{f.title}</h3>
                <p className="fz-feat-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="fz-section fz-how-section" id="how-it-works">
        <div className="fz-inner">
          <div className="fz-section__label">How It Works</div>
          <h2 className="fz-section__h2">Four steps. That's it.</h2>
          <p className="fz-section__p">FileZaar is so simple, you don't even need a tutorial.</p>
          <div className="fz-steps">
            {HOW.map(h => (
              <div key={h.step} className="fz-step">
                <span className="fz-step__num">STEP {h.step}</span>
                <span className="fz-step__icon">{h.icon}</span>
                <h3 className="fz-step__title">{h.title}</h3>
                <p className="fz-step__desc">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMAT DIRECTORY ── */}
      <section className="fz-section fz-formats-section" id="formats">
        <div className="fz-inner">
          <div className="fz-section__label">Supported Formats</div>
          <h2 className="fz-section__h2">Every format. Every direction.</h2>
          <p className="fz-section__p">Click any format pair to go to the dedicated converter page.</p>
          <div className="fz-cat-blocks">
            {Object.entries(FORMAT_CATEGORIES).map(([catKey, cat]) => (
              <div key={catKey} className="fz-cat-block" style={{ '--cat-color': cat.color }}>
                <div className="fz-cat-block__head">
                  <span className="fz-cat-block__emoji">{cat.emoji}</span>
                  <span className="fz-cat-block__label">{cat.label}</span>
                  <span className="fz-cat-block__count">{cat.formats.length} formats</span>
                </div>
                <div className="fz-cat-block__formats">
                  {cat.formats.slice(0, 8).map(src => {
                    const targets = CONVERSION_MAP[src] || []
                    if (!targets.length) return null
                    return (
                      <div key={src} className="fz-fmt-item">
                        <span className="fz-fmt-item__name">.{src}</span>
                        <div className="fz-fmt-item__targets">
                          {targets.slice(0, 10).map(tgt => (
                            <Link key={tgt} to={`/convert/${src}-to-${tgt}`} className="fz-fmt-link">
                              .{tgt}
                            </Link>
                          ))}
                          {targets.length > 10 && (
                            <span className="fz-fmt-more">+{targets.length - 10}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY ── */}
      <div className="fz-privacy">
        <div className="fz-privacy__inner">
          <span className="fz-privacy__icon">🔒</span>
          <div className="fz-privacy__text">
            <h3>Your files are private. Always.</h3>
            <p>
              Files are processed on our secure server and permanently deleted immediately after your download.
              No accounts. No tracking. No storage. No exceptions.
            </p>
          </div>
          <button className="fz-btn fz-btn--primary" onClick={scroll}>Start Converting Free</button>
        </div>
      </div>

      {/* ── FAQ ── */}
      <section className="fz-section fz-faq-section">
        <div className="fz-inner fz-inner--narrow">
          <div className="fz-section__label">FAQ</div>
          <h2 className="fz-section__h2" style={{ marginBottom: '1.5rem' }}>Common questions</h2>
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
