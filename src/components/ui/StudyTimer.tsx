import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Course } from '../../types/database'

interface StudyTimerProps {
  courses: Course[]
}

export default function StudyTimer({ courses }: StudyTimerProps) {
  const { user, refreshProfile } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [mode, setMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch')
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25)
  const [courseId, setCourseId] = useState('')
  const [sessionsToday, setSessionsToday] = useState(0)
  const [totalToday, setTotalToday] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    loadTodayStats()
  }, [user])

  async function loadTodayStats() {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('study_sessions')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .gte('started_at', today)

    if (data) {
      setSessionsToday(data.length)
      setTotalToday(data.reduce((sum, s) => sum + s.duration_seconds, 0))
    }
  }

  const saveSession = useCallback(async (duration: number) => {
    if (!user || duration < 30) return
    await supabase.from('study_sessions').insert({
      user_id: user.id,
      course_id: courseId || null,
      duration_seconds: duration,
    })

    const xp = Math.floor(duration / 60) * 2
    if (xp > 0) {
      await supabase.rpc('add_xp', { user_uuid: user.id, amount: xp })
      await supabase.rpc('update_streak', { user_uuid: user.id })
      await refreshProfile()
    }

    loadTodayStats()
  }, [user, courseId, refreshProfile])

  function start() {
    setIsRunning(true)
    startTimeRef.current = Date.now()
    if (mode === 'pomodoro') {
      setSeconds(pomodoroMinutes * 60)
    }
  }

  function stop() {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const elapsed = mode === 'pomodoro'
      ? (pomodoroMinutes * 60) - seconds
      : seconds

    saveSession(elapsed)

    setSeconds(0)
  }

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = window.setInterval(() => {
      setSeconds(prev => {
        if (mode === 'pomodoro') {
          if (prev <= 1) {
            setIsRunning(false)
            saveSession(pomodoroMinutes * 60)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('StudyOS', { body: 'Pomodoro complete! Take a break.' })
            }
            return 0
          }
          return prev - 1
        }
        return prev + 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, mode, pomodoroMinutes, saveSession])

  function formatTime(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  function formatDuration(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <div className="study-timer">
      <div className="study-timer-display">
        <div className="study-timer-time">{formatTime(seconds)}</div>
        <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 2 }}>
          {isRunning ? (mode === 'pomodoro' ? 'Focus session' : 'Studying...') : 'Ready'}
        </div>
      </div>

      {!isRunning && (
        <div className="study-timer-controls">
          <div className="note-editor-mode-toggle" style={{ marginBottom: 6 }}>
            <button className={`mode-btn ${mode === 'stopwatch' ? 'active' : ''}`} onClick={() => setMode('stopwatch')}>
              Open
            </button>
            <button className={`mode-btn ${mode === 'pomodoro' ? 'active' : ''}`} onClick={() => setMode('pomodoro')}>
              Pomodoro
            </button>
          </div>

          {mode === 'pomodoro' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {[15, 25, 45, 60].map(m => (
                <button
                  key={m}
                  className={`pill ${pomodoroMinutes === m ? 'active' : ''}`}
                  onClick={() => setPomodoroMinutes(m)}
                  style={{ fontSize: 10 }}
                >
                  {m}m
                </button>
              ))}
            </div>
          )}

          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            className="note-editor-select"
            style={{ width: '100%', marginBottom: 6 }}
          >
            <option value="">No course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
      )}

      <button
        className={`btn ${isRunning ? '' : 'btn-accent'}`}
        style={{ width: '100%', justifyContent: 'center', padding: 7 }}
        onClick={isRunning ? stop : start}
      >
        <i className={`ti ${isRunning ? 'ti-player-stop' : 'ti-player-play'}`} style={{ fontSize: 13 }} />
        {isRunning ? 'Stop' : 'Start'}
      </button>

      <div className="study-timer-stats">
        <div className="study-timer-stat">
          <div className="stat-label">Today</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{formatDuration(totalToday)}</div>
        </div>
        <div className="study-timer-stat">
          <div className="stat-label">Sessions</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{sessionsToday}</div>
        </div>
      </div>
    </div>
  )
}
