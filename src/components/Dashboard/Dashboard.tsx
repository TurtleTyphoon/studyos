import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Course, QuizAttempt } from '../../types/database'

const BADGE_DEFS = [
  { type: 'first_note', name: 'First Note', icon: 'ti-file-text' },
  { type: 'quiz_starter', name: 'Quiz Starter', icon: 'ti-brain' },
  { type: '7_day_streak', name: '7-Day Streak', icon: 'ti-flame' },
  { type: 'pharm_master', name: 'Pharm Master', icon: 'ti-pill' },
  { type: '10_quizzes', name: '10 Quizzes', icon: 'ti-trophy' },
  { type: 'study_duo', name: 'Study Duo', icon: 'ti-users' },
  { type: 'all_courses', name: 'All Courses', icon: 'ti-books' },
  { type: 'boss_battle', name: 'Boss Battle', icon: 'ti-sword' },
]

export default function Dashboard() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([])
  const [noteCount, setNoteCount] = useState(0)
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [profile])

  async function loadData() {
    if (!profile) return

    const [coursesRes, quizRes, notesRes, badgesRes] = await Promise.all([
      supabase.from('courses').select('*').order('code'),
      supabase.from('quiz_attempts').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('badges').select('badge_type'),
    ])

    if (coursesRes.data) setCourses(coursesRes.data)
    if (quizRes.data) setQuizHistory(quizRes.data)
    setNoteCount(notesRes.count ?? 0)
    if (badgesRes.data) setEarnedBadges(new Set((badgesRes.data as { badge_type: string }[]).map(b => b.badge_type)))
  }

  const level = profile ? Math.floor(profile.xp / 200) + 1 : 1
  const avgScore = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((a, q) => a + Math.round((q.score / q.total_questions) * 100), 0) / quizHistory.length)
    : 0

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">Total XP</div>
          <div className="stat-value">{(profile?.xp ?? 0).toLocaleString()}</div>
          <div className="stat-sub">Level {level}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Streak</div>
          <div className="stat-value">{profile?.streak ?? 0}</div>
          <div className="stat-sub">days in a row</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quizzes</div>
          <div className="stat-value">{quizHistory.length}</div>
          <div className="stat-sub">{quizHistory.length > 0 ? `Avg ${avgScore}%` : 'None yet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Notes</div>
          <div className="stat-value">{noteCount}</div>
          <div className="stat-sub">saved</div>
        </div>
      </div>

      <div className="section-title">Courses</div>
      <div className="grid-2">
        {courses.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <i className="ti ti-books" />
            <p>No courses yet. Add your first course.</p>
          </div>
        )}
        {courses.map(c => (
          <div key={c.id} className="course-card">
            <div className="course-tag">{c.code}</div>
            <div className="course-name">{c.name}</div>
            <div className="course-desc">{c.description}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${c.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">Recent Activity</div>
      {quizHistory.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-history" />
          <p>No activity yet</p>
        </div>
      ) : (
        quizHistory.slice(0, 3).map(h => {
          const pct = Math.round((h.score / h.total_questions) * 100)
          const date = new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 5 }}>
              <i className="ti ti-brain" style={{ fontSize: 13, color: 'var(--text)' }} />
              <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}>Quiz completed</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 70 ? 'var(--green)' : 'var(--red)' }}>{pct}%</span>
              <span style={{ fontSize: 10, color: 'var(--subtle)' }}>{date}</span>
            </div>
          )
        })
      )}

      <div className="section-title">Badges</div>
      <div className="badge-grid">
        {BADGE_DEFS.map(b => (
          <div key={b.type} className={`badge ${earnedBadges.has(b.type) ? 'earned' : ''}`}>
            <i className={`ti ${b.icon}`} />
            <div className="badge-name">{b.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
