import { useCallback, useState, useRef } from 'react'
export function DropZone({ onFiles }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef()
  const handle = useCallback(fl => { const f=Array.from(fl).filter(f=>f.size>0); if(f.length) onFiles(f) },[onFiles])
  return (
    <div className={`fz-dropzone${drag?' fz-dropzone--active':''}`}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files)}}
      onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
      onClick={()=>ref.current?.click()} role="button" tabIndex={0}
      onKeyDown={e=>e.key==='Enter'&&ref.current?.click()}>
      <input ref={ref} type="file" multiple style={{display:'none'}} onChange={e=>handle(e.target.files)}/>
      <div className="fz-dropzone__inner">
        <div className="fz-dropzone__orbit">
          <div className="fz-dropzone__icon">
            <svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity=".25"/><rect x="14" y="20" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M22 20v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="2"/><path d="M32 29v12M26 35l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="fz-dropzone__orbit-dot fz-dropzone__orbit-dot--1">🖼</div>
          <div className="fz-dropzone__orbit-dot fz-dropzone__orbit-dot--2">🎬</div>
          <div className="fz-dropzone__orbit-dot fz-dropzone__orbit-dot--3">📄</div>
          <div className="fz-dropzone__orbit-dot fz-dropzone__orbit-dot--4">📦</div>
        </div>
        <h3 className="fz-dropzone__title">{drag?'📂 Release to add files':'Drop your files here'}</h3>
        <p className="fz-dropzone__sub">or <span className="fz-dropzone__link">browse your computer</span></p>
        <div className="fz-dropzone__chips">
          {['Images','Video','Audio','Documents','Archives'].map(c=><span key={c} className="fz-chip">{c}</span>)}
        </div>
        <p className="fz-dropzone__limit">Up to 2 GB per file · 200+ formats supported</p>
      </div>
    </div>
  )
}
