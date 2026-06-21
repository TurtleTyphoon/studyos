import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Course } from '../../types/database'
import LearningObjectives from './LearningObjectives'
import AssessmentsPanel from './AssessmentsPanel'

interface Props {
  courseId: string
  onBack: () => void
}

export default function CourseDetailPanel({ courseId, onBack }: Props) {
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [tab, setTab] = useState<'info' | 'objectives' | 'assessments'>('info')
  const [editing, setEditing] = useState(false)
  const [profName, setProfName] = useState('')
  const [profEmail, setProfEmail] = useState('')
  const [officeHours, setOfficeHours] = useState('')
  const [room, setRoom] = useState('')
  const [notesExtra, setNotesExtra] = useState('')

  useEffect(() => {
    supabase.from('courses').select('*').eq('id', courseId).single().then(({ data }) => {
      if (data) {
        const c = data as Course
        setCourse(c)
        setProfName(c.professor_name ?? '')
        setProfEmail(c.professor_email ?? '')
        setOfficeHours(c.office_hours ?? '')
        setRoom(c.room ?? '')
        setNotesExtra(c.notes_extra ?? '')
      }
    })
  }, [courseId])

  async function saveInfo() {
    await supabase.from('courses').update({
      professor_name: profName.trim() || null,
      professor_email: profEmail.trim() || null,
      office_hours: officeHours.trim() || null,
      room: room.trim() || null,
      notes_extra: notesExtra.trim() || null,
    }).eq('id', courseId)
    setEditing(false)
    supabase.from('courses').select('*').eq('id', courseId).single().then(({ data }) => {
      if (data) setCourse(data as Course)
    })
  }

  if (!course) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={onBack}>
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />Back
        </button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{course.code}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{course.name}</div>
        </div>
      </div>

      <div className="note-editor-mode-toggle" style={{ marginBottom: 12 }}>
        <button className={`mode-btn ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
          <i className="ti ti-info-circle" style={{ fontSize: 12 }} />Info
        </button>
        <button className={`mode-btn ${tab === 'objectives' ? 'active' : ''}`} onClick={() => setTab('objectives')}>
          <i className="ti ti-target" style={{ fontSize: 12 }} />Objectives
        </button>
        <button className={`mode-btn ${tab === 'assessments' ? 'active' : ''}`} onClick={() => setTab('assessments')}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 12 }} />Assessments
        </button>
      </div>

      {tab === 'info' && (
        <div className="course-info-panel">
          <div className="info-section">
            <div className="info-section-title">
              <i className="ti ti-user" style={{ fontSize: 13 }} />Professor
              {!editing && (
                <button className="btn" style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px' }} onClick={() => setEditing(true)}>
                  <i className="ti ti-pencil" style={{ fontSize: 11 }} />Edit
                </button>
              )}
            </div>
            {editing ? (
              <div className="info-edit-form">
                <input type="text" placeholder="Professor name" value={profName} onChange={e => setProfName(e.target.value)} />
                <input type="email" placeholder="Email" value={profEmail} onChange={e => setProfEmail(e.target.value)} />
                <input type="text" placeholder="Office hours" value={officeHours} onChange={e => setOfficeHours(e.target.value)} />
                <input type="text" placeholder="Room / location" value={room} onChange={e => setRoom(e.target.value)} />
                <textarea placeholder="Additional notes (textbook, TA info, links, etc.)" value={notesExtra} onChange={e => setNotesExtra(e.target.value)} rows={3} style={{ resize: 'vertical', fontFamily: 'var(--font)', fontSize: 12, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-accent" onClick={saveInfo} style={{ fontSize: 11 }}>Save</button>
                  <button className="btn" onClick={() => setEditing(false)} style={{ fontSize: 11 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <InfoRow label="Name" value={course.professor_name} />
                <InfoRow label="Email" value={course.professor_email} link={course.professor_email ? `mailto:${course.professor_email}` : undefined} />
                <InfoRow label="Office Hours" value={course.office_hours} />
                <InfoRow label="Room" value={course.room} />
                {course.notes_extra && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {course.notes_extra}
                  </div>
                )}
                {!course.professor_name && !course.professor_email && !course.office_hours && !course.room && !course.notes_extra && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--subtle)', fontStyle: 'italic' }}>
                    No professor info added yet. Click Edit to add.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="info-section">
            <div className="info-section-title"><i className="ti ti-book" style={{ fontSize: 13 }} />Course Details</div>
            <div className="info-grid">
              <InfoRow label="Description" value={course.description} />
              <InfoRow label="Weeks" value={String(course.weeks)} />
              <InfoRow label="Progress" value={`${course.progress}%`} />
            </div>
          </div>
        </div>
      )}

      {tab === 'objectives' && user && (
        <LearningObjectives courseId={courseId} userId={user.id} weeks={course.weeks} />
      )}

      {tab === 'assessments' && user && (
        <AssessmentsPanel courseId={courseId} userId={user.id} weeks={course.weeks} />
      )}
    </div>
  )
}

function InfoRow({ label, value, link }: { label: string; value: string | null | undefined; link?: string }) {
  if (!value) return null
  return (
    <>
      <div className="info-label">{label}</div>
      <div className="info-value">
        {link ? <a href={link} style={{ color: 'var(--text)', textDecoration: 'underline' }}>{value}</a> : value}
      </div>
    </>
  )
}
