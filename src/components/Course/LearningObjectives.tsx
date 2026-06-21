import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Objective {
  id: string
  week: number
  objective: string
  completed: boolean
}

interface Props {
  courseId: string
  userId: string
  weeks: number
}

export default function LearningObjectives({ courseId, userId, weeks }: Props) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [newObj, setNewObj] = useState('')

  useEffect(() => {
    loadObjectives()
  }, [courseId])

  async function loadObjectives() {
    const { data } = await supabase
      .from('learning_objectives')
      .select('*')
      .eq('course_id', courseId)
      .order('week')
      .order('created_at')
    if (data) setObjectives(data)
  }

  async function addObjective() {
    if (!newObj.trim()) return
    await supabase.from('learning_objectives').insert({
      user_id: userId,
      course_id: courseId,
      week: selectedWeek,
      objective: newObj.trim(),
    })
    setNewObj('')
    loadObjectives()
  }

  async function toggleObjective(id: string, completed: boolean) {
    await supabase.from('learning_objectives').update({ completed: !completed }).eq('id', id)
    loadObjectives()
  }

  async function deleteObjective(id: string) {
    await supabase.from('learning_objectives').delete().eq('id', id)
    loadObjectives()
  }

  const weekObjectives = objectives.filter(o => o.week === selectedWeek)
  const completedCount = weekObjectives.filter(o => o.completed).length
  const totalByWeek = new Map<number, { total: number; done: number }>()
  objectives.forEach(o => {
    const entry = totalByWeek.get(o.week) ?? { total: 0, done: 0 }
    entry.total++
    if (o.completed) entry.done++
    totalByWeek.set(o.week, entry)
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {Array.from({ length: Math.min(weeks, 14) }, (_, i) => {
          const wk = i + 1
          const stats = totalByWeek.get(wk)
          const allDone = stats && stats.total > 0 && stats.done === stats.total
          return (
            <button
              key={wk}
              className={`pill ${selectedWeek === wk ? 'active' : ''}`}
              onClick={() => setSelectedWeek(wk)}
              style={{ position: 'relative', fontSize: 10 }}
            >
              Wk {wk}
              {stats && stats.total > 0 && (
                <span style={{
                  display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                  background: allDone ? 'var(--green)' : 'var(--border)',
                  marginLeft: 3,
                }} />
              )}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Add a learning objective..."
          value={newObj}
          onChange={e => setNewObj(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addObjective()}
          style={{ flex: 1, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, outline: 'none' }}
        />
        <button className="btn btn-accent" onClick={addObjective} disabled={!newObj.trim()} style={{ fontSize: 11 }}>
          <i className="ti ti-plus" style={{ fontSize: 12 }} />Add
        </button>
      </div>

      {weekObjectives.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--subtle)', marginBottom: 8 }}>
          {completedCount}/{weekObjectives.length} completed
        </div>
      )}

      {weekObjectives.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <i className="ti ti-target" style={{ fontSize: 20 }} />
          <p style={{ fontSize: 11 }}>No objectives for Week {selectedWeek} yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {weekObjectives.map(obj => (
            <div key={obj.id} className="objective-row">
              <button
                className={`objective-check ${obj.completed ? 'done' : ''}`}
                onClick={() => toggleObjective(obj.id, obj.completed)}
              >
                {obj.completed && <i className="ti ti-check" style={{ fontSize: 10 }} />}
              </button>
              <span className={`objective-text ${obj.completed ? 'done' : ''}`}>{obj.objective}</span>
              <button className="btn" style={{ padding: '1px 5px', fontSize: 10, color: 'var(--subtle)', opacity: 0, transition: '.15s' }} onClick={() => deleteObjective(obj.id)}>
                <i className="ti ti-x" style={{ fontSize: 10 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
