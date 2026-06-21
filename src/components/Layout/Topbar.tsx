interface TopbarProps {
  title: string
  onAddCourse: () => void
  onAddNote: () => void
}

export default function Topbar({ title, onAddCourse, onAddNote }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="page-title">{title}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={onAddCourse}>
          <i className="ti ti-plus" />Add Course
        </button>
        <button className="btn btn-accent" onClick={onAddNote}>
          <i className="ti ti-upload" />Upload Note
        </button>
      </div>
    </div>
  )
}
