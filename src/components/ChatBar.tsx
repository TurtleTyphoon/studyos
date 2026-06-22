import { useState, useRef, useEffect } from 'react'
import { parseCommand, uid, type Block } from './blocks'

interface Props {
  onSubmit: (blocks: Block[]) => void
  editingBlock: Block | null
  onEditSave: (id: string, data: Partial<Block>) => void
  onEditCancel: () => void
  onEditDelete: (id: string) => void
}

const TEMPLATES: { label: string; icon: string; create: () => Block }[] = [
  { label: 'Text', icon: 'ti-align-left', create: () => ({ id: uid(), type: 'text', content: '' }) },
  { label: 'Heading', icon: 'ti-h-1', create: () => ({ id: uid(), type: 'heading', content: '', level: 2 as const }) },
  { label: 'Quote', icon: 'ti-blockquote', create: () => ({ id: uid(), type: 'quote', content: '' }) },
  { label: 'Bullet List', icon: 'ti-list', create: () => ({ id: uid(), type: 'bullet-list', items: [''] }) },
  { label: 'Checklist', icon: 'ti-list-check', create: () => ({ id: uid(), type: 'checklist', items: [{ text: '', done: false }] }) },
  { label: 'Callout', icon: 'ti-info-circle', create: () => ({ id: uid(), type: 'callout', variant: 'note', title: '', content: '' }) },
  { label: 'Card', icon: 'ti-layout-cards', create: () => ({ id: uid(), type: 'card', title: '', content: '' }) },
  { label: 'Code', icon: 'ti-code', create: () => ({ id: uid(), type: 'code', content: '', language: '' }) },
  { label: 'Divider', icon: 'ti-minus', create: () => ({ id: uid(), type: 'divider' }) },
]

export default function ChatBar({ onSubmit, editingBlock, onEditSave, onEditCancel, onEditDelete }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + 'px'
    }
  }, [value])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    const parsed = parseCommand(trimmed)
    onSubmit(parsed || [{ id: uid(), type: 'text', content: trimmed }])
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  function handleTemplate(create: () => Block) {
    const block = create()
    if (block.type === 'divider') {
      onSubmit([block])
    } else {
      onSubmit([block])
    }
  }

  if (editingBlock) {
    return (
      <div className="composer composer-editing">
        <div className="composer-inner">
          <div className="composer-edit-header">
            <span>Editing {editingBlock.type} block</span>
            <button className="composer-edit-close" onClick={onEditCancel}><i className="ti ti-x" /></button>
          </div>
          <BlockEditForm block={editingBlock} onSave={onEditSave} onCancel={onEditCancel} onDelete={onEditDelete} />
        </div>
      </div>
    )
  }

  return (
    <div className="composer">
      <div className="composer-inner">
        <div className="composer-templates">
          {TEMPLATES.map(t => (
            <button key={t.label} className="composer-tpl" onClick={() => handleTemplate(t.create)}>
              <i className={`ti ${t.icon}`} />{t.label}
            </button>
          ))}
        </div>
        <div className="composer-input-wrap">
          <textarea
            ref={ref}
            className="composer-input"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to add content... # heading, - list, > quote"
            rows={1}
          />
          <button className="composer-send" onClick={submit} disabled={!value.trim()}>
            <i className="ti ti-arrow-up" />
          </button>
        </div>
      </div>
    </div>
  )
}

function BlockEditForm({ block, onSave, onCancel, onDelete }: {
  block: Block
  onSave: (id: string, data: Partial<Block>) => void
  onCancel: () => void
  onDelete: (id: string) => void
}) {
  const [data, setData] = useState<Record<string, any>>({ ...block })

  function save() {
    const { id, type, ...rest } = data
    onSave(block.id, rest)
  }

  switch (block.type) {
    case 'text':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Content</label>
            <textarea value={data.content} onChange={e => setData({ ...data, content: e.target.value })} placeholder="Text content..." autoFocus />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'heading':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Level</label>
            <select value={data.level} onChange={e => setData({ ...data, level: Number(e.target.value) })}>
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option><option value={4}>H4</option>
            </select>
          </div>
          <div className="composer-field">
            <label>Text</label>
            <input value={data.content} onChange={e => setData({ ...data, content: e.target.value })} placeholder="Heading text..." autoFocus />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'quote':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Quote</label>
            <textarea value={data.content} onChange={e => setData({ ...data, content: e.target.value })} placeholder="Quote text..." autoFocus />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'code':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Language</label>
            <input value={data.language} onChange={e => setData({ ...data, language: e.target.value })} placeholder="e.g. javascript, python..." />
          </div>
          <div className="composer-field">
            <label>Code</label>
            <textarea value={data.content} onChange={e => setData({ ...data, content: e.target.value })} placeholder="Code..." style={{ fontFamily: 'monospace' }} autoFocus />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'callout':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Type</label>
            <select value={data.variant} onChange={e => setData({ ...data, variant: e.target.value })}>
              <option value="note">Note</option><option value="tip">Tip</option>
              <option value="warning">Warning</option><option value="important">Important</option>
            </select>
          </div>
          <div className="composer-field">
            <label>Title</label>
            <input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} placeholder="Callout title..." autoFocus />
          </div>
          <div className="composer-field">
            <label>Content</label>
            <textarea value={data.content} onChange={e => setData({ ...data, content: e.target.value })} placeholder="Callout body..." />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'card':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Title</label>
            <input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} placeholder="Card title..." autoFocus />
          </div>
          <div className="composer-field">
            <label>Content</label>
            <textarea value={data.content} onChange={e => setData({ ...data, content: e.target.value })} placeholder="Card body..." />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'bullet-list':
    case 'number-list':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Items (one per line)</label>
            <textarea
              value={(data.items || []).join('\n')}
              onChange={e => setData({ ...data, items: e.target.value.split('\n') })}
              placeholder="Item 1&#10;Item 2&#10;Item 3"
              autoFocus
            />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    case 'checklist':
      return (
        <div className="composer-form">
          <div className="composer-field">
            <label>Items (one per line)</label>
            <textarea
              value={(data.items || []).map((i: any) => i.text).join('\n')}
              onChange={e => setData({ ...data, items: e.target.value.split('\n').map((text: string) => ({ text, done: false })) })}
              placeholder="Task 1&#10;Task 2&#10;Task 3"
              autoFocus
            />
          </div>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )

    default:
      return (
        <div className="composer-form">
          <p style={{ fontSize: 12, color: 'var(--subtle)' }}>This block type cannot be edited.</p>
          <FormActions onSave={save} onCancel={onCancel} onDelete={() => onDelete(block.id)} />
        </div>
      )
  }
}

function FormActions({ onSave, onCancel, onDelete }: { onSave: () => void; onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="composer-actions">
      <button className="composer-btn composer-btn-danger" onClick={onDelete}>Delete</button>
      <button className="composer-btn" onClick={onCancel}>Cancel</button>
      <button className="composer-btn composer-btn-primary" onClick={onSave}>Save</button>
    </div>
  )
}
