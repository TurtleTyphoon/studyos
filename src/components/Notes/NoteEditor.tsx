import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Note, Course } from '../../types/database'

interface NoteEditorProps {
  note: Note | null
  courses: Course[]
  onSave: () => void
  onClose: () => void
}

export default function NoteEditor({ note, courses, onSave, onClose }: NoteEditorProps) {
  const { user, refreshProfile } = useAuth()
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [courseId, setCourseId] = useState(note?.course_id ?? '')
  const [week, setWeek] = useState(note?.week?.toString() ?? '')
  const [concepts, setConcepts] = useState(note?.concepts?.join(', ') ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

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
          <div className="note-editor-mode-toggle">
            <button className={`mode-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')}>
              <i className="ti ti-pencil" style={{ fontSize: 12 }} />Edit
            </button>
            <button className={`mode-btn ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>
              <i className="ti ti-eye" style={{ fontSize: 12 }} />Preview
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

      <div className="note-editor-body">
        {mode === 'edit' ? (
          <textarea
            className="note-editor-textarea"
            placeholder="Start writing... (Markdown supported)"
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck
          />
        ) : (
          <div className="note-editor-preview markdown-body">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p style={{ color: 'var(--subtle)' }}>Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
