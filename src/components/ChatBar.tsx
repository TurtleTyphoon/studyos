import { useState, useRef, useEffect } from 'react'
import { parseCommand, uid, type Block } from './blocks'

interface Props {
  onSubmit: (blocks: Block[]) => void
}

const HINTS = [
  { label: '# Heading', cmd: '# ' },
  { label: '- List', cmd: '- ' },
  { label: '> Quote', cmd: '> ' },
  { label: 'Callout', cmd: 'tip: ' },
  { label: 'Checklist', cmd: '- [ ] ' },
  { label: '--- Divider', cmd: '---' },
]

export default function ChatBar({ onSubmit }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + 'px'
    }
  }, [value])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return

    const parsed = parseCommand(trimmed)
    if (parsed) {
      onSubmit(parsed)
    } else {
      onSubmit([{ id: uid(), type: 'text', content: trimmed }])
    }
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleHint(cmd: string) {
    setValue(cmd)
    ref.current?.focus()
  }

  return (
    <div className="chat-bar">
      <div className="chat-input-wrap">
        <textarea
          ref={ref}
          className="chat-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type to add content... Use # for headings, - for lists, > for quotes"
          rows={1}
        />
        <button className="chat-send" onClick={submit} disabled={!value.trim()}>
          <i className="ti ti-arrow-up" />
        </button>
      </div>
      <div className="chat-hints">
        {HINTS.map(h => (
          <button key={h.label} className="chat-hint" onClick={() => handleHint(h.cmd)}>
            {h.label}
          </button>
        ))}
      </div>
    </div>
  )
}
