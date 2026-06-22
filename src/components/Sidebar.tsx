import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Note {
  id: string
  title: string
  created_at: string
}

interface Props {
  notes: Note[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export default function Sidebar({ notes, activeId, onSelect, onCreate, onDelete }: Props) {
  const { profile, signOut } = useAuth()
  const [search, setSearch] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const filtered = search
    ? notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  function groupLabel(dateStr: string) {
    const d = new Date(dateStr).toDateString()
    if (d === today) return 'Today'
    if (d === yesterday) return 'Yesterday'
    return 'Older'
  }

  const grouped: { label: string; items: Note[] }[] = []
  for (const note of filtered) {
    const label = groupLabel(note.created_at)
    const group = grouped.find(g => g.label === label)
    if (group) group.items.push(note)
    else grouped.push({ label, items: [note] })
  }

  return (
    <div className="sidebar" onContextMenu={e => e.preventDefault()}>
      <div className="sidebar-header">
        <div className="sidebar-brand">StudyOS</div>
        <button className="sidebar-new" onClick={onCreate} title="New note">
          <i className="ti ti-plus" />
        </button>
      </div>

      <div className="sidebar-search">
        <input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="sidebar-list">
        {grouped.map(group => (
          <div key={group.label}>
            <div className="sidebar-section">{group.label}</div>
            {group.items.map(note => (
              <div
                key={note.id}
                className={`sidebar-item ${note.id === activeId ? 'sidebar-item-active' : ''}`}
                onClick={() => onSelect(note.id)}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ id: note.id, x: e.clientX, y: e.clientY }) }}
              >
                <i className="ti ti-file-text sidebar-item-icon" />
                <div className="sidebar-item-content">
                  <div className="sidebar-item-title">{note.title || 'Untitled'}</div>
                  <div className="sidebar-item-date">
                    {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
            {search ? 'No results' : 'No notes yet'}
          </div>
        )}
      </div>

      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setContextMenu(null)} />
          <div style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 100,
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
            padding: 4, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          }}>
            <button
              style={{
                width: '100%', padding: '6px 12px', border: 'none', background: 'transparent',
                color: '#ef4444', fontSize: 12, fontFamily: 'var(--font)', textAlign: 'left',
                cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { onDelete(contextMenu.id); setContextMenu(null) }}
            >
              <i className="ti ti-trash" style={{ fontSize: 14 }} /> Delete note
            </button>
          </div>
        </>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{profile?.display_name?.charAt(0)?.toUpperCase() || '?'}</div>
        <div className="sidebar-user">
          <div className="sidebar-username">{profile?.display_name || 'User'}</div>
          <div className="sidebar-email">{profile?.xp || 0} XP</div>
        </div>
        <button
          onClick={signOut}
          style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 16, padding: 4 }}
          title="Sign out"
        >
          <i className="ti ti-logout" />
        </button>
      </div>
    </div>
  )
}
