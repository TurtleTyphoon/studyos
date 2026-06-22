import { useRef, useEffect } from 'react'
import type { Block } from './blocks'

interface Props {
  blocks: Block[]
  editingId: string | null
  onSelect: (block: Block) => void
  onUpdate: (id: string, data: Partial<Block>) => void
}

export default function NoteView({ blocks, editingId, onSelect, onUpdate }: Props) {
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
            Pick a block template below, or type in the chat bar. Use # for headings, - for lists, {'>'} for quotes.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="note-stream">
      <div className="note-stream-inner">
        {blocks.map(block => (
          <div
            key={block.id}
            className={`block ${editingId === block.id ? 'block-editing' : ''}`}
            onClick={() => onSelect(block)}
          >
            <BlockContent block={block} onUpdate={onUpdate} />
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function BlockContent({ block, onUpdate }: { block: Block; onUpdate: (id: string, d: Partial<Block>) => void }) {
  switch (block.type) {
    case 'text':
      return <div className="block-text">{block.content || 'Empty text block'}</div>

    case 'heading':
      return <div className={`block-heading block-h${block.level}`}>{block.content || 'Empty heading'}</div>

    case 'quote':
      return <div className="block-quote">{block.content || 'Empty quote'}</div>

    case 'code':
      return (
        <pre className="block-code"><code>{block.content || '// empty'}</code></pre>
      )

    case 'divider':
      return <hr className="block-divider" />

    case 'bullet-list':
      return (
        <ul className="block-list">
          {block.items.map((item, i) => <li key={i}>{item || 'Empty item'}</li>)}
        </ul>
      )

    case 'number-list':
      return (
        <ol className="block-list">
          {block.items.map((item, i) => <li key={i}>{item || 'Empty item'}</li>)}
        </ol>
      )

    case 'checklist':
      return (
        <ul className="block-checklist">
          {block.items.map((item, i) => (
            <li key={i}>
              <div
                className={`block-check ${item.done ? 'block-check-done' : ''}`}
                onClick={e => {
                  e.stopPropagation()
                  const items = [...block.items]
                  items[i] = { ...items[i], done: !items[i].done }
                  onUpdate(block.id, { items })
                }}
              />
              <span className={item.done ? 'block-check-text-done' : ''}>{item.text || 'Empty item'}</span>
            </li>
          ))}
        </ul>
      )

    case 'callout': {
      const colors: Record<string, { border: string; bg: string }> = {
        tip: { border: 'var(--green)', bg: 'var(--green-bg)' },
        note: { border: 'var(--blue)', bg: 'var(--blue-bg)' },
        warning: { border: 'var(--yellow)', bg: 'var(--yellow-bg)' },
        important: { border: 'var(--red)', bg: 'var(--red-bg)' },
      }
      const c = colors[block.variant] || colors.note
      return (
        <div className="block-callout" style={{ borderColor: c.border, background: c.bg }}>
          <div className="block-callout-title" style={{ color: c.border }}>{block.title || block.variant}</div>
          <div className="block-callout-body">{block.content}</div>
        </div>
      )
    }

    case 'card':
      return (
        <div className="block-card">
          <div className="block-card-title">{block.title || 'Untitled card'}</div>
          <div className="block-card-body">{block.content}</div>
        </div>
      )

    case 'image':
      return (
        <div className="block-image">
          <img src={block.url} alt={block.caption} />
          {block.caption && <div className="block-image-caption">{block.caption}</div>}
        </div>
      )

    default:
      return null
  }
}
