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

  async function handleSubmit() {
    if (!code.trim() || !name.trim() || !user) return

    const { error } = await supabase.from('courses').insert({
      user_id: user.id,
      code: code.trim(),
      name: name.trim(),
      description: desc.trim() || null,
      weeks: parseInt(weeks) || 14,
    })

    if (!error) {
      await supabase.rpc('add_xp', { user_uuid: user.id, amount: 20 })
      await refreshProfile()
      setCode(''); setName(''); setDesc(''); setWeeks('14')
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
      <div className="modal-actions">
        <button className="btn btn-accent" onClick={handleSubmit} style={{ flex: 1, justifyContent: 'center' }}>Add Course</button>
        <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
      </div>
    </Modal>
  )
}
