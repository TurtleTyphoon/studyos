import { useState, useCallback } from 'react'
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
import Toast from './components/ui/Toast'

function AppInner() {
  const { user, loading } = useAuth()
  const [activePanel, setActivePanel] = useState('dashboard')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [openNewNote, setOpenNewNote] = useState(false)
  const [toast, setToast] = useState('')
  const [noteFilter, setNoteFilter] = useState<{ course?: string; week?: number }>({})

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
          {activePanel === 'leaderboard' && <LeaderboardPanel />}
        </div>
      </div>

      <AddCourseModal open={showAddCourse} onClose={() => setShowAddCourse(false)} onSuccess={setToast} />
      <AddNoteModal open={showUploadFile} onClose={() => setShowUploadFile(false)} onSuccess={setToast} />
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
