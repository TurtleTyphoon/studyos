import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Note, Course } from '../../types/database'

interface NoteEditorProps {
  note: Note | null
  courses: Course[]
  allNotes: Note[]
  onSave: () => void
  onClose: () => void
  onOpenNote: (note: Note) => void
}

function ActiveRecallBlock({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div
      className={`recall-block ${revealed ? 'revealed' : ''}`}
      onClick={() => setRevealed(!revealed)}
    >
      <div className="recall-header">
        <i className="ti ti-brain" style={{ fontSize: 12 }} />
        <span>Active Recall</span>
        <span className="recall-hint">{revealed ? 'click to hide' : 'click to reveal'}</span>
      </div>
      <div className={`recall-content ${revealed ? 'show' : ''}`}>
        {children}
      </div>
      {!revealed && <div className="recall-placeholder">Tap to test your recall</div>}
    </div>
  )
}

function renderMarkdownWithFeatures(
  content: string,
  allNotes: Note[],
  onOpenNote: (note: Note) => void,
  isStudyMode: boolean,
) {
  const parts = content.split(/(\?\?[^?]+\?\?|\[\[[^\]]+\]\])/g)

  return parts.map((part, i) => {
    if (part.startsWith('??') && part.endsWith('??')) {
      const inner = part.slice(2, -2).trim()
      if (isStudyMode) {
        return <ActiveRecallBlock key={i}><ReactMarkdown remarkPlugins={[remarkGfm]}>{inner}</ReactMarkdown></ActiveRecallBlock>
      }
      return (
        <div key={i} className="recall-block revealed" style={{ opacity: 0.9 }}>
          <div className="recall-header">
            <i className="ti ti-brain" style={{ fontSize: 12 }} />
            <span>Active Recall</span>
          </div>
          <div className="recall-content show">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{inner}</ReactMarkdown>
          </div>
        </div>
      )
    }

    if (part.startsWith('[[') && part.endsWith(']]')) {
      const linkTitle = part.slice(2, -2).trim()
      const linked = allNotes.find(n =>
        n.title.toLowerCase() === linkTitle.toLowerCase()
      )
      return (
        <span
          key={i}
          className={`concept-link ${linked ? 'exists' : 'missing'}`}
          onClick={e => {
            e.stopPropagation()
            if (linked) onOpenNote(linked)
          }}
          title={linked ? `Open "${linked.title}"` : `No note found: "${linkTitle}"`}
        >
          {linkTitle}
        </span>
      )
    }

    if (!part) return null
    return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>
  })
}

export default function NoteEditor({ note, courses, allNotes, onSave, onClose, onOpenNote }: NoteEditorProps) {
  const { user, refreshProfile } = useAuth()
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [courseId, setCourseId] = useState(note?.course_id ?? '')
  const [week, setWeek] = useState(note?.week?.toString() ?? '')
  const [concepts, setConcepts] = useState(note?.concepts?.join(', ') ?? '')
  const [mode, setMode] = useState<'edit' | 'preview' | 'study'>('edit')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [splitFile, setSplitFile] = useState<string | null>(null)
  const [showLinkSuggest, setShowLinkSuggest] = useState(false)
  const [linkQuery, setLinkQuery] = useState('')
  const [linkPos, setLinkPos] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isNew = !note

  const save = useCallback(async () => {
    if (!title.trim() || !user) return
    setSaving(true)

    const payload = {
      title: title.trim(),
      content,
      course_id: courseId || null,
      week: week ? parseInt(week) : null,
      concepts: concepts.split(',').map(c => c.trim()).filter(Boolean),
      file_type: 'text' as const,
    }

    if (isNew) {
      const { error } = await supabase.from('notes').insert({
        ...payload,
        user_id: user.id,
      })
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
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [save])

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)

    const pos = e.target.selectionStart
    const textBefore = val.slice(0, pos)
    const match = textBefore.match(/\[\[([^\]]*)$/)

    if (match) {
      setLinkQuery(match[1].toLowerCase())
      setShowLinkSuggest(true)
      const textarea = textareaRef.current
      if (textarea) {
        setLinkPos({ top: textarea.offsetTop + 30, left: textarea.offsetLeft + 20 })
      }
    } else {
      setShowLinkSuggest(false)
    }
  }

  function insertLink(noteTitle: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const pos = textarea.selectionStart
    const textBefore = content.slice(0, pos)
    const bracketStart = textBefore.lastIndexOf('[[')
    if (bracketStart === -1) return

    const before = content.slice(0, bracketStart)
    const after = content.slice(pos)
    const newContent = `${before}[[${noteTitle}]]${after}`
    setContent(newContent)
    setShowLinkSuggest(false)

    setTimeout(() => {
      const newPos = bracketStart + noteTitle.length + 4
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  function insertRecallBlock() {
    const textarea = textareaRef.current
    if (!textarea) return
    const pos = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(pos, end)

    const block = selected
      ? `??${selected}??`
      : '??Your answer here??'

    const newContent = content.slice(0, pos) + block + content.slice(end)
    setContent(newContent)

    setTimeout(() => {
      textarea.focus()
      if (!selected) {
        textarea.setSelectionRange(pos + 2, pos + 2 + 'Your answer here'.length)
      }
    }, 0)
  }

  const linkSuggestions = allNotes
    .filter(n => n.id !== note?.id && n.title.toLowerCase().includes(linkQuery))
    .slice(0, 5)

  const pdfNotes = allNotes.filter(n => n.file_type === 'pdf' && n.file_url)

  return (
    <div className="note-editor">
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

          {mode === 'edit' && (
            <>
              <button className="btn" onClick={insertRecallBlock} title="Insert active recall block (??...??)">
                <i className="ti ti-brain" style={{ fontSize: 12 }} />??
              </button>
              {pdfNotes.length > 0 && (
                <select
                  className="note-editor-select"
                  value={splitFile ?? ''}
                  onChange={e => setSplitFile(e.target.value || null)}
                  title="Open PDF side-by-side"
                >
                  <option value="">Split view</option>
                  {pdfNotes.map(n => (
                    <option key={n.id} value={n.file_url!}>{n.title}</option>
                  ))}
                </select>
              )}
            </>
          )}

          <div className="note-editor-mode-toggle">
            <button className={`mode-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')}>
              <i className="ti ti-pencil" style={{ fontSize: 12 }} />Edit
            </button>
            <button className={`mode-btn ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>
              <i className="ti ti-eye" style={{ fontSize: 12 }} />Preview
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

      <div className="note-editor-title-row">
        <input
          type="text"
          className="note-editor-title"
          placeholder="Untitled note"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          type="text"
          className="note-editor-concepts"
          placeholder="Concepts (comma separated)"
          value={concepts}
          onChange={e => setConcepts(e.target.value)}
        />
      </div>

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
          {mode === 'edit' ? (
            <>
              <textarea
                ref={textareaRef}
                className="note-editor-textarea"
                placeholder={'Start writing... (Markdown supported)\n\nTips:\n  ?? hidden answer ??  →  Active recall block\n  [[Note Title]]        →  Link to another note'}
                value={content}
                onChange={handleTextareaChange}
                spellCheck
              />
              {showLinkSuggest && linkSuggestions.length > 0 && (
                <div className="link-suggest" style={{ top: linkPos.top, left: linkPos.left }}>
                  {linkSuggestions.map(n => (
                    <div
                      key={n.id}
                      className="link-suggest-item"
                      onClick={() => insertLink(n.title)}
                    >
                      <i className="ti ti-file-text" style={{ fontSize: 11, color: 'var(--subtle)' }} />
                      {n.title}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="note-editor-preview markdown-body">
              {content ? (
                renderMarkdownWithFeatures(content, allNotes, onOpenNote, mode === 'study')
              ) : (
                <p style={{ color: 'var(--subtle)' }}>Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
