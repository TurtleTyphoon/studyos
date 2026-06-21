import { useState, useEffect, useRef } from 'react'

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  content: string
  onContentChange: (content: string) => void
}

export default function FloatingToolbar({ textareaRef, content, onContentChange }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleSelection() {
      const textarea = textareaRef.current
      if (!textarea || textarea !== document.activeElement) {
        setVisible(false)
        return
      }
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start === end) {
        setVisible(false)
        return
      }

      const rect = textarea.getBoundingClientRect()
      const lines = content.slice(0, start).split('\n')
      const lineHeight = 20
      const approxTop = rect.top + (lines.length - 1) * lineHeight - textarea.scrollTop - 36
      const approxLeft = rect.left + 60

      setPos({
        top: Math.max(approxTop, rect.top - 36),
        left: Math.min(approxLeft, rect.right - 200),
      })
      setVisible(true)
    }

    document.addEventListener('selectionchange', handleSelection)
    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('mouseup', handleSelection)
      textarea.addEventListener('keyup', handleSelection)
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelection)
      if (textarea) {
        textarea.removeEventListener('mouseup', handleSelection)
        textarea.removeEventListener('keyup', handleSelection)
      }
    }
  }, [textareaRef, content])

  function wrap(before: string, after: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(start, end)
    const newContent = content.slice(0, start) + before + selected + after + content.slice(end)
    onContentChange(newContent)
    setVisible(false)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  if (!visible) return null

  const actions = [
    { icon: 'ti-bold', label: 'Bold', fn: () => wrap('**', '**') },
    { icon: 'ti-italic', label: 'Italic', fn: () => wrap('*', '*') },
    { icon: 'ti-strikethrough', label: 'Strikethrough', fn: () => wrap('~~', '~~') },
    { icon: 'ti-code', label: 'Code', fn: () => wrap('`', '`') },
    { icon: 'ti-highlight', label: 'Highlight', fn: () => wrap('==', '==') },
    { icon: 'ti-link', label: 'Link', fn: () => wrap('[', '](url)') },
    { icon: 'ti-brain', label: 'Recall', fn: () => wrap('??', '??') },
  ]

  return (
    <div className="floating-toolbar" style={{ top: pos.top, left: pos.left }} ref={toolbarRef}>
      {actions.map(a => (
        <button
          key={a.icon}
          className="floating-toolbar-btn"
          onClick={e => { e.preventDefault(); a.fn() }}
          title={a.label}
          onMouseDown={e => e.preventDefault()}
        >
          <i className={`ti ${a.icon}`} />
        </button>
      ))}
    </div>
  )
}
