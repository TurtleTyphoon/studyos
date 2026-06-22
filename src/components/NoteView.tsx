import { useRef, useEffect } from 'react'
import type { Block } from './blocks'

interface Props {
  blocks: Block[]
  onUpdate: (id: string, data: Partial<Block>) => void
  onDelete: (id: string) => void
}

export default function NoteView({ blocks, onUpdate, onDelete }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(blocks.length)

  useEffect(() => {
    if (blocks.length > prevLen.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLen.current = blocks.length
  }, [blocks.length])

  if (blocks.length === 0) {
    return (
      <div className="note-stream">
        <div className="note-empty">
          <i className="ti ti-message-circle note-empty-icon" />
          <div className="note-empty-title">Start writing</div>
          <div className="note-empty-hint">
            Type in the chat bar below to add content. Use markdown shortcuts like # for headings, - for lists, or {'>'} for quotes. You can also type natural commands like "callout: Remember this for the exam".
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="note-stream">
      <div className="note-stream-inner">
        {blocks.map(block => (
          <BlockRenderer key={block.id} block={block} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function BlockRenderer({ block, onUpdate, onDelete }: { block: Block; onUpdate: (id: string, d: Partial<Block>) => void; onDelete: (id: string) => void }) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && (e.target as HTMLElement).textContent === '') {
      e.preventDefault()
      onDelete(block.id)
    }
  }

  switch (block.type) {
    case 'text':
      return (
        <div
          className="block block-text"
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onUpdate(block.id, { content: e.currentTarget.textContent || '' })}
          onKeyDown={handleKeyDown}
          dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
        />
      )

    case 'heading':
      return (
        <div
          className={`block block-heading block-h${block.level}`}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onUpdate(block.id, { content: e.currentTarget.textContent || '' })}
          onKeyDown={handleKeyDown}
          dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
        />
      )

    case 'quote':
      return (
        <div className="block block-quote">
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onUpdate(block.id, { content: e.currentTarget.textContent || '' })}
            dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
          />
        </div>
      )

    case 'code':
      return (
        <div className="block">
          <pre className="block-code">
            <code
              contentEditable
              suppressContentEditableWarning
              onBlur={e => onUpdate(block.id, { content: e.currentTarget.textContent || '' })}
              dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
            />
          </pre>
        </div>
      )

    case 'divider':
      return <hr className="block-divider" />

    case 'bullet-list':
      return (
        <div className="block">
          <ul className="block-list">
            {block.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )

    case 'number-list':
      return (
        <div className="block">
          <ol className="block-list">
            {block.items.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        </div>
      )

    case 'checklist':
      return (
        <div className="block">
          <ul className="block-checklist">
            {block.items.map((item, i) => (
              <li key={i}>
                <div
                  className={`block-check ${item.done ? 'block-check-done' : ''}`}
                  onClick={() => {
                    const items = [...block.items]
                    items[i] = { ...items[i], done: !items[i].done }
                    onUpdate(block.id, { items })
                  }}
                />
                <span className={item.done ? 'block-check-text-done' : ''}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'callout': {
      const colors: Record<string, { border: string; bg: string }> = {
        tip: { border: '#22c55e', bg: 'rgba(34,197,94,.08)' },
        note: { border: '#3b82f6', bg: 'rgba(59,130,246,.08)' },
        warning: { border: '#eab308', bg: 'rgba(234,179,8,.08)' },
        important: { border: '#ef4444', bg: 'rgba(239,68,68,.08)' },
        callout: { border: '#3b82f6', bg: 'rgba(59,130,246,.08)' },
      }
      const c = colors[block.variant] || colors.note
      return (
        <div className="block block-callout" style={{ borderColor: c.border, background: c.bg }}>
          <div className="block-callout-title" style={{ color: c.border }}>{block.title}</div>
          <div className="block-callout-body">{block.content}</div>
        </div>
      )
    }

    case 'card':
      return (
        <div className="block block-card">
          <div className="block-card-title">{block.title}</div>
          <div className="block-card-body">{block.content}</div>
        </div>
      )

    case 'image':
      return (
        <div className="block block-image">
          <img src={block.url} alt={block.caption} />
          {block.caption && <div className="block-image-caption">{block.caption}</div>}
        </div>
      )

    default:
      return null
  }
}
