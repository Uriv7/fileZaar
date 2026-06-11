import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="fz-footer">
      <div className="fz-footer__inner">
        <div className="fz-footer__top">
          <div className="fz-footer__brand">
            <img
              src="/logo.png"
              width={28} height={28}
              alt="FileZaar"
              onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }}
              style={{ borderRadius: 6 }}
            />
            <span style={{ display:'none' }}><Logo size={28} /></span>
            <div>
              <div className="fz-footer__name">FileZaar</div>
              <div className="fz-footer__tagline">
                Files processed securely<br />
                Deleted immediately after conversion
              </div>
            </div>
          </div>
          <div className="fz-footer__cols">
            <div className="fz-footer__col">
              <div className="fz-footer__col-title">Converters</div>
              <Link to="/convert/jpg-to-png"  className="fz-footer__link">JPG → PNG</Link>
              <Link to="/convert/pdf-to-docx" className="fz-footer__link">PDF → DOCX</Link>
              <Link to="/convert/mp4-to-mp3"  className="fz-footer__link">MP4 → MP3</Link>
              <Link to="/convert/png-to-webp" className="fz-footer__link">PNG → WebP</Link>
              <Link to="/convert/docx-to-pdf" className="fz-footer__link">DOCX → PDF</Link>
            </div>
            <div className="fz-footer__col">
              <div className="fz-footer__col-title">Formats</div>
              <Link to="/#formats" className="fz-footer__link">Images</Link>
              <Link to="/#formats" className="fz-footer__link">Video</Link>
              <Link to="/#formats" className="fz-footer__link">Audio</Link>
              <Link to="/#formats" className="fz-footer__link">Documents</Link>
              <Link to="/#formats" className="fz-footer__link">Archives</Link>
            </div>
            <div className="fz-footer__col">
              <div className="fz-footer__col-title">Product</div>
              <a href="/#features"     className="fz-footer__link">Features</a>
              <a href="/#how-it-works" className="fz-footer__link">How it works</a>
              <a href="/#faq"          className="fz-footer__link">FAQ</a>
            </div>
          </div>
        </div>
        <div className="fz-footer__bottom">
          © 2026 FileZaar · Files processed securely · Deleted immediately after conversion · Built with ❤️
        </div>
      </div>
    </footer>
  )
}
