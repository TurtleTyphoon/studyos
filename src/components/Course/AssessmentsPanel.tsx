import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Assessment {
  id: string
  title: string
  type: string
  due_date: string | null
  weight: number | null
  weeks: number[]
  description: string | null
  grade: number | null
  completed: boolean
  created_at: string
}

const TYPES = ['assignment', 'quiz', 'test', 'midterm', 'exam', 'project', 'lab']
const TYPE_ICONS: Record<string, string> = {
  assignment: 'ti-homework',
  quiz: 'ti-brain',
  test: 'ti-clipboard-check',
  midterm: 'ti-file-check',
  exam: 'ti-certificate',
  project: 'ti-code',
  lab: 'ti-flask',
}

interface Props {
  courseId: string
  userId: string
  weeks: number
}

export default function AssessmentsPanel({ courseId, userId, weeks }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('assignment')
  const [dueDate, setDueDate] = useState('')
  const [weight, setWeight] = useState('')
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  const [description, setDescription] = useState('')

  useEffect(() => {
    loadAssessments()
  }, [courseId])

  async function loadAssessments() {
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at')
    if (data) setAssessments(data)
  }

  async function addAssessment() {
    if (!title.trim()) return
    await supabase.from('assessments').insert({
      user_id: userId,
      course_id: courseId,
      title: title.trim(),
      type,
      due_date: dueDate || null,
      weight: weight ? parseFloat(weight) : null,
      weeks: selectedWeeks,
      description: description.trim() || null,
    })
    setTitle(''); setType('assignment'); setDueDate(''); setWeight('')
    setSelectedWeeks([]); setDescription(''); setShowForm(false)
    loadAssessments()
  }

  async function toggleComplete(id: string, completed: boolean) {
    await supabase.from('assessments').update({ completed: !completed }).eq('id', id)
    loadAssessments()
  }

  async function updateGrade(id: string, grade: string) {
    await supabase.from('assessments').update({ grade: grade ? parseFloat(grade) : null }).eq('id', id)
    loadAssessments()
  }

  async function deleteAssessment(id: string) {
    await supabase.from('assessments').delete().eq('id', id)
    loadAssessments()
  }

  function toggleWeek(wk: number) {
    setSelectedWeeks(prev =>
      prev.includes(wk) ? prev.filter(w => w !== wk) : [...prev, wk].sort((a, b) => a - b)
    )
  }

  function formatDate(d: string | null) {
    if (!d) return null
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function daysUntil(d: string | null) {
    if (!d) return null
    const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000)
    if (diff < 0) return 'past'
    if (diff === 0) return 'today'
    if (diff === 1) return 'tomorrow'
    return `${diff}d`
  }

  const totalWeight = assessments.reduce((s, a) => s + (a.weight ?? 0), 0)
  const graded = assessments.filter(a => a.grade !== null && a.weight)
  const weightedAvg = graded.length > 0
    ? graded.reduce((s, a) => s + (a.grade! * (a.weight ?? 0)), 0) / graded.reduce((s, a) => s + (a.weight ?? 0), 0)
    : null

  const upcoming = assessments.filter(a => !a.completed && a.due_date).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const completed = assessments.filter(a => a.completed)
  const noDate = assessments.filter(a => !a.completed && !a.due_date)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <button className="btn btn-accent" onClick={() => setShowForm(!showForm)} style={{ fontSize: 11 }}>
          <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'}`} style={{ fontSize: 12 }} />
          {showForm ? 'Cancel' : 'Add Assessment'}
        </button>
        {totalWeight > 0 && (
          <span style={{ fontSize: 10, color: 'var(--subtle)' }}>
            Total weight: {totalWeight}%
            {weightedAvg !== null && ` | Avg: ${weightedAvg.toFixed(1)}%`}
          </span>
        )}
      </div>

      {showForm && (
        <div className="assessment-form">
          <input type="text" placeholder="Title (e.g. Midterm Exam)" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={type} onChange={e => setType(e.target.value)} style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }} />
            <input type="number" placeholder="Weight %" value={weight} onChange={e => setWeight(e.target.value)} style={{ width: 70, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--subtle)', marginBottom: 3 }}>Content covers weeks:</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {Array.from({ length: Math.min(weeks, 14) }, (_, i) => {
                const wk = i + 1
                return (
                  <button
                    key={wk}
                    className={`pill ${selectedWeeks.includes(wk) ? 'active' : ''}`}
                    onClick={() => toggleWeek(wk)}
                    style={{ fontSize: 9, padding: '2px 6px' }}
                  >
                    {wk}
                  </button>
                )
              })}
            </div>
          </div>
          <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <button className="btn btn-accent" onClick={addAssessment} disabled={!title.trim()} style={{ fontSize: 11 }}>Add</button>
        </div>
      )}

      {assessments.length === 0 && !showForm && (
        <div className="empty-state" style={{ padding: 24 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 20 }} />
          <p style={{ fontSize: 11 }}>No assessments added yet.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, marginTop: 6 }}>UPCOMING</div>
          {upcoming.map(a => <AssessmentCard key={a.id} a={a} onToggle={toggleComplete} onGrade={updateGrade} onDelete={deleteAssessment} />)}
        </>
      )}

      {noDate.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, marginTop: 10 }}>NO DATE</div>
          {noDate.map(a => <AssessmentCard key={a.id} a={a} onToggle={toggleComplete} onGrade={updateGrade} onDelete={deleteAssessment} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, marginTop: 10 }}>COMPLETED</div>
          {completed.map(a => <AssessmentCard key={a.id} a={a} onToggle={toggleComplete} onGrade={updateGrade} onDelete={deleteAssessment} />)}
        </>
      )}
    </div>
  )

  function AssessmentCard({ a, onToggle, onGrade, onDelete }: { a: Assessment; onToggle: (id: string, c: boolean) => void; onGrade: (id: string, g: string) => void; onDelete: (id: string) => void }) {
    const [editGrade, setEditGrade] = useState(false)
    const [gradeVal, setGradeVal] = useState(a.grade?.toString() ?? '')
    const countdown = daysUntil(a.due_date)
    const isUrgent = countdown === 'today' || countdown === 'tomorrow'

    return (
      <div className={`assessment-card ${a.completed ? 'completed' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button
            className={`objective-check ${a.completed ? 'done' : ''}`}
            onClick={() => onToggle(a.id, a.completed)}
            style={{ marginTop: 2 }}
          >
            {a.completed && <i className="ti ti-check" style={{ fontSize: 10 }} />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <i className={`ti ${TYPE_ICONS[a.type] ?? 'ti-file'}`} style={{ fontSize: 12, color: 'var(--muted)' }} />
              <span style={{ fontWeight: 500, fontSize: 12, textDecoration: a.completed ? 'line-through' : undefined }}>{a.title}</span>
              <span className="tag">{a.type}</span>
              {a.weight && <span className="tag">{a.weight}%</span>}
              {a.due_date && (
                <span className="tag" style={isUrgent && !a.completed ? { background: 'var(--red-bg)', color: 'var(--red)' } : undefined}>
                  {formatDate(a.due_date)}
                  {countdown && countdown !== 'past' && ` (${countdown})`}
                </span>
              )}
              {a.grade !== null && (
                <span className="tag" style={{ background: a.grade >= 70 ? 'var(--green-bg)' : 'var(--red-bg)', color: a.grade >= 70 ? 'var(--green)' : 'var(--red)' }}>
                  {a.grade}%
                </span>
              )}
            </div>
            {a.weeks.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 2 }}>
                Covers: {a.weeks.map(w => `Wk ${w}`).join(', ')}
              </div>
            )}
            {a.description && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{a.description}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {editGrade ? (
              <div style={{ display: 'flex', gap: 3 }}>
                <input
                  type="number"
                  value={gradeVal}
                  onChange={e => setGradeVal(e.target.value)}
                  placeholder="%"
                  style={{ width: 50, padding: '2px 5px', fontSize: 10, border: '1px solid var(--border)', borderRadius: 3, outline: 'none' }}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { onGrade(a.id, gradeVal); setEditGrade(false) } }}
                />
                <button className="btn" style={{ padding: '1px 5px', fontSize: 9 }} onClick={() => { onGrade(a.id, gradeVal); setEditGrade(false) }}>
                  <i className="ti ti-check" style={{ fontSize: 10 }} />
                </button>
              </div>
            ) : (
              <button className="btn" style={{ padding: '1px 5px', fontSize: 9, color: 'var(--subtle)' }} onClick={() => setEditGrade(true)} title="Add grade">
                <i className="ti ti-chart-bar" style={{ fontSize: 10 }} />
              </button>
            )}
            <button className="btn" style={{ padding: '1px 5px', fontSize: 9, color: 'var(--subtle)' }} onClick={() => onDelete(a.id)}>
              <i className="ti ti-trash" style={{ fontSize: 10 }} />
            </button>
          </div>
        </div>
      </div>
    )
  }
}
