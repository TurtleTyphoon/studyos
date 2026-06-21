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
import ConceptGraph from './components/Notes/ConceptGraph'
import CourseDetailPanel from './components/Course/CourseDetailPanel'
import Toast from './components/ui/Toast'
import { supabase } from './lib/supabase'
import type { Course, Note } from './types/database'

const TUTORIAL_CONTENT = `# Welcome to StudyOS

Your personal study hub. Here's a quick guide to get the most out of it.

---

## Writing Notes

StudyOS uses **Markdown** for formatting. Here are some things you can do:

### Slash Commands
Type \`/\` at the start of a line to open the command menu:
- \`/table\` -- insert a markdown table
- \`/drug-card\` -- pharmacology reference card template
- \`/lab-values\` -- lab reference ranges template
- \`/callout\` -- important note block
- \`/recall\` -- active recall block for studying

### Active Recall Blocks
Wrap text in \`?? ... ??\` to create hidden blocks that reveal on click in **Study mode**:

??This is a hidden answer. Switch to Study mode to test yourself!??

### Concept Linking
Type \`[[Note Title]]\` to link between notes. An autocomplete menu appears as you type.

### Image Paste
Press **Cmd+V** to paste screenshots directly into your notes. They upload automatically.

---

## Features Overview

| Feature | How to Access |
|---------|--------------|
| **Note Editor** | Click "Write Note" in the topbar |
| **Node View** | Toggle grid icon in Notes panel |
| **Concept Graph** | Click "Graph" in the sidebar |
| **AI Quiz** | Click "Quiz" in the sidebar, select a note |
| **Shared Courses** | Click "Share" in the topbar |
| **Course Details** | Click any course card on the Dashboard |
| **Learning Objectives** | Course Detail > Objectives tab |
| **Assessments** | Course Detail > Assessments tab |
| **Professor Info** | Course Detail > Info tab, or when adding a course |

---

## Study Modes

Switch between **Edit**, **Preview**, and **Study** using the toggle in the note editor:

- **Edit** -- write and format your notes
- **Preview** -- see rendered markdown with concept links
- **Study** -- recall blocks become interactive, tap to reveal

---

## Tips

- **Add concepts** (comma-separated tags) to your notes so they appear in the Graph
- Create **assessments** with due dates and weights to track your grades
- Set **learning objectives** per week to stay on track
- **Share courses** with classmates using invite codes

Happy studying!
`

function AppInner() {
  const { user, loading } = useAuth()
  const [activePanel, setActivePanel] = useState('dashboard')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [showShareCourse, setShowShareCourse] = useState(false)
  const [openNewNote, setOpenNewNote] = useState(false)
  const [toast, setToast] = useState('')
  const [noteFilter, setNoteFilter] = useState<{ course?: string; week?: number }>({})
  const [viewCourseId, setViewCourseId] = useState<string | null>(null)
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

  useEffect(() => {
    if (!user) return
    supabase.from('notes').select('id').eq('user_id', user.id).eq('title', 'Welcome to StudyOS').then(({ data }) => {
      if (data && data.length === 0) {
        supabase.from('notes').insert({
          user_id: user.id,
          title: 'Welcome to StudyOS',
          file_type: 'text',
          concepts: ['tutorial', 'getting-started'],
          content: TUTORIAL_CONTENT,
        })
      }
    })
  }, [user])

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
        onNavigate={(panel) => { setActivePanel(panel); if (panel !== 'dashboard') setViewCourseId(null) }}
        onFilterByWeek={handleFilterByWeek}
        onViewCourse={setViewCourseId}
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
          {activePanel === 'dashboard' && !viewCourseId && <Dashboard onViewCourse={setViewCourseId} />}
          {activePanel === 'dashboard' && viewCourseId && (
            <CourseDetailPanel courseId={viewCourseId} onBack={() => setViewCourseId(null)} />
          )}
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
