import { useState, useCallback, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './components/Auth/AuthPage'
import Sidebar from './components/Layout/Sidebar'
import Topbar from './components/Layout/Topbar'
import Dashboard from './components/Dashboard/Dashboard'
import QuizPanel from './components/Quiz/QuizPanel'
import NotesPanel from './components/Notes/NotesPanel'
import LeaderboardPanel from './components/Leaderboard/LeaderboardPanel'
import AddCourseModal from './components/ui/AddCourseModal'
import AddNoteModal from './components/ui/AddNoteModal'
import ShareCourseModal from './components/ui/ShareCourseModal'
import StudyTimer from './components/ui/StudyTimer'
import ConceptGraph from './components/Notes/ConceptGraph'
import Toast from './components/ui/Toast'
import { supabase } from './lib/supabase'
import type { Course, Note } from './types/database'

function AppInner() {
  const { user, loading } = useAuth()
  const [activePanel, setActivePanel] = useState('dashboard')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [showShareCourse, setShowShareCourse] = useState(false)
  const [openNewNote, setOpenNewNote] = useState(false)
  const [toast, setToast] = useState('')
  const [noteFilter, setNoteFilter] = useState<{ course?: string; week?: number }>({})
  const [courses, setCourses] = useState<Course[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('courses').select('*').order('code').then(({ data }) => {
      if (data) setCourses(data as Course[])
    })
  }, [user, showAddCourse, showShareCourse])

  useEffect(() => {
    if (!user) return
    supabase.from('notes').select('*').eq('file_type', 'text').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAllNotes(data as Note[])
    })
  }, [user, activePanel])

  const handleFilterByWeek = useCallback((courseCode: string, week: number) => {
    setNoteFilter({ course: courseCode, week })
    setActivePanel('notes')
  }, [])

  function handleNewNote() {
    setActivePanel('notes')
    setOpenNewNote(true)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font)', color: 'var(--subtle)' }}>
        Loading...
      </div>
    )
  }

  if (!user) return <AuthPage />

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    quiz: 'Quiz',
    notes: 'Notes',
    graph: 'Concept Graph',
    leaderboard: 'Leaderboard',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Sidebar
        activePanel={activePanel}
        onNavigate={setActivePanel}
        onFilterByWeek={handleFilterByWeek}
      />

      <div className="main">
        <Topbar
          title={titles[activePanel] ?? activePanel}
          onAddCourse={() => setShowAddCourse(true)}
          onNewNote={handleNewNote}
          onUploadFile={() => setShowUploadFile(true)}
          onShareCourse={() => setShowShareCourse(true)}
        />

        <div className="content">
          {activePanel === 'dashboard' && <Dashboard />}
          {activePanel === 'quiz' && <QuizPanel />}
          {activePanel === 'notes' && (
            <NotesPanel
              filterCourse={noteFilter.course}
              filterWeek={noteFilter.week}
              openNewNote={openNewNote}
              onNewNoteClosed={() => setOpenNewNote(false)}
            />
          )}
          {activePanel === 'graph' && (
            <ConceptGraph
              notes={allNotes}
              onOpenNote={() => {
                setActivePanel('notes')
                setNoteFilter({})
              }}
              onClose={() => setActivePanel('notes')}
            />
          )}
          {activePanel === 'leaderboard' && <LeaderboardPanel />}
        </div>
      </div>

      <div className="study-timer-sidebar">
        <StudyTimer courses={courses} />
      </div>

      <AddCourseModal open={showAddCourse} onClose={() => setShowAddCourse(false)} onSuccess={setToast} />
      <AddNoteModal open={showUploadFile} onClose={() => setShowUploadFile(false)} onSuccess={setToast} />
      <ShareCourseModal open={showShareCourse} onClose={() => setShowShareCourse(false)} onSuccess={setToast} courses={courses} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
