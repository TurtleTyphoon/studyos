import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'
import type { Course } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
  courses: Course[]
}

export default function ShareCourseModal({ open, onClose, onSuccess, courses }: Props) {
  const [tab, setTab] = useState<'share' | 'join'>('join')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    if (!selectedCourse) return
    setLoading(true)
    const { data, error } = await supabase.rpc('share_course', { course_uuid: selectedCourse })
    if (!error && data) {
      setGeneratedCode(data)
      onSuccess('Course shared')
    }
    setLoading(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading(true)
    const { error } = await supabase.rpc('join_course', { code: joinCode.trim() })
    if (error) {
      onSuccess('Invalid invite code')
    } else {
      onSuccess('Joined course')
      onClose()
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Shared Courses">
      <div className="note-editor-mode-toggle" style={{ marginBottom: 10 }}>
        <button className={`mode-btn ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>
          Join Course
        </button>
        <button className={`mode-btn ${tab === 'share' ? 'active' : ''}`} onClick={() => setTab('share')}>
          Share Course
        </button>
      </div>

      {tab === 'join' ? (
        <>
          <input
            type="text"
            placeholder="Enter invite code (e.g. ABC123)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, letterSpacing: 4 }}
          />
          <div className="modal-actions">
            <button className="btn btn-accent" onClick={handleJoin} disabled={loading || joinCode.length < 6} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setGeneratedCode('') }}>
            <option value="">Select a course to share</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} -- {c.name}</option>
            ))}
          </select>

          {generatedCode ? (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--subtle)', marginBottom: 4 }}>Share this code with classmates</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 4, color: 'var(--text)' }}>{generatedCode}</div>
              <button
                className="btn"
                style={{ margin: '10px auto 0', fontSize: 11 }}
                onClick={() => { navigator.clipboard.writeText(generatedCode); onSuccess('Code copied') }}
              >
                <i className="ti ti-copy" style={{ fontSize: 12 }} />Copy Code
              </button>
            </div>
          ) : (
            <div className="modal-actions">
              <button className="btn btn-accent" onClick={handleShare} disabled={loading || !selectedCourse} style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Sharing...' : 'Generate Invite Code'}
              </button>
              <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
