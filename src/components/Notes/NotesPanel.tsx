import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Note, Course } from '../../types/database'

interface NotesPanelProps {
  filterCourse?: string
  filterWeek?: number
}

export default function NotesPanel({ filterCourse, filterWeek }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [activeCourse, setActiveCourse] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState<string>('')

  useEffect(() => {
    loadCourses()
    loadNotes()
  }, [])

  useEffect(() => {
    if (filterCourse) setActiveCourse(filterCourse)
    if (filterWeek) setWeekFilter(String(filterWeek))
  }, [filterCourse, filterWeek])

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('code')
    if (data) setCourses(data)
  }

  async function loadNotes() {
    const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false })
    if (data) setNotes(data)
  }

  const filtered = notes.filter(n => {
    if (activeCourse !== 'All') {
      const course = courses.find(c => c.id === n.course_id)
      if (!course || course.code !== activeCourse) return false
    }
    if (weekFilter && n.week !== parseInt(weekFilter)) return false
    if (search) {
      const s = search.toLowerCase()
      return n.title.toLowerCase().includes(s) || (n.content?.toLowerCase().includes(s) ?? false)
    }
    return true
  })

  function getCourseName(courseId: string | null) {
    if (!courseId) return 'General'
    return courses.find(c => c.id === courseId)?.code ?? 'General'
  }

  function openFile(url: string) {
    window.open(url, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {['All', ...courses.map(c => c.code)].map(c => (
          <div
            key={c}
            className={`pill ${activeCourse === c ? 'active' : ''}`}
            onClick={() => setActiveCourse(c)}
          >
            {c}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--subtle)', fontSize: 13 }} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '5px 8px 5px 26px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }}
          />
        </div>
        <select
          value={weekFilter}
          onChange={e => setWeekFilter(e.target.value)}
          style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 8px', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }}
        >
          <option value="">All Weeks</option>
          {Array.from({ length: 14 }, (_, i) => (
            <option key={i} value={i + 1}>Week {i + 1}</option>
          ))}
        </select>
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-notes" />
            <p>No notes yet. Upload your first note.</p>
          </div>
        ) : (
          filtered.map(n => (
            <div key={n.id} className="note-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <i className={`ti ${n.file_type === 'pdf' ? 'ti-file-type-pdf' : n.file_type === 'image' ? 'ti-photo' : 'ti-file-text'}`} style={{ fontSize: 13, color: 'var(--text)' }} />
                <div className="note-title-text">{n.title}</div>
                <div className="tag">{getCourseName(n.course_id)}</div>
                {n.week && <div className="tag">Wk {n.week}</div>}
                {n.file_url && (
                  <button className="btn" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => openFile(n.file_url!)}>
                    <i className="ti ti-external-link" style={{ fontSize: 11 }} />
                  </button>
                )}
              </div>
              {n.concepts.length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {n.concepts.map(c => (
                    <div key={c} className="pill" style={{ fontSize: 9, padding: '1px 7px', cursor: 'default' }}>{c}</div>
                  ))}
                </div>
              )}
              {n.content && (
                <div className="note-preview">
                  {n.content.substring(0, 130)}{n.content.length > 130 ? '...' : ''}
                </div>
              )}
              {n.file_type && n.file_type !== 'text' && (
                <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 4 }}>
                  {n.file_name ?? `${n.file_type} attachment`}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
