/**
 * SEOHead.jsx — Sets page title, meta, canonical, OG, Twitter, and JSON-LD
 * Uses "FileZaar" (capital Z) as brand name consistently
 */
import { useEffect } from 'react'

const SITE_NAME = 'FileZaar'
const SITE_URL  = 'https://filezaar.com'
const OG_IMAGE  = `${SITE_URL}/favicon.png`

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogTitle,
  ogDesc,
  from,       // e.g. "jpg"
  to,         // e.g. "png"
  fromLabel,  // e.g. "JPG"
  toLabel,    // e.g. "PNG"
}) {
  useEffect(() => {
    // ── Title ─────────────────────────────────────────────────
    if (title) document.title = title

    const set = (selector, value, isProperty = false) => {
      if (!value) return
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const [attr, val] = selector.replace('meta[','').replace(']','').split('="')
        el.setAttribute(attr, val.replace('"',''))
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`)
      if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
      el.href = href
    }

    // ── Meta ──────────────────────────────────────────────────
    set('meta[name="description"]',        description)
    set('meta[name="keywords"]',           keywords)
    set('meta[name="robots"]',             'index, follow, max-snippet:-1, max-image-preview:large')

    // ── OG ────────────────────────────────────────────────────
    set('meta[property="og:title"]',       ogTitle || title, true)
    set('meta[property="og:description"]', ogDesc  || description, true)
    set('meta[property="og:type"]',        'website', true)
    set('meta[property="og:site_name"]',   SITE_NAME, true)
    set('meta[property="og:image"]',       OG_IMAGE, true)
    if (canonical) set('meta[property="og:url"]', canonical, true)

    // ── Twitter ───────────────────────────────────────────────
    set('meta[name="twitter:card"]',  'summary_large_image')
    set('meta[name="twitter:title"]', ogTitle || title)
    set('meta[name="twitter:description"]', ogDesc || description)
    set('meta[name="twitter:image"]', OG_IMAGE)

    // ── Canonical ─────────────────────────────────────────────
    if (canonical) setLink('canonical', canonical)

    // ── JSON-LD for converter pages ───────────────────────────
    if (from && to && fromLabel && toLabel) {
      // Remove old schema
      document.querySelectorAll('script[data-fz-schema]').forEach(s => s.remove())

      const slug = `${from}-to-${to}`
      const url  = `${SITE_URL}/convert/${slug}`
      const name = `${fromLabel} to ${toLabel} Converter`

      // WebApplication schema
      const webApp = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": `FileZaar — ${name}`,
        "url": url,
        "description": `Free online tool by FileZaar to convert ${fromLabel} to ${toLabel}. No signup required.`,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "All — browser-based, no install required",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "featureList": [
          `${fromLabel} to ${toLabel} conversion`,
          "Drag and drop upload",
          "No signup required",
          "Instant download",
          "Free forever"
        ]
      }

      // BreadcrumbList
      const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": "Converters", "item": `${SITE_URL}/#formats` },
          { "@type": "ListItem", "position": 3, "name": name, "item": url }
        ]
      }

      // HowTo schema
      const howTo = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": `How to convert ${fromLabel} to ${toLabel} online free`,
        "description": description,
        "image": OG_IMAGE,
        "totalTime": "PT1M",
        "tool": [{ "@type": "HowToTool", "name": "FileZaar File Converter" }],
        "step": [
          { "@type": "HowToStep", "position": 1, "name": `Upload your ${fromLabel} file`, "text": `Visit FileZaar and drag & drop your ${fromLabel} file onto the converter.` },
          { "@type": "HowToStep", "position": 2, "name": `Select ${toLabel} output format`, "text": `Choose ${toLabel} from the available output formats.` },
          { "@type": "HowToStep", "position": 3, "name": "Convert the file", "text": `Click Convert. FileZaar processes your file instantly — no upload to cloud servers.` },
          { "@type": "HowToStep", "position": 4, "name": "Download your converted file", "text": `Your ${toLabel} file is ready. Click Download.` }
        ]
      }

      // FAQPage for high-traffic conversions
      const faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `Is FileZaar's ${fromLabel} to ${toLabel} converter free?`,
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. FileZaar is completely free. No account, no watermarks, no file size limits required." }
          },
          {
            "@type": "Question",
            "name": `Is my ${fromLabel} file safe on FileZaar?`,
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. FileZaar processes your files locally on your device. Files are never uploaded to external cloud servers." }
          },
          {
            "@type": "Question",
            "name": `What is the maximum file size for ${fromLabel} to ${toLabel} conversion?`,
            "acceptedAnswer": { "@type": "Answer", "text": "FileZaar supports files up to 2 GB. Since processing is local, the real limit is your device's available storage." }
          }
        ]
      }

      const addSchema = (data) => {
        const s = document.createElement('script')
        s.type = 'application/ld+json'
        s.setAttribute('data-fz-schema', '1')
        s.textContent = JSON.stringify(data)
        document.head.appendChild(s)
      }

      addSchema(webApp)
      addSchema(breadcrumb)
      addSchema(howTo)
      addSchema(faq)
    }
  }, [title, description, keywords, canonical, from, to])

  return null
}
