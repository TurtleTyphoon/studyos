import { useAuth } from '../../hooks/useAuth'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Course } from '../../types/database'

interface SidebarProps {
  activePanel: string
  onNavigate: (panel: string) => void
  onFilterByWeek: (courseCode: string, week: number) => void
}

export default function Sidebar({ activePanel, onNavigate, onFilterByWeek }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCourses()
    const channel = supabase
      .channel('courses-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => loadCourses())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('code')
    if (data) setCourses(data)
  }

  function toggleCourse(id: string) {
    setOpenCourses(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const level = profile ? Math.floor(profile.xp / 200) + 1 : 1

  const navItems = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'quiz', icon: 'brain', label: 'Quiz' },
    { id: 'notes', icon: 'notes', label: 'Notes' },
    { id: 'leaderboard', icon: 'trophy', label: 'Leaderboard' },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="app-title">StudyOS</div>
        <div className="app-sub">Academic hub</div>
      </div>

      <div className="nav-section">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <i className={`ti ti-${item.icon}`} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="nav-label" style={{ marginTop: 4 }}>Courses</div>
      <div className="course-tree">
        {courses.map(course => (
          <div key={course.id}>
            <div
              className={`tree-course-header ${openCourses.has(course.id) ? 'open' : ''}`}
              onClick={() => toggleCourse(course.id)}
            >
              <i
                className="ti ti-chevron-right"
                style={{
                  fontSize: 11,
                  transition: '.2s',
                  transform: openCourses.has(course.id) ? 'rotate(90deg)' : undefined,
                }}
              />
              <span>{course.code}</span>
            </div>
            <div className={`tree-children ${openCourses.has(course.id) ? 'open' : ''}`}>
              {Array.from({ length: Math.min(course.weeks, 14) }, (_, i) => (
                <div
                  key={i}
                  className="tree-child"
                  onClick={() => onFilterByWeek(course.code, i + 1)}
                >
                  Week {i + 1}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{profile?.display_name?.[0]?.toUpperCase() ?? '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{profile?.display_name ?? 'User'}</div>
            <div className="user-xp">{(profile?.xp ?? 0).toLocaleString()} XP · Lv {level}</div>
          </div>
          <button
            className="btn"
            style={{ padding: '3px 5px', border: 'none', background: 'none' }}
            onClick={signOut}
            title="Sign out"
          >
            <i className="ti ti-logout" style={{ fontSize: 13, color: 'var(--subtle)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
