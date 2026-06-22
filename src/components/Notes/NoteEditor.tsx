import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Note, Course } from '../../types/database'
import CommandPalette from './CommandPalette'
import BacklinksPanel from './BacklinksPanel'
import BlockEditor, { blocksToMarkdown } from './BlockEditor'

function getMarkdownContent(content: string): string {
  if (!content?.trim()) return ''
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return blocksToMarkdown(parsed)
    }
  } catch { /* not JSON, treat as markdown */ }
  return content
}

interface NoteEditorProps {
  note: Note | null
  courses: Course[]
  allNotes: Note[]
  onSave: () => void
  onClose: () => void
  onOpenNote: (note: Note) => void
}

const CALLOUT_TYPES: Record<string, { icon: string; color: string; bg: string }> = {
  tip: { icon: 'ti-bulb', color: 'var(--green)', bg: 'var(--green-bg)' },
  note: { icon: 'ti-info-circle', color: '#2563eb', bg: '#eff6ff' },
  warning: { icon: 'ti-alert-triangle', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  important: { icon: 'ti-alert-circle', color: 'var(--red)', bg: 'var(--red-bg)' },
  info: { icon: 'ti-info-circle', color: '#2563eb', bg: '#eff6ff' },
  example: { icon: 'ti-clipboard', color: '#7c3aed', bg: '#f5f3ff' },
  question: { icon: 'ti-help', color: '#d97706', bg: '#fffbeb' },
  abstract: { icon: 'ti-file-text', color: '#0891b2', bg: '#ecfeff' },
}

function ActiveRecallBlock({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className={`recall-block ${revealed ? 'revealed' : ''}`} onClick={() => setRevealed(!revealed)}>
      <div className="recall-header">
        <i className="ti ti-brain" style={{ fontSize: 12 }} />
        <span>Active Recall</span>
        <span className="recall-hint">{revealed ? 'click to hide' : 'click to reveal'}</span>
      </div>
      <div className={`recall-content ${revealed ? 'show' : ''}`}>{children}</div>
      {!revealed && <div className="recall-placeholder">Tap to test your recall</div>}
    </div>
  )
}

function ToggleBlock({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="toggle-block">
      <div className="toggle-header" onClick={() => setOpen(!open)}>
        <i className={`ti ti-chevron-right toggle-chevron ${open ? 'open' : ''}`} />
        <span>{title}</span>
      </div>
      {open && <div className="toggle-content">{children}</div>}
    </div>
  )
}

function CalloutBlock({ type, title, children }: { type: string; title: string; children: ReactNode }) {
  const cfg = CALLOUT_TYPES[type] ?? CALLOUT_TYPES.note
  return (
    <div className="callout-block" style={{ borderLeftColor: cfg.color, background: cfg.bg }}>
      <div className="callout-title" style={{ color: cfg.color }}>
        <i className={`ti ${cfg.icon}`} style={{ fontSize: 13 }} />
        <span>{title || type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </div>
      <div className="callout-content">{children}</div>
    </div>
  )
}

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    import('mermaid').then(m => {
      m.default.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'var(--font)' })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      m.default.render(id, code).then(({ svg }) => {
        if (!cancelled) setSvg(svg)
      }).catch(err => {
        if (!cancelled) setError(err.message || 'Diagram error')
      })
    })
    return () => { cancelled = true }
  }, [code])

  if (error) return <div style={{ fontSize: 10, color: 'var(--red)', padding: 8 }}>{error}</div>
  if (!svg) return <div style={{ fontSize: 10, color: 'var(--subtle)', padding: 8 }}>Rendering diagram...</div>
  return <div ref={ref} className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />
}

function renderMarkdownWithFeatures(
  content: string,
  allNotes: Note[],
  onOpenNote: (note: Note) => void,
  isStudyMode: boolean,
) {
  const segments: { type: string; content: string; meta?: string }[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const calloutMatch = lines[i].match(/^>\s*\[!(tip|note|warning|important|info|example|question|abstract)\]\s*(.*)?$/i)
    if (calloutMatch) {
      const calloutType = calloutMatch[1].toLowerCase()
      const calloutTitle = calloutMatch[2] || ''
      const calloutLines: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      segments.push({ type: 'callout', content: calloutLines.join('\n'), meta: `${calloutType}|${calloutTitle}` })
      continue
    }

    const toggleMatch = lines[i].match(/^>\s*\[!toggle\]\s*(.+)$/i)
    if (toggleMatch) {
      const toggleTitle = toggleMatch[1]
      const toggleLines: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith('>')) {
        toggleLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      segments.push({ type: 'toggle', content: toggleLines.join('\n'), meta: toggleTitle })
      continue
    }

    if (lines[i].match(/^```mermaid\s*$/)) {
      const mermaidLines: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        mermaidLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++
      segments.push({ type: 'mermaid', content: mermaidLines.join('\n') })
      continue
    }

    if (segments.length > 0 && segments[segments.length - 1].type === 'markdown') {
      segments[segments.length - 1].content += '\n' + lines[i]
    } else {
      segments.push({ type: 'markdown', content: lines[i] })
    }
    i++
  }

  return segments.map((seg, idx) => {
    if (seg.type === 'callout') {
      const [calloutType, calloutTitle] = (seg.meta ?? 'note|').split('|')
      return (
        <CalloutBlock key={idx} type={calloutType} title={calloutTitle}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{seg.content}</ReactMarkdown>
        </CalloutBlock>
      )
    }
    if (seg.type === 'toggle') {
      return (
        <ToggleBlock key={idx} title={seg.meta ?? ''}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{seg.content}</ReactMarkdown>
        </ToggleBlock>
      )
    }
    if (seg.type === 'mermaid') {
      return <MermaidBlock key={idx} code={seg.content} />
    }

    const parts = seg.content.split(/(\?\?[^?]+\?\?|\[\[[^\]]+\]\]|#[a-zA-Z][\w-]*)/g)
    return parts.map((part, pi) => {
      if (part.startsWith('??') && part.endsWith('??')) {
        const inner = part.slice(2, -2).trim()
        if (isStudyMode) {
          return <ActiveRecallBlock key={`${idx}-${pi}`}><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{inner}</ReactMarkdown></ActiveRecallBlock>
        }
        return (
          <div key={`${idx}-${pi}`} className="recall-block revealed" style={{ opacity: 0.9 }}>
            <div className="recall-header"><i className="ti ti-brain" style={{ fontSize: 12 }} /><span>Active Recall</span></div>
            <div className="recall-content show"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{inner}</ReactMarkdown></div>
          </div>
        )
      }
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkTitle = part.slice(2, -2).trim()
        const linked = allNotes.find(n => n.title.toLowerCase() === linkTitle.toLowerCase())
        return (
          <span key={`${idx}-${pi}`} className={`concept-link ${linked ? 'exists' : 'missing'}`}
            onClick={e => { e.stopPropagation(); if (linked) onOpenNote(linked) }}
            title={linked ? `Open "${linked.title}"` : `No note found: "${linkTitle}"`}
          >{linkTitle}</span>
        )
      }
      if (part.match(/^#[a-zA-Z][\w-]*$/)) {
        return <span key={`${idx}-${pi}`} className="inline-tag">{part}</span>
      }
      if (!part) return null

      const highlighted = part.replace(/==(.*?)==/g, '<mark>$1</mark>')

      return <ReactMarkdown key={`${idx}-${pi}`} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{highlighted}</ReactMarkdown>
    })
  })
}

interface Annotation {
  id: string
  blockId: string
  text: string
  comment: string
  type: 'highlight' | 'comment' | 'suggestion'
  createdAt: string
}

function AnnotatedView({ content, annotations, onAnnotationsChange, allNotes, onOpenNote }: {
  content: string
  annotations: Annotation[]
  onAnnotationsChange: (a: Annotation[]) => void
  allNotes: Note[]
  onOpenNote: (note: Note) => void
}) {
  const [popover, setPopover] = useState<{ top: number; left: number; text: string } | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentType, setCommentType] = useState<Annotation['type']>('comment')
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseUp() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !viewRef.current) { return }
      const range = sel.getRangeAt(0)
      if (!viewRef.current.contains(range.commonAncestorContainer)) return
      const text = sel.toString().trim()
      if (!text) return
      const rect = range.getBoundingClientRect()
      const containerRect = viewRef.current.getBoundingClientRect()
      setPopover({
        top: rect.bottom - containerRect.top + 8,
        left: Math.min(rect.left - containerRect.left, containerRect.width - 280),
        text,
      })
      setCommentText('')
      setCommentType('comment')
      setActiveAnnotation(null)
    }
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null)
      }
    }
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => { document.removeEventListener('mouseup', handleMouseUp); document.removeEventListener('mousedown', handleMouseDown) }
  }, [])

  function addAnnotation() {
    if (!popover) return
    const annotation: Annotation = {
      id: Math.random().toString(36).slice(2, 10),
      blockId: '',
      text: popover.text,
      comment: commentText,
      type: commentType,
      createdAt: new Date().toISOString(),
    }
    onAnnotationsChange([...annotations, annotation])
    setPopover(null)
    window.getSelection()?.removeAllRanges()
  }

  function deleteAnnotation(id: string) {
    onAnnotationsChange(annotations.filter(a => a.id !== id))
    setActiveAnnotation(null)
  }

  const md = getMarkdownContent(content)

  return (
    <div className="av-container" ref={viewRef}>
      <div className="av-content">
        <div className="note-editor-preview markdown-body">
          {md ? renderMarkdownWithFeatures(md, allNotes, onOpenNote, false) : (
            <p style={{ color: 'var(--subtle)' }}>Nothing to view yet.</p>
          )}
        </div>

        {popover && (
          <div ref={popoverRef} className="av-popover" style={{ top: popover.top, left: popover.left }}>
            <div className="av-popover-selected">
              <i className="ti ti-quote" style={{ fontSize: 11, color: 'var(--subtle)' }} />
              <span>{popover.text.length > 60 ? popover.text.slice(0, 60) + '...' : popover.text}</span>
            </div>
            <div className="av-popover-types">
              {(['highlight', 'comment', 'suggestion'] as const).map(t => (
                <button key={t} className={`av-type-btn av-type-${t} ${commentType === t ? 'av-type-active' : ''}`} onClick={() => setCommentType(t)}>
                  <i className={`ti ${t === 'highlight' ? 'ti-highlight' : t === 'comment' ? 'ti-message' : 'ti-bulb'}`} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {commentType !== 'highlight' && (
              <textarea className="av-popover-input" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={commentType === 'suggestion' ? 'Suggest a change...' : 'Add a comment...'} rows={2} autoFocus />
            )}
            <div className="av-popover-actions">
              <button className="btn" onClick={() => setPopover(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={addAnnotation} disabled={commentType !== 'highlight' && !commentText.trim()}>
                {commentType === 'highlight' ? 'Highlight' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      {annotations.length > 0 && (
        <div className="av-sidebar">
          <div className="av-sidebar-header">
            <span>Annotations</span>
            <span className="av-sidebar-count">{annotations.length}</span>
          </div>
          {annotations.map(a => (
            <div key={a.id} className={`av-annotation av-annotation-${a.type} ${activeAnnotation === a.id ? 'av-annotation-active' : ''}`} onClick={() => setActiveAnnotation(activeAnnotation === a.id ? null : a.id)}>
              <div className="av-annotation-header">
                <i className={`ti ${a.type === 'highlight' ? 'ti-highlight' : a.type === 'comment' ? 'ti-message' : 'ti-bulb'}`} />
                <span className="av-annotation-type">{a.type}</span>
                <span className="av-annotation-time">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button className="av-annotation-delete" onClick={e => { e.stopPropagation(); deleteAnnotation(a.id) }}><i className="ti ti-x" /></button>
              </div>
              <div className="av-annotation-quote">{a.text}</div>
              {a.comment && <div className="av-annotation-comment">{a.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NoteEditor({ note, courses, allNotes, onSave, onClose, onOpenNote }: NoteEditorProps) {
  const { user, refreshProfile } = useAuth()
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [courseId, setCourseId] = useState(note?.course_id ?? '')
  const [week, setWeek] = useState(note?.week?.toString() ?? '')
  const [concepts, setConcepts] = useState(note?.concepts?.join(', ') ?? '')
  const [mode, setMode] = useState<'blocks' | 'preview' | 'view' | 'study'>('blocks')
  const [annotations, setAnnotations] = useState<{ id: string; blockId: string; text: string; comment: string; type: 'highlight' | 'comment' | 'suggestion'; createdAt: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [splitFile, setSplitFile] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showBacklinks, setShowBacklinks] = useState(true)

  const isNew = !note

  const save = useCallback(async () => {
    if (!title.trim() || !user) return
    setSaving(true)

    const tags = (content.match(/#[a-zA-Z][\w-]*/g) ?? []).map(t => t.slice(1))
    const allConcepts = [...new Set([...concepts.split(',').map(c => c.trim()).filter(Boolean), ...tags])]

    const payload = {
      title: title.trim(),
      content,
      course_id: courseId || null,
      week: week ? parseInt(week) : null,
      concepts: allConcepts,
      file_type: 'text' as const,
    }

    if (isNew) {
      const { error } = await supabase.from('notes').insert({ ...payload, user_id: user.id })
      if (!error) {
        await supabase.rpc('add_xp', { user_uuid: user.id, amount: 15 })
        await refreshProfile()
      }
    } else {
      await supabase.from('notes').update(payload).eq('id', note.id)
    }

    setSaving(false)
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    onSave()
  }, [title, content, courseId, week, concepts, user, note, isNew, onSave, refreshProfile])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(v => !v) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); setShowCommandPalette(v => !v) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [save])

  const pdfNotes = allNotes.filter(n => n.file_type === 'pdf' && n.file_url)

  return (
    <div className={`note-editor ${focusMode ? 'focus-mode' : ''}`}>
      {!focusMode && (
        <div className="note-editor-toolbar">
          <button className="btn" onClick={onClose}>
            <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />Back
          </button>
          <div className="note-editor-meta">
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="note-editor-select">
              <option value="">No course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
            <select value={week} onChange={e => setWeek(e.target.value)} className="note-editor-select">
              <option value="">No week</option>
              {Array.from({ length: 14 }, (_, i) => <option key={i} value={i + 1}>Wk {i + 1}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {lastSaved && <span style={{ fontSize: 10, color: 'var(--subtle)' }}>Saved {lastSaved}</span>}
            {(mode === 'blocks' || mode === 'preview') && (
              <>
                <button className="btn" onClick={() => setShowCommandPalette(true)} title="Command palette (Cmd+K)">
                  <i className="ti ti-command" style={{ fontSize: 12 }} />
                </button>
                <button className="btn" onClick={() => setFocusMode(true)} title="Focus mode">
                  <i className="ti ti-focus-2" style={{ fontSize: 12 }} />
                </button>
                {mode === 'blocks' && (
                  <>
                    <button className="btn" onClick={() => setShowBacklinks(v => !v)} title="Toggle backlinks">
                      <i className="ti ti-link" style={{ fontSize: 12 }} />
                    </button>
                    {pdfNotes.length > 0 && (
                      <select className="note-editor-select" value={splitFile ?? ''} onChange={e => setSplitFile(e.target.value || null)} title="Split PDF">
                        <option value="">Split view</option>
                        {pdfNotes.map(n => <option key={n.id} value={n.file_url!}>{n.title}</option>)}
                      </select>
                    )}
                  </>
                )}
              </>
            )}
            <div className="note-editor-mode-toggle">
              <button className={`mode-btn ${mode === 'blocks' ? 'active' : ''}`} onClick={() => setMode('blocks')} title="Block editor">
                <i className="ti ti-layout-list" style={{ fontSize: 12 }} />Build
              </button>
              <button className={`mode-btn ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>
                <i className="ti ti-pencil" style={{ fontSize: 12 }} />Edit
              </button>
              <button className={`mode-btn ${mode === 'view' ? 'active' : ''}`} onClick={() => setMode('view')}>
                <i className="ti ti-eye" style={{ fontSize: 12 }} />View
              </button>
              <button className={`mode-btn ${mode === 'study' ? 'active' : ''}`} onClick={() => setMode('study')}>
                <i className="ti ti-brain" style={{ fontSize: 12 }} />Study
              </button>
            </div>
            <button className="btn btn-accent" onClick={save} disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {focusMode && (
        <div className="focus-bar">
          <button className="btn" onClick={() => setFocusMode(false)} style={{ fontSize: 11 }}>
            <i className="ti ti-arrows-maximize" style={{ fontSize: 12 }} /> Exit Focus
          </button>
          <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{title || 'Untitled'}</span>
          <button className="btn btn-accent" onClick={save} disabled={saving || !title.trim()} style={{ fontSize: 11 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {!focusMode && (
        <div className="note-editor-title-row">
          <input type="text" className="note-editor-title" placeholder="Untitled note" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="text" className="note-editor-concepts" placeholder="Concepts (comma separated), or use #tags inline" value={concepts} onChange={e => setConcepts(e.target.value)} />
        </div>
      )}

      <div className={`note-editor-body ${splitFile ? 'split' : ''}`}>
        {splitFile && (
          <div className="split-pdf-pane">
            <div className="split-pdf-header">
              <span style={{ fontSize: 10, color: 'var(--subtle)', fontWeight: 500 }}>PDF Reference</span>
              <button className="btn" style={{ padding: '1px 5px', fontSize: 10 }} onClick={() => setSplitFile(null)}>
                <i className="ti ti-x" style={{ fontSize: 11 }} />
              </button>
            </div>
            <iframe src={splitFile} className="split-pdf-frame" title="PDF reference" />
          </div>
        )}

        <div className="note-editor-main-pane" style={{ position: 'relative' }}>
          {mode === 'blocks' ? (
            <BlockEditor content={content} onContentChange={setContent} />
          ) : mode === 'preview' ? (
            <BlockEditor content={content} onContentChange={setContent} previewOnly />
          ) : mode === 'view' ? (
            <AnnotatedView content={content} annotations={annotations} onAnnotationsChange={setAnnotations} allNotes={allNotes} onOpenNote={onOpenNote} />
          ) : (
            <div className="note-editor-preview markdown-body">
              {content ? (
                renderMarkdownWithFeatures(getMarkdownContent(content), allNotes, onOpenNote, true)
              ) : (
                <p style={{ color: 'var(--subtle)' }}>Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>

        {!focusMode && showBacklinks && mode === 'blocks' && !splitFile && (
          <BacklinksPanel currentNote={note} allNotes={allNotes} onOpenNote={onOpenNote} />
        )}
      </div>

      <CommandPalette
        visible={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        allNotes={allNotes}
        onOpenNote={onOpenNote}
        onNewNote={onClose}
        onToggleMode={setMode as (mode: string) => void}
        onToggleFocus={() => setFocusMode(v => !v)}
        onInsertTemplate={() => {}}
      />
    </div>
  )
}
