/**
 * data/conversions.js — FileZaar
 * Single source of truth for all supported format conversions.
 * Powers all SEO pages at /convert/{from}-to-{to}
 */

export const FORMAT_META = {
  jpg:  { label:'JPG',  cat:'image',    fullName:'JPEG Image',              emoji:'🖼' },
  jpeg: { label:'JPEG', cat:'image',    fullName:'JPEG Image',              emoji:'🖼' },
  png:  { label:'PNG',  cat:'image',    fullName:'PNG Image',               emoji:'🖼' },
  webp: { label:'WEBP', cat:'image',    fullName:'WebP Image',              emoji:'🖼' },
  gif:  { label:'GIF',  cat:'image',    fullName:'GIF Image',               emoji:'🖼' },
  bmp:  { label:'BMP',  cat:'image',    fullName:'Bitmap Image',            emoji:'🖼' },
  tiff: { label:'TIFF', cat:'image',    fullName:'TIFF Image',              emoji:'🖼' },
  avif: { label:'AVIF', cat:'image',    fullName:'AVIF Image',              emoji:'🖼' },
  ico:  { label:'ICO',  cat:'image',    fullName:'Windows Icon',            emoji:'🖼' },
  svg:  { label:'SVG',  cat:'image',    fullName:'SVG Vector',              emoji:'🖼' },
  heic: { label:'HEIC', cat:'image',    fullName:'iPhone HEIC Image',       emoji:'📱' },
  mp4:  { label:'MP4',  cat:'video',    fullName:'MP4 Video',               emoji:'🎬' },
  mkv:  { label:'MKV',  cat:'video',    fullName:'Matroska Video',          emoji:'🎬' },
  avi:  { label:'AVI',  cat:'video',    fullName:'AVI Video',               emoji:'🎬' },
  mov:  { label:'MOV',  cat:'video',    fullName:'QuickTime Video',         emoji:'🎬' },
  webm: { label:'WEBM', cat:'video',    fullName:'WebM Video',              emoji:'🎬' },
  flv:  { label:'FLV',  cat:'video',    fullName:'Flash Video',             emoji:'🎬' },
  wmv:  { label:'WMV',  cat:'video',    fullName:'Windows Media Video',     emoji:'🎬' },
  m4v:  { label:'M4V',  cat:'video',    fullName:'iTunes Video',            emoji:'🎬' },
  mp3:  { label:'MP3',  cat:'audio',    fullName:'MP3 Audio',               emoji:'🎵' },
  wav:  { label:'WAV',  cat:'audio',    fullName:'WAV Audio',               emoji:'🎵' },
  flac: { label:'FLAC', cat:'audio',    fullName:'FLAC Lossless Audio',     emoji:'🎵' },
  ogg:  { label:'OGG',  cat:'audio',    fullName:'OGG Audio',               emoji:'🎵' },
  aac:  { label:'AAC',  cat:'audio',    fullName:'AAC Audio',               emoji:'🎵' },
  m4a:  { label:'M4A',  cat:'audio',    fullName:'M4A Audio',               emoji:'🎵' },
  opus: { label:'OPUS', cat:'audio',    fullName:'Opus Audio',              emoji:'🎵' },
  aiff: { label:'AIFF', cat:'audio',    fullName:'AIFF Audio',              emoji:'🎵' },
  wma:  { label:'WMA',  cat:'audio',    fullName:'Windows Media Audio',     emoji:'🎵' },
  pdf:  { label:'PDF',  cat:'document', fullName:'PDF Document',            emoji:'📄' },
  docx: { label:'DOCX', cat:'document', fullName:'Word Document',           emoji:'📄' },
  doc:  { label:'DOC',  cat:'document', fullName:'Word 97 Document',        emoji:'📄' },
  txt:  { label:'TXT',  cat:'document', fullName:'Plain Text',              emoji:'📄' },
  html: { label:'HTML', cat:'document', fullName:'HTML Document',           emoji:'📄' },
  md:   { label:'MD',   cat:'document', fullName:'Markdown',                emoji:'📝' },
  odt:  { label:'ODT',  cat:'document', fullName:'OpenDocument Text',       emoji:'📄' },
  rtf:  { label:'RTF',  cat:'document', fullName:'Rich Text Format',        emoji:'📄' },
  epub: { label:'EPUB', cat:'document', fullName:'eBook (EPUB)',            emoji:'📚' },
  pptx: { label:'PPTX', cat:'document', fullName:'PowerPoint Presentation', emoji:'📊' },
  xlsx: { label:'XLSX', cat:'document', fullName:'Excel Spreadsheet',       emoji:'📊' },
  csv:  { label:'CSV',  cat:'document', fullName:'CSV Spreadsheet',         emoji:'📊' },
  json: { label:'JSON', cat:'document', fullName:'JSON Data File',          emoji:'📋' },
  xml:  { label:'XML',  cat:'document', fullName:'XML Document',            emoji:'📋' },
  zip:  { label:'ZIP',  cat:'archive',  fullName:'ZIP Archive',             emoji:'📦' },
  '7z': { label:'7Z',   cat:'archive',  fullName:'7-Zip Archive',           emoji:'📦' },
  tar:  { label:'TAR',  cat:'archive',  fullName:'TAR Archive',             emoji:'📦' },
  gz:   { label:'GZ',   cat:'archive',  fullName:'GZip Archive',            emoji:'📦' },
  rar:  { label:'RAR',  cat:'archive',  fullName:'RAR Archive',             emoji:'📦' },
}

export const CONVERSION_MAP = {
  // Images
  jpg:   ['png','webp','gif','bmp','tiff','pdf','avif','ico'],
  jpeg:  ['png','webp','gif','bmp','tiff','pdf','avif','ico'],
  png:   ['jpg','webp','gif','bmp','tiff','pdf','ico','avif'],
  webp:  ['jpg','png','gif','bmp','tiff','avif','pdf'],
  gif:   ['mp4','webm','png','jpg','webp','bmp','tiff','pdf'],
  bmp:   ['jpg','png','webp','gif','tiff','pdf','ico'],
  tiff:  ['jpg','png','pdf','webp','bmp','gif'],
  avif:  ['jpg','png','webp','gif','bmp','tiff','pdf'],
  ico:   ['png','jpg','bmp'],
  svg:   ['png','jpg','pdf','webp','gif','bmp','tiff'],
  heic:  ['jpg','png','webp','pdf','gif','bmp','tiff'],
  // Video
  mp4:   ['mkv','avi','mov','webm','gif','mp3','aac','wav','flac','ogg','m4a'],
  mkv:   ['mp4','avi','mov','webm','gif','mp3','aac','wav'],
  avi:   ['mp4','mkv','mov','webm','gif','mp3'],
  mov:   ['mp4','mkv','avi','webm','gif','mp3','m4a'],
  webm:  ['mp4','mkv','avi','mov','gif','mp3','ogg'],
  flv:   ['mp4','mkv','avi','mov','webm','gif','mp3'],
  wmv:   ['mp4','mkv','avi','mov','webm','gif','mp3'],
  m4v:   ['mp4','mkv','avi','mov','mp3'],
  // Audio — ALL formats shown, no +N truncation
  mp3:   ['wav','aac','flac','ogg','m4a','wma','aiff','opus'],
  wav:   ['mp3','aac','flac','ogg','m4a','aiff','opus'],
  flac:  ['mp3','wav','aac','ogg','m4a','aiff'],
  ogg:   ['mp3','wav','flac','aac','m4a'],
  aac:   ['mp3','wav','flac','ogg','m4a','aiff'],
  m4a:   ['mp3','wav','flac','aac','ogg','aiff','opus'],
  opus:  ['mp3','wav','aac','ogg','flac','m4a'],
  aiff:  ['mp3','wav','flac','aac','m4a','ogg'],
  wma:   ['mp3','wav','aac','flac','ogg','m4a'],
  // Documents
  pdf:   ['docx','txt','html','md','odt','rtf','epub','csv','json','xlsx','xml','pptx'],
  docx:  ['pdf','txt','html','md','odt','rtf','epub','csv','xlsx','pptx'],
  doc:   ['docx','pdf','txt','html','rtf'],
  txt:   ['pdf','docx','html','md','rtf','epub','xml','pptx'],
  html:  ['pdf','docx','txt','md','epub','rtf','xml'],
  md:    ['html','pdf','docx','txt','rtf','epub'],
  odt:   ['docx','pdf','txt','html','rtf','epub'],
  rtf:   ['docx','pdf','txt','html','odt','epub'],
  epub:  ['pdf','docx','txt','html','md','odt','rtf'],
  pptx:  ['pdf','txt','html','md','odt','rtf','epub','csv','json','xlsx','xml'],
  xlsx:  ['csv','txt','html','pdf','json','xml','docx','md','odt','rtf','epub','pptx'],
  xls:   ['xlsx','csv','txt','html','pdf'],
  csv:   ['xlsx','txt','html','pdf','json','xml'],
  json:  ['csv','txt','html','xlsx','xml'],
  xml:   ['json','txt','html','pdf'],
  // Archives
  zip:   ['7z','tar','tar.gz'],
  '7z':  ['zip','tar','tar.gz'],
  tar:   ['zip','7z','gz'],
  gz:    ['zip','7z','tar'],
  rar:   ['zip','7z','tar'],
}

export const FORMAT_CATEGORIES = {
  image:    { label:'Image Converters',    emoji:'🖼',  color:'#5b5fec', formats:['jpg','png','webp','gif','bmp','tiff','avif','ico','svg','heic'] },
  video:    { label:'Video Converters',    emoji:'🎬',  color:'#8b5cf6', formats:['mp4','mkv','avi','mov','webm','flv','wmv'] },
  audio:    { label:'Audio Converters',    emoji:'🎵',  color:'#10b981', formats:['mp3','wav','flac','ogg','aac','m4a','opus','aiff','wma'] },
  document: { label:'Document Converters', emoji:'📄',  color:'#3b82f6', formats:['pdf','docx','doc','txt','html','md','odt','rtf','epub','pptx','xlsx','csv','json','xml'] },
  archive:  { label:'Archive Converters',  emoji:'📦',  color:'#ef4444', formats:['zip','7z','tar','gz','rar'] },
}

const RICH = {
  'jpg-to-png':  { title:'JPG to PNG Converter — Free Online | FileZaar', desc:'Convert JPG images to PNG online free with FileZaar. No account needed. Lossless quality, transparency support.', keywords:'jpg to png, convert jpg to png online free, jpg png converter, FileZaar', intro:'Convert your JPG photos into PNG format instantly on FileZaar. PNG supports transparency and offers lossless quality.', benefits:['Preserves full image quality','Adds transparency support','No file size limits','Batch convert multiple files'], useCases:'Ideal for web developers needing transparent backgrounds, designers converting photos for graphics work, or anyone who wants lossless images.' },
  'png-to-jpg':  { title:'PNG to JPG Converter — Free Online | FileZaar', desc:'Convert PNG images to JPG online free with FileZaar. Reduce file size while keeping great quality.', keywords:'png to jpg, convert png to jpg online free, png jpg converter, FileZaar', intro:'Convert PNG images to JPG on FileZaar to reduce file size. JPG is universally compatible with all devices and platforms.', benefits:['Reduces file size up to 80%','Universal device compatibility','Perfect for photos','Fast batch processing'], useCases:'Perfect for reducing website image sizes, sharing photos via email, or converting screenshots for social media.' },
  'mp4-to-mp3':  { title:'MP4 to MP3 Converter — Extract Audio Free | FileZaar', desc:'Extract MP3 audio from MP4 video online free with FileZaar. High quality, instant, no account needed.', keywords:'mp4 to mp3, mp4 to mp3 converter online free, extract audio from video, FileZaar', intro:'Extract high-quality MP3 audio from any MP4 video file on FileZaar. Perfect for saving music, podcasts, and lectures.', benefits:['High-quality audio extraction','Preserves original audio quality','Works with any MP4 file','No quality loss'], useCases:'Extract music from music videos, convert lecture recordings to MP3, save podcast content, or extract audio from any video.' },
  'pdf-to-docx': { title:'PDF to Word Converter — Free Online | FileZaar', desc:'Convert PDF to editable Word DOCX online free with FileZaar. Preserve formatting, tables, and text.', keywords:'pdf to word, pdf to docx, convert pdf to word online free, FileZaar', intro:'Convert PDF documents into fully editable Word DOCX files on FileZaar. Preserve your formatting, tables, and text.', benefits:['Fully editable output','Preserves tables and formatting','Works with complex PDFs','No cloud upload'], useCases:'Edit scanned contracts, update company documents, or convert reports for further editing.' },
  'docx-to-pdf': { title:'Word to PDF Converter — Free Online | FileZaar', desc:'Convert Word DOCX to PDF online free with FileZaar. Preserve all formatting and fonts.', keywords:'word to pdf, docx to pdf, convert word to pdf online free, FileZaar', intro:'Convert Word documents to PDF format on FileZaar for easy sharing. PDFs look identical on all devices.', benefits:['Identical on all devices','Preserves fonts and images','Secure non-editable output','Industry standard'], useCases:'Share final documents professionally, submit applications, archive documents, or ensure correct printing.' },
  'webp-to-jpg': { title:'WEBP to JPG Converter — Free Online | FileZaar', desc:'Convert WebP images to JPG online free with FileZaar. Universal compatibility, instant conversion.', keywords:'webp to jpg, convert webp to jpg online free, webp jpg converter, FileZaar', intro:"Convert modern WebP images to JPG on FileZaar for universal compatibility. JPG is supported by every app and device.", benefits:['Universal compatibility','Works on all devices','Preserves image quality','No special app needed'], useCases:"Convert images downloaded from Google or websites that save as WebP to standard JPG." },
  'heic-to-jpg': { title:'HEIC to JPG Converter — Free Online | FileZaar', desc:'Convert iPhone HEIC photos to JPG online free with FileZaar. Share anywhere, no account needed.', keywords:'heic to jpg, convert heic to jpg online free, iphone photo converter, FileZaar', intro:"Convert iPhone HEIC photos to universally compatible JPG on FileZaar. JPG works anywhere.", benefits:["Works with iPhone & iPad photos",'No quality loss','Universal compatibility','Batch conversion support'], useCases:"Share iPhone photos with Android users, upload to websites, or print at photo labs." },
  'mkv-to-mp4':  { title:'MKV to MP4 Converter — Free Online | FileZaar', desc:'Convert MKV video to MP4 online free with FileZaar. Universal playback, instant conversion.', keywords:'mkv to mp4, convert mkv to mp4 online free, mkv mp4 converter, FileZaar', intro:'Convert MKV videos to widely compatible MP4 on FileZaar. MP4 plays on every device, smart TV, and platform.', benefits:['Universal device playback','No quality loss','Works on smart TVs','Fast conversion'], useCases:'Play videos on smart TVs, share on social media, or upload to streaming platforms.' },
  'pptx-to-pdf': { title:'PPTX to PDF Converter — Free Online | FileZaar', desc:'Convert PowerPoint PPTX to PDF online free with FileZaar. No account, instant conversion.', keywords:'pptx to pdf, convert pptx to pdf online free, powerpoint to pdf, FileZaar', intro:'Convert PowerPoint presentations to PDF on FileZaar. PDFs preserve your slides perfectly on every device.', benefits:['Preserves slide layout','Universal compatibility','No PowerPoint needed to view','Instant conversion'], useCases:'Share presentations with clients, submit assignments, or archive slide decks as PDF.' },
  'xlsx-to-csv': { title:'XLSX to CSV Converter — Free Online | FileZaar', desc:'Convert Excel XLSX to CSV online free with FileZaar. No account needed, instant download.', keywords:'xlsx to csv, convert xlsx to csv online free, excel to csv, FileZaar', intro:'Convert Excel spreadsheets to CSV on FileZaar. CSV works with every data tool, database, and programming language.', benefits:['Works with all data tools','Universal compatibility','Clean plain text output','Instant conversion'], useCases:'Import data into databases, use with Python/R, share with apps that need CSV input.' },
  'xml-to-json': { title:'XML to JSON Converter — Free Online | FileZaar', desc:'Convert XML to JSON online free with FileZaar. Fast, accurate, no account needed.', keywords:'xml to json, convert xml to json online free, xml json converter, FileZaar', intro:'Convert XML documents to JSON format on FileZaar. JSON is the modern standard for APIs and web applications.', benefits:['Clean JSON output','Preserves data structure','Works with all APIs','Instant conversion'], useCases:'Migrate data between systems, convert API responses, or modernize legacy XML data.' },
}

export function getConversionContent(from, to) {
  const slug = `${from}-to-${to}`
  const fromMeta = FORMAT_META[from] || { label:from.toUpperCase(), cat:'file', fullName:`${from.toUpperCase()} File`, emoji:'📁' }
  const toMeta   = FORMAT_META[to]   || { label:to.toUpperCase(),   cat:'file', fullName:`${to.toUpperCase()} File`,   emoji:'📁' }
  if (RICH[slug]) return { ...RICH[slug], from, to, fromMeta, toMeta, slug }
  return {
    slug, from, to, fromMeta, toMeta,
    title:    `Convert ${fromMeta.label} to ${toMeta.label} Online Free | FileZaar`,
    desc:     `Convert ${fromMeta.fullName} to ${toMeta.fullName} online for free with FileZaar. No account needed. Upload your ${fromMeta.label} file and download ${toMeta.label} in seconds.`,
    keywords: `${from} to ${to}, convert ${from} to ${to} online free, ${from} ${to} converter, FileZaar`,
    intro:    `Convert your ${fromMeta.fullName} files to ${toMeta.fullName} instantly with FileZaar. All processing happens locally — your files never leave your computer.`,
    benefits: ['100% free — no account required','No file size limits',`High quality ${toMeta.label} output`,'Instant conversion with live progress'],
    useCases: `Convert ${fromMeta.fullName} to ${toMeta.fullName} for better compatibility, smaller file sizes, or to use in applications that require ${toMeta.label} format.`,
  }
}

export function getRelatedConversions(from, to) {
  const sameInput  = (CONVERSION_MAP[from]||[]).filter(t=>t!==to).slice(0,4).map(t=>({ from, to:t, slug:`${from}-to-${t}` }))
  const sameOutput = Object.entries(CONVERSION_MAP).filter(([s,ts])=>s!==from&&ts.includes(to)).map(([s])=>s).slice(0,4).map(s=>({ from:s, to, slug:`${s}-to-${to}` }))
  return { sameInput, sameOutput }
}

export const POPULAR_CONVERSIONS = [
  { slug:'jpg-to-png',   label:'JPG → PNG',   emoji:'🖼',  badge:'Most Popular' },
  { slug:'mp4-to-mp3',   label:'MP4 → MP3',   emoji:'🎬',  badge:'Most Popular' },
  { slug:'pdf-to-docx',  label:'PDF → DOCX',  emoji:'📄',  badge:'Most Popular' },
  { slug:'docx-to-pdf',  label:'DOCX → PDF',  emoji:'📄',  badge:'Most Popular' },
  { slug:'png-to-jpg',   label:'PNG → JPG',   emoji:'🖼',  badge:'Popular' },
  { slug:'webp-to-jpg',  label:'WEBP → JPG',  emoji:'🖼',  badge:'Popular' },
  { slug:'heic-to-jpg',  label:'HEIC → JPG',  emoji:'📱',  badge:'Popular' },
  { slug:'mkv-to-mp4',   label:'MKV → MP4',   emoji:'🎬',  badge:'Popular' },
  { slug:'mp4-to-gif',   label:'MP4 → GIF',   emoji:'🎬',  badge:'Popular' },
  { slug:'mp3-to-wav',   label:'MP3 → WAV',   emoji:'🎵',  badge:'Popular' },
  { slug:'flac-to-mp3',  label:'FLAC → MP3',  emoji:'🎵',  badge:'Popular' },
  { slug:'svg-to-png',   label:'SVG → PNG',   emoji:'🖼',  badge:'Popular' },
  { slug:'wav-to-mp3',   label:'WAV → MP3',   emoji:'🎵',  badge:'Popular' },
  { slug:'avi-to-mp4',   label:'AVI → MP4',   emoji:'🎬',  badge:'Popular' },
  { slug:'pptx-to-pdf',  label:'PPTX → PDF',  emoji:'📊',  badge:'Popular' },
  { slug:'xlsx-to-csv',  label:'XLSX → CSV',  emoji:'📊',  badge:'Popular' },
  { slug:'csv-to-xlsx',  label:'CSV → XLSX',  emoji:'📊',  badge:'Trending' },
  { slug:'xml-to-json',  label:'XML → JSON',  emoji:'📋',  badge:'Trending' },
  { slug:'gif-to-mp4',   label:'GIF → MP4',   emoji:'🖼',  badge:'Trending' },
  { slug:'zip-to-7z',    label:'ZIP → 7Z',    emoji:'📦',  badge:'Trending' },
]
