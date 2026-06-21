import type { Note } from '../../types/database'

interface Props {
  currentNote: Note | null
  allNotes: Note[]
  onOpenNote: (note: Note) => void
}

export default function BacklinksPanel({ currentNote, allNotes, onOpenNote }: Props) {
  if (!currentNote) return null

  const backlinks = allNotes.filter(n => {
    if (n.id === currentNote.id) return false
    if (!n.content) return false
    const pattern = `[[${currentNote.title}]]`
    return n.content.toLowerCase().includes(pattern.toLowerCase())
  })

  const sharedConcepts = allNotes.filter(n => {
    if (n.id === currentNote.id) return false
    return n.concepts.some(c => currentNote.concepts.includes(c))
  })

  const mentionedNotes = new Set<string>()
  const linkRegex = /\[\[([^\]]+)\]\]/g
  let match
  while ((match = linkRegex.exec(currentNote.content ?? '')) !== null) {
    mentionedNotes.add(match[1].toLowerCase())
  }

  const outgoing = allNotes.filter(n =>
    n.id !== currentNote.id && mentionedNotes.has(n.title.toLowerCase())
  )

  if (backlinks.length === 0 && sharedConcepts.length === 0 && outgoing.length === 0) {
    return (
      <div className="backlinks-panel">
        <div className="backlinks-title">
          <i className="ti ti-link" style={{ fontSize: 12 }} /> Links
        </div>
        <div style={{ fontSize: 10, color: 'var(--subtle)', padding: '8px 0' }}>
          No connections yet. Add concepts or use [[links]] to connect notes.
        </div>
      </div>
    )
  }

  return (
    <div className="backlinks-panel">
      {backlinks.length > 0 && (
        <>
          <div className="backlinks-title">
            <i className="ti ti-arrow-back-up" style={{ fontSize: 12 }} /> Backlinks ({backlinks.length})
          </div>
          {backlinks.map(n => (
            <div key={n.id} className="backlink-item" onClick={() => onOpenNote(n)}>
              <i className="ti ti-file-text" style={{ fontSize: 11, color: 'var(--subtle)' }} />
              <span>{n.title}</span>
            </div>
          ))}
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <div className="backlinks-title" style={{ marginTop: backlinks.length > 0 ? 8 : 0 }}>
            <i className="ti ti-arrow-forward-up" style={{ fontSize: 12 }} /> Outgoing ({outgoing.length})
          </div>
          {outgoing.map(n => (
            <div key={n.id} className="backlink-item" onClick={() => onOpenNote(n)}>
              <i className="ti ti-file-text" style={{ fontSize: 11, color: 'var(--subtle)' }} />
              <span>{n.title}</span>
            </div>
          ))}
        </>
      )}

      {sharedConcepts.length > 0 && (
        <>
          <div className="backlinks-title" style={{ marginTop: 8 }}>
            <i className="ti ti-tags" style={{ fontSize: 12 }} /> Related ({sharedConcepts.length})
          </div>
          {sharedConcepts.slice(0, 8).map(n => (
            <div key={n.id} className="backlink-item" onClick={() => onOpenNote(n)}>
              <i className="ti ti-file-text" style={{ fontSize: 11, color: 'var(--subtle)' }} />
              <span>{n.title}</span>
              <span style={{ fontSize: 9, color: 'var(--subtle)' }}>
                {n.concepts.filter(c => currentNote.concepts.includes(c)).join(', ')}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
