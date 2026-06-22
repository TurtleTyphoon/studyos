import { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react'
import { createPortal } from 'react-dom'

/* ---- types ---- */

interface BlockBase { id: string }
interface TextBlock extends BlockBase { type: 'text'; content: string }
interface HeadingBlock extends BlockBase { type: 'heading'; level: 1 | 2 | 3 | 4; content: string }
interface BulletListBlock extends BlockBase { type: 'bullet-list'; items: string[] }
interface NumberListBlock extends BlockBase { type: 'number-list'; items: string[] }
interface ChecklistBlock extends BlockBase { type: 'checklist'; items: { text: string; checked: boolean }[] }
interface QuoteBlock extends BlockBase { type: 'quote'; content: string }
interface DividerBlock extends BlockBase { type: 'divider' }
interface CodeBlock extends BlockBase { type: 'code'; language: string; content: string }
interface CalloutBlock extends BlockBase { type: 'callout'; variant: string; title: string; content: string }
interface CardBlock extends BlockBase { type: 'card'; title: string; description: string; content: string; footer: string; variant: 'default' | 'accent' | 'outlined' }
interface AlertBlock extends BlockBase { type: 'alert'; variant: 'info' | 'warning' | 'error' | 'success'; title: string; content: string }
interface AccordionBlock extends BlockBase { type: 'accordion'; items: { title: string; content: string }[] }
interface StepsBlock extends BlockBase { type: 'steps'; steps: { title: string; description: string }[] }
interface ProgressBlock extends BlockBase { type: 'progress'; label: string; value: number }
interface ColumnsBlock extends BlockBase { type: 'columns'; count: 2 | 3; columns: string[] }
interface TableBlock extends BlockBase { type: 'table'; headers: string[]; rows: string[][] }
interface RecallBlock extends BlockBase { type: 'recall'; content: string }
interface ImageBlock extends BlockBase { type: 'image'; url: string; caption: string }
interface BadgeBlock extends BlockBase { type: 'badge'; items: { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }[] }

type Block = TextBlock | HeadingBlock | BulletListBlock | NumberListBlock | ChecklistBlock | QuoteBlock | DividerBlock | CodeBlock | CalloutBlock | CardBlock | AlertBlock | AccordionBlock | StepsBlock | ProgressBlock | ColumnsBlock | TableBlock | RecallBlock | ImageBlock | BadgeBlock

/* ---- catalog ---- */

interface CatalogItem {
  cat: string
  type: string
  icon: string
  label: string
  create: () => Omit<Block, 'id'>
}

const CATALOG: CatalogItem[] = [
  { cat: 'Text', type: 'text', icon: 'ti-align-left', label: 'Text', create: () => ({ type: 'text', content: '' }) },
  { cat: 'Text', type: 'h1', icon: 'ti-h-1', label: 'Heading 1', create: () => ({ type: 'heading', level: 1, content: '' }) },
  { cat: 'Text', type: 'h2', icon: 'ti-h-2', label: 'Heading 2', create: () => ({ type: 'heading', level: 2, content: '' }) },
  { cat: 'Text', type: 'h3', icon: 'ti-h-3', label: 'Heading 3', create: () => ({ type: 'heading', level: 3, content: '' }) },

  { cat: 'Lists', type: 'bullet-list', icon: 'ti-list', label: 'Bullet List', create: () => ({ type: 'bullet-list', items: [''] }) },
  { cat: 'Lists', type: 'number-list', icon: 'ti-list-numbers', label: 'Numbered List', create: () => ({ type: 'number-list', items: [''] }) },
  { cat: 'Lists', type: 'checklist', icon: 'ti-checkbox', label: 'Checklist', create: () => ({ type: 'checklist', items: [{ text: '', checked: false }] }) },

  { cat: 'Content', type: 'quote', icon: 'ti-blockquote', label: 'Quote', create: () => ({ type: 'quote', content: '' }) },
  { cat: 'Content', type: 'callout', icon: 'ti-info-circle', label: 'Callout', create: () => ({ type: 'callout', variant: 'info', title: 'Note', content: '' }) },
  { cat: 'Content', type: 'code', icon: 'ti-code', label: 'Code Block', create: () => ({ type: 'code', language: '', content: '' }) },
  { cat: 'Content', type: 'divider', icon: 'ti-minus', label: 'Divider', create: () => ({ type: 'divider' }) },
  { cat: 'Content', type: 'image', icon: 'ti-photo', label: 'Image', create: () => ({ type: 'image', url: '', caption: '' }) },

  { cat: 'Components', type: 'card-blank', icon: 'ti-layout-cards', label: 'Blank Card', create: () => ({ type: 'card', title: '', description: '', content: '', footer: '', variant: 'default' as const }) },
  { cat: 'Components', type: 'alert', icon: 'ti-alert-circle', label: 'Alert', create: () => ({ type: 'alert', variant: 'info' as const, title: 'Note', content: 'Alert content here.' }) },
  { cat: 'Components', type: 'accordion', icon: 'ti-layout-bottombar-collapse', label: 'Accordion', create: () => ({ type: 'accordion', items: [{ title: 'Section 1', content: 'Content' }] }) },
  { cat: 'Components', type: 'steps', icon: 'ti-list-check', label: 'Steps', create: () => ({ type: 'steps', steps: [{ title: 'Step 1', description: 'Description' }] }) },
  { cat: 'Components', type: 'progress', icon: 'ti-chart-bar', label: 'Progress Bar', create: () => ({ type: 'progress', label: 'Progress', value: 50 }) },
  { cat: 'Components', type: 'table', icon: 'ti-table', label: 'Table', create: () => ({ type: 'table', headers: ['Header 1', 'Header 2', 'Header 3'], rows: [['', '', ''], ['', '', '']] }) },
  { cat: 'Components', type: 'badge', icon: 'ti-tag', label: 'Badges', create: () => ({ type: 'badge', items: [{ text: 'Badge', variant: 'default' as const }] }) },

  { cat: 'Card Templates', type: 'tpl-project', icon: 'ti-rocket', label: 'Create Project', create: () => ({ type: 'card', variant: 'default' as const, title: 'Create project', description: 'Deploy your new project in one click.', content: 'Name: My Project\nFramework: React', footer: 'Cancel | Deploy' }) },
  { cat: 'Card Templates', type: 'tpl-notifications', icon: 'ti-bell', label: 'Notifications', create: () => ({ type: 'card', variant: 'default' as const, title: 'Notifications', description: 'You have 3 unread messages.', content: 'Meeting tomorrow at 9am\nNew comment on your post\nSubscription renewing soon', footer: 'Mark all as read' }) },
  { cat: 'Card Templates', type: 'tpl-payment', icon: 'ti-credit-card', label: 'Payment Method', create: () => ({ type: 'card', variant: 'default' as const, title: 'Payment Method', description: 'Add a new payment method to your account.', content: 'Card: **** **** **** 4242\nExpiry: 12/28\nCVC: ***', footer: 'Update payment method' }) },
  { cat: 'Card Templates', type: 'tpl-team', icon: 'ti-users', label: 'Team Members', create: () => ({ type: 'card', variant: 'default' as const, title: 'Team Members', description: 'Invite your team members to collaborate.', content: 'Alice Johnson - Admin\nBob Smith - Editor\nCarol Davis - Viewer', footer: 'Invite member' }) },
  { cat: 'Card Templates', type: 'tpl-stats', icon: 'ti-chart-bar', label: 'Stats Overview', create: () => ({ type: 'card', variant: 'accent' as const, title: 'Total Revenue', description: '+20.1% from last month', content: '$45,231.89', footer: '' }) },
  { cat: 'Card Templates', type: 'tpl-report', icon: 'ti-flag', label: 'Report Issue', create: () => ({ type: 'card', variant: 'default' as const, title: 'Report an Issue', description: "What area are you having problems with?", content: 'Area: Billing\nSubject: Payment failed\nDescription: My last payment was declined despite having sufficient funds.', footer: 'Cancel | Submit' }) },
  { cat: 'Card Templates', type: 'tpl-cookie', icon: 'ti-cookie', label: 'Cookie Settings', create: () => ({ type: 'card', variant: 'default' as const, title: 'Cookie Settings', description: 'Manage your cookie preferences.', content: 'Strictly Necessary: Always active\nFunctional: Enabled\nPerformance: Disabled', footer: 'Save preferences' }) },
  { cat: 'Card Templates', type: 'tpl-share', icon: 'ti-share', label: 'Share Document', create: () => ({ type: 'card', variant: 'default' as const, title: 'Share this document', description: 'Anyone with the link can view this document.', content: 'Link: https://example.com/doc/abc123', footer: 'Copy link' }) },

  { cat: 'Layout', type: 'columns-2', icon: 'ti-columns-2', label: 'Two Columns', create: () => ({ type: 'columns', count: 2 as const, columns: ['', ''] }) },
  { cat: 'Layout', type: 'columns-3', icon: 'ti-columns-3', label: 'Three Columns', create: () => ({ type: 'columns', count: 3 as const, columns: ['', '', ''] }) },

  { cat: 'Study', type: 'recall', icon: 'ti-brain', label: 'Active Recall', create: () => ({ type: 'recall', content: 'Hidden answer' }) },
]

/* ---- helpers ---- */

let _id = 0
function uid(): string { return Date.now().toString(36) + (++_id).toString(36) }

interface NoteMeta {
  subtitle: string
  excerpt: string
  description: string
}

const emptyMeta: NoteMeta = { subtitle: '', excerpt: '', description: '' }

function parseContent(content: string): { blocks: Block[]; meta: NoteMeta } {
  if (!content?.trim()) return { blocks: [{ id: uid(), type: 'text', content: '' }], meta: { ...emptyMeta } }
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return { blocks: parsed.map((b: Block) => ({ ...b, id: b.id || uid() })), meta: { ...emptyMeta } }
    }
    if (parsed.blocks && Array.isArray(parsed.blocks)) {
      return {
        blocks: parsed.blocks.map((b: Block) => ({ ...b, id: b.id || uid() })),
        meta: { ...emptyMeta, ...parsed.meta },
      }
    }
  } catch { /* not JSON */ }
  return { blocks: [{ id: uid(), type: 'text', content }], meta: { ...emptyMeta } }
}

function serializeContent(blocks: Block[], meta: NoteMeta): string {
  return JSON.stringify({ meta, blocks })
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'text': return b.content || ''
      case 'heading': return '#'.repeat(b.level) + ' ' + b.content
      case 'bullet-list': return b.items.map(i => `- ${i}`).join('\n')
      case 'number-list': return b.items.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
      case 'checklist': return b.items.map(i => `- [${i.checked ? 'x' : ' '}] ${i.text}`).join('\n')
      case 'quote': return b.content.split('\n').map(l => `> ${l}`).join('\n')
      case 'divider': return '---'
      case 'code': return '```' + b.language + '\n' + b.content + '\n```'
      case 'callout': return `> [!${b.variant}] ${b.title}\n` + b.content.split('\n').map(l => `> ${l}`).join('\n')
      case 'image': return b.url ? `![${b.caption}](${b.url})` : ''
      case 'recall': return `??${b.content}??`
      case 'badge': return b.items.map(item => `\`${item.text}\``).join(' ')
      case 'card': {
        let h = `<div class="sc-card sc-card-${b.variant || 'default'}">`
        if (b.title || b.description) {
          h += '<div class="sc-card-header">'
          if (b.title) h += `<div class="sc-card-title">${b.title}</div>`
          if (b.description) h += `<div class="sc-card-desc">${b.description}</div>`
          h += '</div>'
        }
        if (b.content) h += `<div class="sc-card-content">${b.content}</div>`
        if (b.footer) h += `<div class="sc-card-footer">${b.footer}</div>`
        return h + '</div>'
      }
      case 'alert': {
        const ic: Record<string, string> = { info: 'ti-info-circle', warning: 'ti-alert-triangle', error: 'ti-alert-octagon', success: 'ti-circle-check' }
        return `<div class="sc-alert sc-alert-${b.variant}"><i class="ti ${ic[b.variant] || 'ti-info-circle'}"></i><div><strong>${b.title}</strong><br>${b.content}</div></div>`
      }
      case 'accordion': return b.items.map(i => `<details class="sc-accordion"><summary>${i.title}</summary><div class="sc-accordion-content">${i.content}</div></details>`).join('\n')
      case 'steps': {
        let h = '<div class="sc-steps">'
        b.steps.forEach((s, i) => { h += `<div class="sc-step"><div class="sc-step-num">${i + 1}</div><div class="sc-step-body"><div class="sc-step-title">${s.title}</div><div class="sc-step-desc">${s.description}</div></div></div>` })
        return h + '</div>'
      }
      case 'progress': return `<div class="sc-progress-wrap"><div class="sc-progress-label">${b.label}</div><div class="sc-progress"><div class="sc-progress-bar" style="width:${b.value}%"></div></div><div class="sc-progress-value">${b.value}%</div></div>`
      case 'columns': return `<div class="sc-columns${b.count === 3 ? ' sc-columns-3' : ''}">${b.columns.map(c => `<div class="sc-col">${c}</div>`).join('')}</div>`
      case 'table': {
        let h = '<table><thead><tr>'
        b.headers.forEach(hd => { h += `<th>${hd}</th>` })
        h += '</tr></thead><tbody>'
        b.rows.forEach(row => { h += '<tr>'; row.forEach(cell => { h += `<td>${cell}</td>` }); h += '</tr>' })
        return h + '</tbody></table>'
      }
      default: return ''
    }
  }).filter(Boolean).join('\n\n')
}

/* ---- auto-grow textarea ---- */

type AutoTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  value: string
  onChange: (v: string) => void
}

const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  function AutoTextarea({ value, onChange, ...props }, fwdRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    const ref = (fwdRef || innerRef) as React.RefObject<HTMLTextAreaElement>

    useEffect(() => {
      const el = ref.current
      if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
    }, [value, ref])

    return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} rows={1} {...props} />
  }
)

/* ---- format toolbar ---- */

function RichTextarea({ value, onChange, className, placeholder, onKeyDown }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [fontSize, setFontSize] = useState('14')

  function wrap(prefix: string, suffix: string) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + prefix + (selected || 'text') + suffix + value.slice(end)
    onChange(next)
    setTimeout(() => {
      el.focus()
      const inner = selected || 'text'
      el.setSelectionRange(start + prefix.length, start + prefix.length + inner.length)
    }, 0)
  }

  function insertLine(prefix: string) {
    const el = ref.current
    if (!el) return
    const pos = el.selectionEnd
    const before = value.slice(0, pos)
    const after = value.slice(pos)
    const needsNewline = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
    const next = before + needsNewline + prefix
    onChange(next + after)
    setTimeout(() => { el.focus(); el.setSelectionRange(next.length, next.length) }, 0)
  }

  return (
    <div className="be-rich-wrap">
      <div className="be-fmt-bar">
        <div className="be-fmt-group">
          <i className="ti ti-typography be-fmt-icon" />
          <select className="be-fmt-select" value="Inter" onChange={() => {}}><option>Inter</option></select>
        </div>
        <div className="be-fmt-sep" />
        <div className="be-fmt-group">
          <select className="be-fmt-select be-fmt-size" value={fontSize} onChange={e => setFontSize(e.target.value)}>
            <option value="12">12px</option><option value="14">14px</option><option value="16">16px</option><option value="18">18px</option><option value="20">20px</option>
          </select>
        </div>
        <div className="be-fmt-sep" />
        <div className="be-fmt-group">
          <button className="be-fmt-btn" onClick={() => wrap('**', '**')} title="Bold" type="button"><i className="ti ti-bold" /></button>
          <button className="be-fmt-btn" onClick={() => wrap('*', '*')} title="Italic" type="button"><i className="ti ti-italic" /></button>
          <button className="be-fmt-btn" onClick={() => wrap('<u>', '</u>')} title="Underline" type="button"><i className="ti ti-underline" /></button>
        </div>
        <div className="be-fmt-sep" />
        <div className="be-fmt-group">
          <button className="be-fmt-btn" title="Text color" type="button"><span className="be-fmt-color" /></button>
        </div>
        <div className="be-fmt-sep" />
        <div className="be-fmt-group">
          <button className="be-fmt-btn" title="Align left" type="button"><i className="ti ti-align-left" /></button>
          <button className="be-fmt-btn" title="Align center" type="button"><i className="ti ti-align-center" /></button>
          <button className="be-fmt-btn" title="Align right" type="button"><i className="ti ti-align-right" /></button>
        </div>
        <div className="be-fmt-sep" />
        <div className="be-fmt-group">
          <button className="be-fmt-btn" onClick={() => insertLine('- ')} title="Bullet list" type="button"><i className="ti ti-list" /></button>
          <button className="be-fmt-btn" onClick={() => insertLine('1. ')} title="Numbered list" type="button"><i className="ti ti-list-numbers" /></button>
        </div>
        <div className="be-fmt-sep" />
        <div className="be-fmt-group">
          <button className="be-fmt-btn" onClick={() => wrap('[', '](url)')} title="Link" type="button"><i className="ti ti-link" /></button>
          <button className="be-fmt-btn" onClick={() => insertLine('![image](url)')} title="Image" type="button"><i className="ti ti-photo" /></button>
          <button className="be-fmt-btn" onClick={() => wrap('`', '`')} title="Code" type="button"><i className="ti ti-code" /></button>
        </div>
      </div>
      <AutoTextarea ref={ref} className={`be-rich-textarea ${className || ''}`} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={{ fontSize: `${fontSize}px` }} />
    </div>
  )
}

/* ---- block renderers ---- */

interface RenderOpts {
  onEnter?: () => void
}

function BlockText({ block, update, opts }: { block: TextBlock; update: (d: Partial<TextBlock>) => void; opts: RenderOpts }) {
  return (
    <div className="be-field-group">
      <div className="be-field-label">Text</div>
      <RichTextarea
        className="be-field-textarea"
        value={block.content}
        onChange={v => update({ content: v })}
        placeholder="Type something..."
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); opts.onEnter?.() } }}
      />
    </div>
  )
}

function BlockHeading({ block, update, opts }: { block: HeadingBlock; update: (d: Partial<HeadingBlock>) => void; opts: RenderOpts }) {
  return (
    <div className="be-field-group">
      <div className="be-field-label">Level</div>
      <div className="be-visual-picker">
        {([1, 2, 3, 4] as const).map(lvl => (
          <button key={lvl} className={`be-vpick ${block.level === lvl ? 'be-vpick-active' : ''}`} onClick={() => update({ level: lvl })}>
            <i className={`ti ti-h-${lvl}`} />
            <span>H{lvl}</span>
          </button>
        ))}
      </div>
      <div className="be-field-label">Text</div>
      <input
        className="be-field-input"
        value={block.content}
        onChange={e => update({ content: e.target.value })}
        placeholder={`Heading ${block.level}`}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); opts.onEnter?.() } }}
      />
    </div>
  )
}

function ListItems({ items, onChange, marker }: { items: string[]; onChange: (items: string[]) => void; marker: (i: number) => string }) {
  return (
    <div className="be-list">
      {items.map((item, i) => (
        <div key={i} className="be-list-item">
          <span className="be-list-marker">{marker(i)}</span>
          <input
            className="be-list-input"
            value={item}
            onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next) }}
            placeholder="List item"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const next = [...items]; next.splice(i + 1, 0, ''); onChange(next)
                setTimeout(() => {
                  const parent = (e.target as HTMLElement).closest('.be-list')
                  const inputs = parent?.querySelectorAll<HTMLInputElement>('.be-list-input')
                  inputs?.[i + 1]?.focus()
                }, 0)
              }
              if (e.key === 'Backspace' && !item && items.length > 1) {
                e.preventDefault()
                const next = [...items]; next.splice(i, 1); onChange(next)
                setTimeout(() => {
                  const parent = (e.target as HTMLElement).closest('.be-list')
                  const inputs = parent?.querySelectorAll<HTMLInputElement>('.be-list-input')
                  inputs?.[Math.max(0, i - 1)]?.focus()
                }, 0)
              }
            }}
          />
        </div>
      ))}
    </div>
  )
}

function BlockChecklist({ block, update }: { block: ChecklistBlock; update: (d: Partial<ChecklistBlock>) => void }) {
  return (
    <div className="be-checklist">
      {block.items.map((item, i) => (
        <div key={i} className="be-check-item">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={e => { const items = [...block.items]; items[i] = { ...items[i], checked: e.target.checked }; update({ items }) }}
          />
          <input
            className={`be-check-input ${item.checked ? 'checked' : ''}`}
            value={item.text}
            onChange={e => { const items = [...block.items]; items[i] = { ...items[i], text: e.target.value }; update({ items }) }}
            placeholder="Task"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const items = [...block.items]; items.splice(i + 1, 0, { text: '', checked: false }); update({ items })
                setTimeout(() => {
                  const parent = (e.target as HTMLElement).closest('.be-checklist')
                  const inputs = parent?.querySelectorAll<HTMLInputElement>('.be-check-input')
                  inputs?.[i + 1]?.focus()
                }, 0)
              }
              if (e.key === 'Backspace' && !item.text && block.items.length > 1) {
                e.preventDefault()
                const items = [...block.items]; items.splice(i, 1); update({ items })
              }
            }}
          />
        </div>
      ))}
    </div>
  )
}

function BlockCallout({ block, update }: { block: CalloutBlock; update: (d: Partial<CalloutBlock>) => void }) {
  const variants = ['tip', 'note', 'warning', 'important', 'info', 'example', 'question']
  const colors: Record<string, string> = { tip: 'var(--green)', note: '#2563eb', warning: 'var(--yellow)', important: 'var(--red)', info: '#2563eb', example: '#7c3aed', question: '#d97706' }
  const icons: Record<string, string> = { tip: 'ti-bulb', note: 'ti-note', warning: 'ti-alert-triangle', important: 'ti-urgent', info: 'ti-info-circle', example: 'ti-flask', question: 'ti-help' }
  return (
    <div className="be-field-group">
      <div className="be-field-label">Type</div>
      <div className="be-visual-picker">
        {variants.map(v => (
          <button key={v} className={`be-vpick ${block.variant === v ? 'be-vpick-active' : ''}`} onClick={() => update({ variant: v })} style={{ '--vpick-color': colors[v] } as React.CSSProperties}>
            <i className={`ti ${icons[v]}`} />
            <span>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
          </button>
        ))}
      </div>
      <div className="be-field-label">Title</div>
      <input className="be-field-input" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Callout title" />
      <div className="be-field-label">Content</div>
      <RichTextarea className="be-field-textarea" value={block.content} onChange={v => update({ content: v })} placeholder="Write callout content..." />
    </div>
  )
}

function BlockCard({ block, update }: { block: CardBlock; update: (d: Partial<CardBlock>) => void }) {
  const variants: { key: CardBlock['variant']; label: string; icon: string }[] = [
    { key: 'default', label: 'Default', icon: 'ti-layout-cards' },
    { key: 'accent', label: 'Accent', icon: 'ti-bolt' },
    { key: 'outlined', label: 'Outlined', icon: 'ti-square' },
  ]
  return (
    <div className="be-field-group">
      <div className="be-field-label">Style</div>
      <div className="be-style-thumbs">
        {variants.map(v => (
          <button key={v.key} className={`be-thumb ${(block.variant || 'default') === v.key ? 'be-thumb-active' : ''}`} onClick={() => update({ variant: v.key })}>
            <div className={`be-thumb-preview be-thumb-${v.key}`}>
              <div className="be-thumb-line be-thumb-title" />
              <div className="be-thumb-line be-thumb-sub" />
              <div className="be-thumb-line be-thumb-body" />
              <div className="be-thumb-line be-thumb-body be-thumb-short" />
            </div>
            <span>{v.label}</span>
          </button>
        ))}
      </div>
      <div className="be-field-row">
        <div className="be-field-col">
          <div className="be-field-label">Title</div>
          <input className="be-field-input" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Card title" />
        </div>
        <div className="be-field-toggle">
          <div className="be-field-label">Title</div>
          <button className={`be-toggle ${block.title ? 'be-toggle-on' : ''}`} onClick={() => update({ title: block.title ? '' : 'Card Title' })}>
            <div className="be-toggle-dot" />
          </button>
        </div>
      </div>
      <div className="be-field-label">Description</div>
      <input className="be-field-input" value={block.description} onChange={e => update({ description: e.target.value })} placeholder="Short description" />
      <div className="be-field-label">Content</div>
      <RichTextarea className="be-field-textarea" value={block.content} onChange={v => update({ content: v })} placeholder="Card body content..." />
      <div className="be-field-label">Footer</div>
      <input className="be-field-input" value={block.footer || ''} onChange={e => update({ footer: e.target.value })} placeholder="Footer actions or text" />
    </div>
  )
}

function BlockAlert({ block, update }: { block: AlertBlock; update: (d: Partial<AlertBlock>) => void }) {
  const variants: { key: AlertBlock['variant']; icon: string; color: string; bg: string }[] = [
    { key: 'info', icon: 'ti-info-circle', color: '#1e40af', bg: '#eff6ff' },
    { key: 'success', icon: 'ti-circle-check', color: '#166534', bg: '#f0fdf4' },
    { key: 'warning', icon: 'ti-alert-triangle', color: '#854d0e', bg: '#fefce8' },
    { key: 'error', icon: 'ti-alert-octagon', color: '#991b1b', bg: '#fef2f2' },
  ]
  return (
    <div className="be-field-group">
      <div className="be-field-label">Variant</div>
      <div className="be-visual-picker">
        {variants.map(v => (
          <button key={v.key} className={`be-vpick ${block.variant === v.key ? 'be-vpick-active' : ''}`} onClick={() => update({ variant: v.key })} style={{ '--vpick-color': v.color, '--vpick-bg': v.bg } as React.CSSProperties}>
            <i className={`ti ${v.icon}`} style={{ color: v.color }} />
            <span>{v.key.charAt(0).toUpperCase() + v.key.slice(1)}</span>
          </button>
        ))}
      </div>
      <div className="be-field-label">Title</div>
      <input className="be-field-input" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Alert title" />
      <div className="be-field-label">Message</div>
      <RichTextarea className="be-field-textarea" value={block.content} onChange={v => update({ content: v })} placeholder="Alert message..." />
    </div>
  )
}

function BlockAccordion({ block, update }: { block: AccordionBlock; update: (d: Partial<AccordionBlock>) => void }) {
  return (
    <div className="be-accordion">
      {block.items.map((item, i) => (
        <div key={i} className="be-accordion-item">
          <div className="be-accordion-header">
            <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--subtle)' }} />
            <input className="be-accordion-title" value={item.title} onChange={e => { const items = [...block.items]; items[i] = { ...items[i], title: e.target.value }; update({ items }) }} placeholder="Section title" />
            {block.items.length > 1 && (
              <button className="be-mini-btn" onClick={() => { const items = [...block.items]; items.splice(i, 1); update({ items }) }}><i className="ti ti-x" /></button>
            )}
          </div>
          <AutoTextarea className="be-accordion-body" value={item.content} onChange={v => { const items = [...block.items]; items[i] = { ...items[i], content: v }; update({ items }) }} placeholder="Content..." />
        </div>
      ))}
      <button className="be-add-sub" onClick={() => update({ items: [...block.items, { title: '', content: '' }] })}>
        <i className="ti ti-plus" /> Add section
      </button>
    </div>
  )
}

function BlockSteps({ block, update }: { block: StepsBlock; update: (d: Partial<StepsBlock>) => void }) {
  return (
    <div className="be-steps">
      {block.steps.map((step, i) => (
        <div key={i} className="be-step">
          <div className="be-step-num">{i + 1}</div>
          <div className="be-step-fields">
            <input className="be-step-title" value={step.title} onChange={e => { const steps = [...block.steps]; steps[i] = { ...steps[i], title: e.target.value }; update({ steps }) }} placeholder="Step title" />
            <input className="be-step-desc" value={step.description} onChange={e => { const steps = [...block.steps]; steps[i] = { ...steps[i], description: e.target.value }; update({ steps }) }} placeholder="Description" />
          </div>
          {block.steps.length > 1 && (
            <button className="be-mini-btn" onClick={() => { const steps = [...block.steps]; steps.splice(i, 1); update({ steps }) }}><i className="ti ti-x" /></button>
          )}
        </div>
      ))}
      <button className="be-add-sub" onClick={() => update({ steps: [...block.steps, { title: '', description: '' }] })}>
        <i className="ti ti-plus" /> Add step
      </button>
    </div>
  )
}

function BlockTable({ block, update }: { block: TableBlock; update: (d: Partial<TableBlock>) => void }) {
  return (
    <div className="be-table-wrap">
      <table className="be-table">
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th key={i}><input className="be-table-cell be-table-th" value={h} onChange={e => { const headers = [...block.headers]; headers[i] = e.target.value; update({ headers }) }} /></th>
            ))}
            <th className="be-table-action"><button className="be-mini-btn" onClick={() => update({ headers: [...block.headers, ''], rows: block.rows.map(r => [...r, '']) })}><i className="ti ti-plus" /></button></th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}><input className="be-table-cell" value={cell} onChange={e => { const rows = block.rows.map(r => [...r]); rows[ri][ci] = e.target.value; update({ rows }) }} /></td>
              ))}
              <td className="be-table-action">
                {block.rows.length > 1 && <button className="be-mini-btn" onClick={() => update({ rows: block.rows.filter((_, i) => i !== ri) })}><i className="ti ti-x" /></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="be-add-sub" onClick={() => update({ rows: [...block.rows, block.headers.map(() => '')] })}>
        <i className="ti ti-plus" /> Add row
      </button>
      {block.headers.length > 1 && (
        <button className="be-add-sub" onClick={() => update({ headers: block.headers.slice(0, -1), rows: block.rows.map(r => r.slice(0, -1)) })} style={{ marginLeft: 8 }}>
          <i className="ti ti-minus" /> Remove column
        </button>
      )}
    </div>
  )
}

function RenderBlock({ block, update, opts }: { block: Block; update: (d: any) => void; opts: RenderOpts }) {
  switch (block.type) {
    case 'text': return <BlockText block={block} update={update} opts={opts} />
    case 'heading': return <BlockHeading block={block} update={update} opts={opts} />
    case 'bullet-list': return (
      <div className="be-field-group">
        <div className="be-field-label">Items</div>
        <ListItems items={block.items} onChange={items => update({ items })} marker={() => '•'} />
      </div>
    )
    case 'number-list': return (
      <div className="be-field-group">
        <div className="be-field-label">Items</div>
        <ListItems items={block.items} onChange={items => update({ items })} marker={i => `${i + 1}.`} />
      </div>
    )
    case 'checklist': return (
      <div className="be-field-group">
        <div className="be-field-label">Tasks</div>
        <BlockChecklist block={block} update={update} />
      </div>
    )
    case 'quote': return (
      <div className="be-field-group">
        <div className="be-field-label">Quote</div>
        <RichTextarea className="be-field-textarea" value={block.content} onChange={v => update({ content: v })} placeholder="Write your quote..." />
      </div>
    )
    case 'divider': return (
      <div className="be-field-group">
        <div className="be-field-note"><i className="ti ti-minus" /> Horizontal divider -- no settings needed</div>
      </div>
    )
    case 'code': return (
      <div className="be-field-group">
        <div className="be-field-label">Language</div>
        <input className="be-field-input" value={block.language} onChange={e => update({ language: e.target.value })} placeholder="javascript, python, etc." />
        <div className="be-field-label">Code</div>
        <textarea className="be-field-code" value={block.content} onChange={e => update({ content: e.target.value })} placeholder="// paste or write code here" spellCheck={false} />
      </div>
    )
    case 'callout': return <BlockCallout block={block} update={update} />
    case 'card': return <BlockCard block={block} update={update} />
    case 'alert': return <BlockAlert block={block} update={update} />
    case 'accordion': return <BlockAccordion block={block} update={update} />
    case 'steps': return <BlockSteps block={block} update={update} />
    case 'progress': return (
      <div className="be-field-group">
        <div className="be-field-label">Label</div>
        <input className="be-field-input" value={block.label} onChange={e => update({ label: e.target.value })} placeholder="Progress label" />
        <div className="be-field-label">Value -- {block.value}%</div>
        <input type="range" min={0} max={100} value={block.value} onChange={e => update({ value: parseInt(e.target.value) })} className="be-field-range" />
      </div>
    )
    case 'columns': return (
      <div className="be-field-group">
        <div className="be-field-label">Columns</div>
        <div className={`be-columns be-col-${block.count}`}>
          {block.columns.map((col, i) => (
            <div key={i} className="be-col-wrap">
              <div className="be-field-label-sm">Column {i + 1}</div>
              <AutoTextarea className="be-field-textarea" value={col} onChange={v => { const columns = [...block.columns]; columns[i] = v; update({ columns }) }} placeholder={`Content for column ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>
    )
    case 'table': return (
      <div className="be-field-group">
        <div className="be-field-label">Table</div>
        <BlockTable block={block} update={update} />
      </div>
    )
    case 'recall': return (
      <div className="be-field-group">
        <div className="be-field-label"><i className="ti ti-brain" style={{ fontSize: 11 }} /> Hidden Answer</div>
        <div className="be-field-hint">This content is hidden until the student clicks reveal in Study mode.</div>
        <AutoTextarea className="be-field-textarea" value={block.content} onChange={v => update({ content: v })} placeholder="Write the answer to reveal..." />
      </div>
    )
    case 'image': return (
      <div className="be-field-group">
        {block.url && <img src={block.url} alt={block.caption} className="be-field-img-preview" />}
        <div className="be-field-label">Image URL</div>
        <input className="be-field-input" value={block.url} onChange={e => update({ url: e.target.value })} placeholder="https://example.com/image.png" />
        <div className="be-field-label">Caption</div>
        <input className="be-field-input" value={block.caption} onChange={e => update({ caption: e.target.value })} placeholder="Image caption (optional)" />
      </div>
    )
    case 'badge': return (
      <div className="be-field-group">
        <div className="be-field-label">Badges</div>
        <div className="be-badge-list">
          {block.items.map((item, i) => (
            <div key={i} className="be-badge-item">
              <input className="be-field-input" value={item.text} onChange={e => { const items = [...block.items]; items[i] = { ...items[i], text: e.target.value }; update({ items }) }} placeholder="Badge text" style={{ flex: 1 }} />
              <div className="be-badge-variants">
                {(['default', 'secondary', 'outline', 'destructive'] as const).map(v => (
                  <button key={v} className={`be-badge-vpick be-badge-${v} ${item.variant === v ? 'be-badge-vpick-active' : ''}`} onClick={() => { const items = [...block.items]; items[i] = { ...items[i], variant: v }; update({ items }) }}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              {block.items.length > 1 && (
                <button className="be-mini-btn" onClick={() => { const items = [...block.items]; items.splice(i, 1); update({ items }) }}><i className="ti ti-x" /></button>
              )}
            </div>
          ))}
        </div>
        <button className="be-add-sub" onClick={() => update({ items: [...block.items, { text: '', variant: 'default' as const }] })}>
          <i className="ti ti-plus" /> Add badge
        </button>
      </div>
    )
    default: return <div className="be-field-note">Unknown block type</div>
  }
}

/* ---- block info helpers ---- */

const BLOCK_META: Record<string, { label: string; icon: string }> = {
  text: { label: 'Text', icon: 'ti-align-left' },
  heading: { label: 'Heading', icon: 'ti-heading' },
  'bullet-list': { label: 'Bullet List', icon: 'ti-list' },
  'number-list': { label: 'Numbered List', icon: 'ti-list-numbers' },
  checklist: { label: 'Checklist', icon: 'ti-checkbox' },
  quote: { label: 'Quote', icon: 'ti-blockquote' },
  divider: { label: 'Divider', icon: 'ti-minus' },
  code: { label: 'Code', icon: 'ti-code' },
  callout: { label: 'Callout', icon: 'ti-info-circle' },
  card: { label: 'Card', icon: 'ti-layout-cards' },
  alert: { label: 'Alert', icon: 'ti-alert-circle' },
  accordion: { label: 'Accordion', icon: 'ti-layout-bottombar-collapse' },
  steps: { label: 'Steps', icon: 'ti-list-check' },
  progress: { label: 'Progress', icon: 'ti-chart-bar' },
  columns: { label: 'Columns', icon: 'ti-columns-2' },
  table: { label: 'Table', icon: 'ti-table' },
  recall: { label: 'Active Recall', icon: 'ti-brain' },
  image: { label: 'Image', icon: 'ti-photo' },
  badge: { label: 'Badges', icon: 'ti-tag' },
}

function blockSummary(block: Block): string {
  switch (block.type) {
    case 'text': return block.content?.slice(0, 50) || 'Empty text'
    case 'heading': return block.content || `Heading ${block.level}`
    case 'bullet-list': case 'number-list': return `${block.items.length} item${block.items.length !== 1 ? 's' : ''}`
    case 'checklist': { const done = block.items.filter(i => i.checked).length; return `${done}/${block.items.length} done` }
    case 'quote': return block.content?.slice(0, 40) || 'Empty quote'
    case 'divider': return 'Horizontal rule'
    case 'code': return block.language || 'Code block'
    case 'callout': return block.title || block.variant
    case 'card': return block.title || 'Untitled card'
    case 'alert': return `${block.variant}: ${block.title}`
    case 'accordion': return `${block.items.length} section${block.items.length !== 1 ? 's' : ''}`
    case 'steps': return `${block.steps.length} step${block.steps.length !== 1 ? 's' : ''}`
    case 'progress': return `${block.label} - ${block.value}%`
    case 'columns': return `${block.count} columns`
    case 'table': return `${block.headers.length}x${block.rows.length} table`
    case 'recall': return block.content?.slice(0, 40) || 'Hidden answer'
    case 'image': return block.caption || block.url?.slice(0, 40) || 'No image'
    case 'badge': return block.items.map(b => b.text).join(', ') || 'No badges'
    default: return ''
  }
}

/* ---- preview renderer ---- */

function PreviewBlock({ block }: { block: Block }) {
  const meta = BLOCK_META[block.type]
  switch (block.type) {
    case 'text': return block.content ? <p className="bp-text">{block.content}</p> : <p className="bp-empty">Text block</p>
    case 'heading': {
      const text = block.content || meta?.label || 'Heading'
      const cls = block.content ? 'bp-heading' : 'bp-heading bp-empty'
      if (block.level === 1) return <h1 className={cls}>{text}</h1>
      if (block.level === 2) return <h2 className={cls}>{text}</h2>
      if (block.level === 3) return <h3 className={cls}>{text}</h3>
      return <h4 className={cls}>{text}</h4>
    }
    case 'bullet-list': return <ul className="bp-list">{block.items.map((item, i) => <li key={i}>{item || <span className="bp-empty">Item</span>}</li>)}</ul>
    case 'number-list': return <ol className="bp-list">{block.items.map((item, i) => <li key={i}>{item || <span className="bp-empty">Item</span>}</li>)}</ol>
    case 'checklist': return (
      <div className="bp-checklist">
        {block.items.map((item, i) => (
          <label key={i} className="bp-check-row">
            <input type="checkbox" checked={item.checked} readOnly />
            <span className={item.checked ? 'bp-done' : ''}>{item.text || 'Task'}</span>
          </label>
        ))}
      </div>
    )
    case 'quote': return <blockquote className="bp-quote">{block.content || 'Quote'}</blockquote>
    case 'divider': return <hr className="bp-hr" />
    case 'code': return (
      <div className="bp-code">
        {block.language && <div className="bp-code-lang">{block.language}</div>}
        <pre><code>{block.content || '// code'}</code></pre>
      </div>
    )
    case 'callout': {
      const colors: Record<string, string> = { tip: 'var(--green)', note: '#2563eb', warning: 'var(--yellow)', important: 'var(--red)', info: '#2563eb', example: '#7c3aed', question: '#d97706' }
      const bgs: Record<string, string> = { tip: 'var(--green-bg)', note: '#eff6ff', warning: 'var(--yellow-bg)', important: 'var(--red-bg)', info: '#eff6ff', example: '#f5f3ff', question: '#fffbeb' }
      return (
        <div className="bp-callout" style={{ borderLeftColor: colors[block.variant] || '#2563eb', background: bgs[block.variant] || '#eff6ff' }}>
          <strong style={{ color: colors[block.variant] }}>{block.title || block.variant}</strong>
          <p>{block.content}</p>
        </div>
      )
    }
    case 'card': return (
      <div className={`bp-card bp-card-${block.variant || 'default'}`}>
        {(block.title || block.description) && (
          <div className="bp-card-header">
            {block.title && <div className="bp-card-title">{block.title}</div>}
            {block.description && <div className="bp-card-desc">{block.description}</div>}
          </div>
        )}
        {block.content && <div className="bp-card-body">{block.content}</div>}
        {block.footer && <div className="bp-card-footer">{block.footer}</div>}
      </div>
    )
    case 'alert': {
      const icons: Record<string, string> = { info: 'ti-info-circle', warning: 'ti-alert-triangle', error: 'ti-alert-octagon', success: 'ti-circle-check' }
      const bgs: Record<string, string> = { info: '#eff6ff', warning: '#fefce8', error: '#fef2f2', success: '#f0fdf4' }
      const borders: Record<string, string> = { info: '#bfdbfe', warning: '#fde68a', error: '#fecaca', success: '#bbf7d0' }
      return (
        <div className="bp-alert" style={{ background: bgs[block.variant], borderColor: borders[block.variant] }}>
          <i className={`ti ${icons[block.variant]}`} />
          <div><strong>{block.title}</strong><br />{block.content}</div>
        </div>
      )
    }
    case 'accordion': return (
      <div className="bp-accordion">
        {block.items.map((item, i) => (
          <details key={i} className="bp-acc-item">
            <summary>{item.title || 'Section'}</summary>
            <p>{item.content}</p>
          </details>
        ))}
      </div>
    )
    case 'steps': return (
      <div className="bp-steps">
        {block.steps.map((step, i) => (
          <div key={i} className="bp-step">
            <div className="bp-step-num">{i + 1}</div>
            <div><strong>{step.title}</strong><br /><span className="bp-step-desc">{step.description}</span></div>
          </div>
        ))}
      </div>
    )
    case 'progress': return (
      <div className="bp-progress">
        <span className="bp-progress-label">{block.label}</span>
        <div className="bp-progress-track"><div className="bp-progress-fill" style={{ width: `${block.value}%` }} /></div>
        <span className="bp-progress-val">{block.value}%</span>
      </div>
    )
    case 'columns': return (
      <div className="bp-columns">{block.columns.map((col, i) => <div key={i} className="bp-col">{col || <span className="bp-empty">Column {i + 1}</span>}</div>)}</div>
    )
    case 'table': return (
      <table className="bp-table">
        <thead><tr>{block.headers.map((h, i) => <th key={i}>{h || 'Header'}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody>
      </table>
    )
    case 'recall': return (
      <div className="bp-recall">
        <div className="bp-recall-header"><i className="ti ti-brain" /> Active Recall</div>
        <div className="bp-recall-hidden">Click to reveal in Study mode</div>
      </div>
    )
    case 'image': return block.url ? (
      <figure className="bp-figure">
        <img src={block.url} alt={block.caption} />
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    ) : <div className="bp-empty" style={{ padding: 20, textAlign: 'center' }}>No image set</div>
    case 'badge': return (
      <div className="bp-badge-group">
        {block.items.map((item, i) => (
          <span key={i} className={`bp-badge bp-badge-${item.variant}`}>{item.text || 'Badge'}</span>
        ))}
      </div>
    )
    default: return null
  }
}

/* ---- main component ---- */

function getTextFieldKey(block: Block): string | null {
  switch (block.type) {
    case 'text': case 'heading': case 'quote': case 'code': case 'callout': case 'card': case 'alert': return 'content'
    default: return null
  }
}

/* ---- editable preview block (inline, no per-block toolbar) ---- */

function InlineEditBlock({ block, update, activeRef }: { block: Block; update: (d: any) => void; activeRef: React.MutableRefObject<HTMLTextAreaElement | null> }) {
  function bindRef(el: HTMLTextAreaElement | null) {
    if (el) {
      el.onfocus = () => { activeRef.current = el }
    }
  }

  switch (block.type) {
    case 'text': return (
      <AutoTextarea ref={bindRef} className="ep-text" value={block.content} onChange={v => update({ content: v })} placeholder="Type something..." />
    )
    case 'heading': return (
      <AutoTextarea ref={bindRef} className={`ep-heading ep-h${block.level}`} value={block.content} onChange={v => update({ content: v })} placeholder={`Heading ${block.level}`} />
    )
    case 'quote': return (
      <div className="ep-quote-wrap">
        <AutoTextarea ref={bindRef} className="ep-quote" value={block.content} onChange={v => update({ content: v })} placeholder="Quote..." />
      </div>
    )
    case 'callout': {
      const colors: Record<string, string> = { tip: 'var(--green)', note: '#2563eb', warning: 'var(--yellow)', important: 'var(--red)', info: '#2563eb', example: '#7c3aed', question: '#d97706' }
      const bgs: Record<string, string> = { tip: 'var(--green-bg)', note: '#eff6ff', warning: 'var(--yellow-bg)', important: 'var(--red-bg)', info: '#eff6ff', example: '#f5f3ff', question: '#fffbeb' }
      return (
        <div className="ep-callout" style={{ borderLeftColor: colors[block.variant] || '#2563eb', background: bgs[block.variant] || '#eff6ff' }}>
          <input className="ep-callout-title" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Title" style={{ color: colors[block.variant] }} />
          <AutoTextarea ref={bindRef} className="ep-callout-body" value={block.content} onChange={v => update({ content: v })} placeholder="Content..." />
        </div>
      )
    }
    case 'card': return (
      <div className={`ep-card ep-card-${block.variant || 'default'}`}>
        <input className="ep-card-title" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Card title" />
        {block.description !== undefined && <input className="ep-card-desc" value={block.description} onChange={e => update({ description: e.target.value })} placeholder="Description" />}
        <AutoTextarea ref={bindRef} className="ep-card-body" value={block.content} onChange={v => update({ content: v })} placeholder="Content..." />
        <input className="ep-card-footer" value={block.footer || ''} onChange={e => update({ footer: e.target.value })} placeholder="Footer" />
      </div>
    )
    case 'alert': {
      const icons: Record<string, string> = { info: 'ti-info-circle', warning: 'ti-alert-triangle', error: 'ti-alert-octagon', success: 'ti-circle-check' }
      const colors: Record<string, string> = { info: '#1e40af', warning: '#854d0e', error: '#991b1b', success: '#166534' }
      const bgs: Record<string, string> = { info: '#eff6ff', warning: '#fefce8', error: '#fef2f2', success: '#f0fdf4' }
      return (
        <div className="ep-alert" style={{ background: bgs[block.variant], color: colors[block.variant], borderColor: colors[block.variant] + '40' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <i className={`ti ${icons[block.variant]}`} style={{ fontSize: 16, marginTop: 3 }} />
            <div style={{ flex: 1 }}>
              <input className="ep-alert-title" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Title" style={{ color: colors[block.variant] }} />
              <AutoTextarea ref={bindRef} className="ep-alert-body" value={block.content} onChange={v => update({ content: v })} placeholder="Message..." />
            </div>
          </div>
        </div>
      )
    }
    default: return <PreviewBlock block={block} />
  }
}

interface Props {
  content: string
  onContentChange: (content: string) => void
  previewOnly?: boolean
  noteTitle?: string
  onTitleChange?: (title: string) => void
  courseName?: string
}

export default function BlockEditor({ content, onContentChange, previewOnly, noteTitle, onTitleChange, courseName }: Props) {
  const initial = useMemo(() => parseContent(content), [])
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks)
  const [meta, setMeta] = useState<NoteMeta>(initial.meta)
  const [menuIndex, setMenuIndex] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [menuSearch, setMenuSearch] = useState('')
  const [activeBlock, setActiveBlock] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuSearchRef = useRef<HTMLInputElement>(null)
  const focusBlockId = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const syncTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
  const syncBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks)
    clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => onContentChange(serializeContent(newBlocks, meta)), 100)
  }, [onContentChange, meta])

  const syncMeta = useCallback((newMeta: NoteMeta) => {
    setMeta(newMeta)
    clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => onContentChange(serializeContent(blocks, newMeta)), 100)
  }, [onContentChange, blocks])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuIndex(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (focusBlockId.current && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-block-id="${focusBlockId.current}"]`)
      const input = el?.querySelector('input, textarea') as HTMLElement
      input?.focus()
      focusBlockId.current = null
      setActiveBlock(focusBlockId.current)
    }
  })

  useEffect(() => {
    if (menuIndex !== null) setTimeout(() => menuSearchRef.current?.focus(), 0)
    else setMenuSearch('')
  }, [menuIndex])

  function updateBlock(id: string, data: any) {
    syncBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b))
  }

  function addBlock(index: number, blockData: Omit<Block, 'id'>) {
    const id = uid()
    const newBlock = { ...blockData, id } as Block
    const newBlocks = [...blocks]
    newBlocks.splice(index, 0, newBlock)
    focusBlockId.current = id
    setActiveBlock(id)
    syncBlocks(newBlocks)
    setMenuIndex(null)
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return
    if (activeBlock === id) setActiveBlock(null)
    syncBlocks(blocks.filter(b => b.id !== id))
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < 0) return
    const ni = idx + dir
    if (ni < 0 || ni >= blocks.length) return
    const nb = [...blocks]
    ;[nb[idx], nb[ni]] = [nb[ni], nb[idx]]
    syncBlocks(nb)
  }

  function duplicateBlock(id: string) {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < 0) return
    const newId = uid()
    const clone = { ...JSON.parse(JSON.stringify(blocks[idx])), id: newId }
    const nb = [...blocks]
    nb.splice(idx + 1, 0, clone)
    setActiveBlock(newId)
    syncBlocks(nb)
  }

  function openMenu(index: number, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 380
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow < menuHeight ? Math.max(8, rect.top - menuHeight) : rect.bottom + 4
    const left = Math.min(rect.left, window.innerWidth - 260)
    setMenuPos({ top, left })
    setMenuIndex(index)
  }

  const categories = [...new Set(CATALOG.map(c => c.cat))]
  const filtered = menuSearch ? CATALOG.filter(c => c.label.toLowerCase().includes(menuSearch.toLowerCase())) : CATALOG

  const activeTextarea = useRef<HTMLTextAreaElement | null>(null)
  const [editFontSize, setEditFontSize] = useState('16')

  function editWrap(prefix: string, suffix: string) {
    const el = activeTextarea.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = el.value
    const selected = val.slice(start, end)
    const blockEl = el.closest('[data-block-id]')
    const blockId = blockEl?.getAttribute('data-block-id')
    if (!blockId) return
    const blk = blocks.find(b => b.id === blockId)
    if (!blk) return
    const field = getTextFieldKey(blk)
    if (!field) return
    const fullVal = (blk as any)[field] as string
    const next = fullVal.slice(0, start) + prefix + (selected || 'text') + suffix + fullVal.slice(end)
    updateBlock(blockId, { [field]: next })
    setTimeout(() => {
      el.focus()
      const inner = selected || 'text'
      el.setSelectionRange(start + prefix.length, start + prefix.length + inner.length)
    }, 0)
  }

  function editInsertLine(prefix: string) {
    const el = activeTextarea.current
    if (!el) return
    const pos = el.selectionEnd
    const blockEl = el.closest('[data-block-id]')
    const blockId = blockEl?.getAttribute('data-block-id')
    if (!blockId) return
    const blk = blocks.find(b => b.id === blockId)
    if (!blk) return
    const field = getTextFieldKey(blk)
    if (!field) return
    const val = (blk as any)[field] as string
    const before = val.slice(0, pos)
    const after = val.slice(pos)
    const nl = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
    updateBlock(blockId, { [field]: before + nl + prefix + after })
  }

  if (previewOnly) {
    return (
      <div className="ep-container" ref={containerRef}>
        <div className="ep-header">
          <div className="ep-directory">
            <span>Notes</span>
            {courseName && (<><i className="ti ti-chevron-right" /><span>{courseName}</span></>)}
            <i className="ti ti-chevron-right" />
            <span className="ep-dir-current">{noteTitle || 'Untitled'}</span>
          </div>
          <input className="ep-title" value={noteTitle || ''} onChange={e => onTitleChange?.(e.target.value)} placeholder="Untitled" />
          <input className="ep-subtitle" value={meta.subtitle} onChange={e => syncMeta({ ...meta, subtitle: e.target.value })} placeholder="Add a subtitle..." />
          <div className="ep-excerpt-section">
            <label className="ep-meta-label">Featured excerpt</label>
            <p className="ep-meta-hint">This will be displayed on both the note card and search results.</p>
          </div>
        </div>
        <div className="ep-toolbar">
          <div className="be-fmt-group">
            <i className="ti ti-typography be-fmt-icon" />
            <select className="be-fmt-select" value="Inter" onChange={() => {}}><option>Inter</option></select>
          </div>
          <div className="be-fmt-sep" />
          <div className="be-fmt-group">
            <select className="be-fmt-select be-fmt-size" value={editFontSize} onChange={e => setEditFontSize(e.target.value)}>
              <option value="14">14px</option><option value="16">16px</option><option value="18">18px</option><option value="20">20px</option>
            </select>
          </div>
          <div className="be-fmt-sep" />
          <div className="be-fmt-group">
            <button className="be-fmt-btn" onClick={() => editWrap('**', '**')} title="Bold" type="button"><i className="ti ti-bold" /></button>
            <button className="be-fmt-btn" onClick={() => editWrap('*', '*')} title="Italic" type="button"><i className="ti ti-italic" /></button>
            <button className="be-fmt-btn" onClick={() => editWrap('<u>', '</u>')} title="Underline" type="button"><i className="ti ti-underline" /></button>
          </div>
          <div className="be-fmt-sep" />
          <div className="be-fmt-group">
            <button className="be-fmt-btn" title="Text color" type="button"><span className="be-fmt-color" /></button>
          </div>
          <div className="be-fmt-sep" />
          <div className="be-fmt-group">
            <button className="be-fmt-btn" title="Align left" type="button"><i className="ti ti-align-left" /></button>
            <button className="be-fmt-btn" title="Align center" type="button"><i className="ti ti-align-center" /></button>
            <button className="be-fmt-btn" title="Align right" type="button"><i className="ti ti-align-right" /></button>
          </div>
          <div className="be-fmt-sep" />
          <div className="be-fmt-group">
            <button className="be-fmt-btn" onClick={() => editInsertLine('- ')} title="Bullet list" type="button"><i className="ti ti-list" /></button>
            <button className="be-fmt-btn" onClick={() => editInsertLine('1. ')} title="Numbered list" type="button"><i className="ti ti-list-numbers" /></button>
          </div>
          <div className="be-fmt-sep" />
          <div className="be-fmt-group">
            <button className="be-fmt-btn" onClick={() => editWrap('[', '](url)')} title="Link" type="button"><i className="ti ti-link" /></button>
            <button className="be-fmt-btn" onClick={() => editInsertLine('![image](url)')} title="Image" type="button"><i className="ti ti-photo" /></button>
            <button className="be-fmt-btn" onClick={() => editWrap('`', '`')} title="Code" type="button"><i className="ti ti-code" /></button>
          </div>
        </div>
        <div className="ep-body" style={{ fontSize: `${editFontSize}px` }}>
          {blocks.map(block => (
            <div key={block.id} className="ep-block" data-block-id={block.id}>
              <InlineEditBlock block={block} update={(data: any) => updateBlock(block.id, data)} activeRef={activeTextarea} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="block-editor" ref={containerRef}>
      {/* ---- Builder panel (left) ---- */}
      <div className="be-builder">
        <div className="be-builder-header">
          <span>Building Blocks</span>
          <span className="be-builder-count">{blocks.length} Block{blocks.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="be-builder-list">
          {blocks.map((block, i) => {
            const meta = BLOCK_META[block.type] || { label: block.type, icon: 'ti-square' }
            const isActive = activeBlock === block.id
            return (
              <div key={block.id} data-block-id={block.id}>
                <div className={`be-row ${isActive ? 'be-row-active' : ''}`} onClick={() => setActiveBlock(isActive ? null : block.id)}>
                  <div className="be-row-grip"><i className="ti ti-grip-vertical" /></div>
                  <div className="be-row-icon"><i className={`ti ${meta.icon}`} /></div>
                  <div className="be-row-info">
                    <div className="be-row-label">{meta.label}</div>
                    <div className="be-row-summary">{blockSummary(block)}</div>
                  </div>
                  <button className="be-row-delete" onClick={e => { e.stopPropagation(); deleteBlock(block.id) }} disabled={blocks.length <= 1} title="Delete block">
                    <i className="ti ti-trash" />
                  </button>
                </div>

                {isActive && (
                  <div className="be-row-editor">
                    <div className="be-row-editor-actions">
                      <button className="be-ctrl" onClick={() => moveBlock(block.id, -1)} disabled={i === 0} title="Move up"><i className="ti ti-chevron-up" /></button>
                      <button className="be-ctrl" onClick={() => moveBlock(block.id, 1)} disabled={i === blocks.length - 1} title="Move down"><i className="ti ti-chevron-down" /></button>
                      <button className="be-ctrl" onClick={() => duplicateBlock(block.id)} title="Duplicate"><i className="ti ti-copy" /></button>
                    </div>
                    <RenderBlock block={block} update={(data: any) => updateBlock(block.id, data)} opts={{ onEnter: () => addBlock(i + 1, { type: 'text', content: '' } as any) }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button className="be-add-bottom" onClick={e => openMenu(blocks.length, e)}>
          <i className="ti ti-plus" /> Add block
        </button>
      </div>

      {/* ---- Live preview (right) ---- */}
      <div className="be-preview">
        <div className="be-preview-header">Preview</div>
        <div className="be-preview-body">
          {blocks.map(block => (
            <div
              key={block.id}
              className={`be-preview-block ${activeBlock === block.id ? 'be-preview-highlight' : ''}`}
              onClick={() => setActiveBlock(block.id)}
            >
              <PreviewBlock block={block} />
            </div>
          ))}
        </div>
      </div>

      {/* ---- Add block menu (portal) ---- */}
      {menuIndex !== null && createPortal(
        <div ref={menuRef} className="be-menu" style={{ top: menuPos.top, left: menuPos.left }}>
          <input ref={menuSearchRef} className="be-menu-search" value={menuSearch} onChange={e => setMenuSearch(e.target.value)} placeholder="Search blocks..." onKeyDown={e => { if (e.key === 'Escape') setMenuIndex(null) }} />
          <div className="be-menu-list">
            {menuSearch ? (
              filtered.length > 0 ? filtered.map(item => (
                <button key={item.type} className="be-menu-item" onClick={() => addBlock(menuIndex, item.create() as any)}>
                  <i className={`ti ${item.icon}`} /><span>{item.label}</span>
                </button>
              )) : <div className="be-menu-empty">No blocks found</div>
            ) : (
              categories.map(cat => (
                <div key={cat}>
                  <div className="be-menu-cat">{cat}</div>
                  {CATALOG.filter(c => c.cat === cat).map(item => (
                    <button key={item.type} className="be-menu-item" onClick={() => addBlock(menuIndex, item.create() as any)}>
                      <i className={`ti ${item.icon}`} /><span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
