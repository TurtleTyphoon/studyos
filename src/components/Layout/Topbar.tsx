interface TopbarProps {
  title: string
  onAddCourse: () => void
  onNewNote: () => void
  onUploadFile: () => void
}

export default function Topbar({ title, onAddCourse, onNewNote, onUploadFile }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="page-title">{title}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={onAddCourse}>
          <i className="ti ti-plus" />Add Course
        </button>
        <button className="btn" onClick={onUploadFile}>
          <i className="ti ti-upload" />Upload File
        </button>
        <button className="btn btn-accent" onClick={onNewNote}>
          <i className="ti ti-pencil-plus" />Write Note
        </button>
      </div>
    </div>
  )
}
