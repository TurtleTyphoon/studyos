import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { blocksToMarkdown } from '../Notes/BlockEditor'
import type { Note, Course } from '../../types/database'

function getContentAsMarkdown(content: string | null): string {
  if (!content?.trim()) return ''
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return blocksToMarkdown(parsed)
    }
  } catch { /* not JSON */ }
  return content
}

interface Question {
  q: string
  opts: string[]
  correct: number
  explanation: string
  concept: string
  course?: string
}

export default function QuizPanel() {
  const { user, refreshProfile } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [phase, setPhase] = useState<'setup' | 'generating' | 'active' | 'results'>('setup')
  const [selectedNote, setSelectedNote] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(-1)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('notes').select('*').eq('file_type', 'text').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setNotes(data)
    })
    supabase.from('courses').select('*').order('code').then(({ data }) => {
      if (data) setCourses(data)
    })
  }, [])

  function getCourseCode(courseId: string | null) {
    if (!courseId) return 'General'
    return courses.find(c => c.id === courseId)?.code ?? 'General'
  }

  async function generateQuiz() {
    const note = notes.find(n => n.id === selectedNote)
    if (!note || !note.content) return

    setPhase('generating')
    setError('')

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          content: getContentAsMarkdown(note.content),
          title: note.title,
          courseCode: getCourseCode(note.course_id),
          numQuestions,
        },
      })

      if (fnError) throw new Error(fnError.message)
      if (data.error) throw new Error(data.error)

      const qs = data.questions.map((q: Question) => ({
        ...q,
        course: getCourseCode(note.course_id),
      }))

      setQuestions(qs)
      setCurrent(0)
      setScore(0)
      setPhase('active')
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz')
      setPhase('setup')
    }
  }

  function selectAnswer(idx: number) {
    if (answered) return
    setSelectedAnswer(idx)
    setAnswered(true)
    if (idx === questions[current].correct) {
      setScore(s => s + 1)
    }
  }

  function nextQuestion() {
    setAnswered(false)
    setSelectedAnswer(-1)
    if (current + 1 >= questions.length) {
      finishQuiz()
    } else {
      setCurrent(c => c + 1)
    }
  }

  async function finishQuiz() {
    setPhase('results')
    if (!user) return

    const xp = score * 10 + (Math.round((score / questions.length) * 100) >= 80 ? 50 : 0)

    await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      course_code: questions[0]?.course ?? null,
      score,
      total_questions: questions.length,
      xp_earned: xp,
    })

    if (xp > 0) {
      await supabase.rpc('add_xp', { user_uuid: user.id, amount: xp })
      await supabase.rpc('update_streak', { user_uuid: user.id })
      await refreshProfile()
    }
  }

  if (phase === 'setup') {
    return (
      <div>
        <div className="section-title">Generate Quiz from Notes</div>
        <div className="quiz-wrap">
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Select a note and AI will generate quiz questions based on its content.
          </p>

          <select
            value={selectedNote}
            onChange={e => setSelectedNote(e.target.value)}
            style={{ width: '100%', background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 9px', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, marginBottom: 8, outline: 'none' }}
          >
            <option value="">Select a note...</option>
            {notes.map(n => (
              <option key={n.id} value={n.id}>
                {n.title} ({getCourseCode(n.course_id)})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="stat-label" style={{ marginBottom: 4 }}>Questions</div>
              <select
                value={numQuestions}
                onChange={e => setNumQuestions(parseInt(e.target.value))}
                style={{ width: '100%', background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 8px', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--red)', padding: '6px 8px', background: 'var(--red-bg)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-accent"
            style={{ width: '100%', justifyContent: 'center', padding: 9, fontSize: 12 }}
            onClick={generateQuiz}
            disabled={!selectedNote}
          >
            <i className="ti ti-sparkles" />Generate Quiz
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'generating') {
    return (
      <div className="empty-state" style={{ padding: '60px 16px' }}>
        <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 8, fontSize: 12 }}>Generating questions from your notes...</p>
      </div>
    )
  }

  if (phase === 'results') {
    const pct = Math.round((score / questions.length) * 100)
    const xp = score * 10 + (pct >= 80 ? 50 : 0)
    return (
      <div className="quiz-wrap" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: -2, marginBottom: 3 }}>{pct}%</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          {pct >= 90 ? 'Outstanding work.' : pct >= 70 ? 'Strong result. Keep going.' : pct >= 50 ? 'Good effort. Review the weak spots.' : 'Keep at it -- repetition builds retention.'}
        </div>
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <div className="stat-card"><div className="stat-label">Correct</div><div className="stat-value" style={{ color: 'var(--green)' }}>{score}</div></div>
          <div className="stat-card"><div className="stat-label">Wrong</div><div className="stat-value" style={{ color: 'var(--red)' }}>{questions.length - score}</div></div>
          <div className="stat-card"><div className="stat-label">XP Earned</div><div className="stat-value">+{xp}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
          <button className="btn" onClick={() => { setPhase('setup'); setQuestions([]) }}>
            <i className="ti ti-refresh" />Try Again
          </button>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const total = questions.length
  const progress = Math.round((current / total) * 100)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 1 }}>
          <div style={{ height: '100%', background: 'var(--text)', borderRadius: 1, transition: '.3s', width: `${progress}%` }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{current + 1}/{total}</span>
      </div>
      <div className="quiz-wrap">
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <div className="tag">{q.course}</div>
          <div className="tag">{q.concept}</div>
        </div>
        <div className="question-text">{q.q}</div>
        <div>
          {q.opts.map((opt, i) => {
            let cls = 'option'
            if (answered) {
              if (i === q.correct) cls += ' correct'
              else if (i === selectedAnswer) cls += ' wrong'
            }
            return (
              <div key={i} className={cls} onClick={() => selectAnswer(i)}
                style={answered && i !== q.correct && i !== selectedAnswer ? { opacity: 0.35 } : undefined}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            )
          })}
        </div>
        {answered && (
          <>
            <div style={{ marginTop: 10, padding: '9px 11px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.55, borderLeft: '2px solid var(--text)' }}>
              {q.explanation}
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12, fontSize: 12 }} onClick={nextQuestion}>
              <i className="ti ti-arrow-right" />{current + 1 >= total ? 'See Results' : 'Next'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
