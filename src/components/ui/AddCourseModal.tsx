import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}

export default function AddCourseModal({ open, onClose, onSuccess }: Props) {
  const { user, refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [weeks, setWeeks] = useState('14')
  const [profName, setProfName] = useState('')
  const [profEmail, setProfEmail] = useState('')
  const [officeHours, setOfficeHours] = useState('')
  const [room, setRoom] = useState('')

  async function handleSubmit() {
    if (!code.trim() || !name.trim() || !user) return

    const { error } = await supabase.from('courses').insert({
      user_id: user.id,
      code: code.trim(),
      name: name.trim(),
      description: desc.trim() || null,
      weeks: parseInt(weeks) || 14,
      professor_name: profName.trim() || null,
      professor_email: profEmail.trim() || null,
      office_hours: officeHours.trim() || null,
      room: room.trim() || null,
    })

    if (!error) {
      await supabase.rpc('add_xp', { user_uuid: user.id, amount: 20 })
      await refreshProfile()
      setCode(''); setName(''); setDesc(''); setWeeks('14')
      setProfName(''); setProfEmail(''); setOfficeHours(''); setRoom('')
      onClose()
      onSuccess('Course added +20 XP')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Course">
      <input type="text" placeholder="Course code (e.g. NUR 130)" value={code} onChange={e => setCode(e.target.value)} />
      <input type="text" placeholder="Course name" value={name} onChange={e => setName(e.target.value)} />
      <input type="text" placeholder="Short description" value={desc} onChange={e => setDesc(e.target.value)} />
      <input type="number" placeholder="Number of weeks" value={weeks} onChange={e => setWeeks(e.target.value)} />
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginTop: 6, marginBottom: 2 }}>Professor Info (optional)</div>
      <input type="text" placeholder="Professor name" value={profName} onChange={e => setProfName(e.target.value)} />
      <input type="email" placeholder="Professor email" value={profEmail} onChange={e => setProfEmail(e.target.value)} />
      <input type="text" placeholder="Office hours (e.g. Mon/Wed 2-4pm)" value={officeHours} onChange={e => setOfficeHours(e.target.value)} />
      <input type="text" placeholder="Room / Location" value={room} onChange={e => setRoom(e.target.value)} />
      <div className="modal-actions">
        <button className="btn btn-accent" onClick={handleSubmit} style={{ flex: 1, justifyContent: 'center' }}>Add Course</button>
        <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
      </div>
    </Modal>
  )
}
