import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Course } from '../../types/database'
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}

export default function AddNoteModal({ open, onClose, onSuccess }: Props) {
  const { user, refreshProfile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [week, setWeek] = useState('')
  const [concepts, setConcepts] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      supabase.from('courses').select('*').order('code').then(({ data }) => {
        if (data) setCourses(data)
      })
    }
  }, [open])

  function getFileType(f: File): string {
    if (f.type === 'application/pdf') return 'pdf'
    if (f.type.startsWith('image/')) return 'image'
    return 'text'
  }

  async function handleSubmit() {
    if (!title.trim() || !user) return
    if (!content.trim() && !file) return

    setUploading(true)
    let fileUrl: string | null = null
    let fileType: string | null = file ? getFileType(file) : 'text'
    let fileName: string | null = file?.name ?? null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('note-attachments')
        .upload(path, file)

      if (error) {
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('note-attachments')
        .getPublicUrl(path)
      fileUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      title: title.trim(),
      course_id: courseId || null,
      week: week ? parseInt(week) : null,
      concepts: concepts.split(',').map(c => c.trim()).filter(Boolean),
      content: content.trim() || null,
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
    })

    if (!error) {
      await supabase.rpc('add_xp', { user_uuid: user.id, amount: 15 })
      await refreshProfile()
      setTitle(''); setCourseId(''); setWeek(''); setConcepts(''); setContent(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onClose()
      onSuccess('Note saved +15 XP')
    }

    setUploading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload Note">
      <input type="text" placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} />
      <select value={courseId} onChange={e => setCourseId(e.target.value)}>
        <option value="">Select course</option>
        {courses.map(c => (
          <option key={c.id} value={c.id}>{c.code} -- {c.name}</option>
        ))}
      </select>
      <select value={week} onChange={e => setWeek(e.target.value)}>
        <option value="">Select week</option>
        {Array.from({ length: 14 }, (_, i) => (
          <option key={i} value={i + 1}>Week {i + 1}</option>
        ))}
      </select>
      <input type="text" placeholder="Concepts (comma separated)" value={concepts} onChange={e => setConcepts(e.target.value)} />
      <textarea placeholder="Paste your note content here..." value={content} onChange={e => setContent(e.target.value)} />

      <div style={{ marginBottom: 7 }}>
        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
          Attach a file (PDF or image)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 11, color: 'var(--muted)' }}
        />
      </div>

      <div className="modal-actions">
        <button className="btn btn-accent" onClick={handleSubmit} disabled={uploading} style={{ flex: 1, justifyContent: 'center' }}>
          {uploading ? 'Uploading...' : 'Save Note'}
        </button>
        <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
      </div>
    </Modal>
  )
}
