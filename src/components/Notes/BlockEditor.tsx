import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
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
interface CardBlock extends BlockBase { type: 'card'; title: string; description: string; content: string }
interface AlertBlock extends BlockBase { type: 'alert'; variant: 'info' | 'warning' | 'error' | 'success'; title: string; content: string }
interface AccordionBlock extends BlockBase { type: 'accordion'; items: { title: string; content: string }[] }
interface StepsBlock extends BlockBase { type: 'steps'; steps: { title: string; description: string }[] }
interface ProgressBlock extends BlockBase { type: 'progress'; label: string; value: number }
interface ColumnsBlock extends BlockBase { type: 'columns'; count: 2 | 3; columns: string[] }
interface TableBlock extends BlockBase { type: 'table'; headers: string[]; rows: string[][] }
interface RecallBlock extends BlockBase { type: 'recall'; content: string }
interface ImageBlock extends BlockBase { type: 'image'; url: string; caption: string }

type Block = TextBlock | HeadingBlock | BulletListBlock | NumberListBlock | ChecklistBlock | QuoteBlock | DividerBlock | CodeBlock | CalloutBlock | CardBlock | AlertBlock | AccordionBlock | StepsBlock | ProgressBlock | ColumnsBlock | TableBlock | RecallBlock | ImageBlock

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

  { cat: 'Components', type: 'card', icon: 'ti-layout-cards', label: 'Card', create: () => ({ type: 'card', title: 'Card Title', description: '', content: 'Card content goes here.' }) },
  { cat: 'Components', type: 'alert', icon: 'ti-alert-circle', label: 'Alert', create: () => ({ type: 'alert', variant: 'info' as const, title: 'Note', content: 'Alert content here.' }) },
  { cat: 'Components', type: 'accordion', icon: 'ti-layout-bottombar-collapse', label: 'Accordion', create: () => ({ type: 'accordion', items: [{ title: 'Section 1', content: 'Content' }] }) },
  { cat: 'Components', type: 'steps', icon: 'ti-list-check', label: 'Steps', create: () => ({ type: 'steps', steps: [{ title: 'Step 1', description: 'Description' }] }) },
  { cat: 'Components', type: 'progress', icon: 'ti-chart-bar', label: 'Progress Bar', create: () => ({ type: 'progress', label: 'Progress', value: 50 }) },
  { cat: 'Components', type: 'table', icon: 'ti-table', label: 'Table', create: () => ({ type: 'table', headers: ['Header 1', 'Header 2', 'Header 3'], rows: [['', '', ''], ['', '', '']] }) },

  { cat: 'Layout', type: 'columns-2', icon: 'ti-columns-2', label: 'Two Columns', create: () => ({ type: 'columns', count: 2 as const, columns: ['', ''] }) },
  { cat: 'Layout', type: 'columns-3', icon: 'ti-columns-3', label: 'Three Columns', create: () => ({ type: 'columns', count: 3 as const, columns: ['', '', ''] }) },

  { cat: 'Study', type: 'recall', icon: 'ti-brain', label: 'Active Recall', create: () => ({ type: 'recall', content: 'Hidden answer' }) },
]

/* ---- helpers ---- */

let _id = 0
function uid(): string { return Date.now().toString(36) + (++_id).toString(36) }

function parseBlocks(content: string): Block[] {
  if (!content?.trim()) return [{ id: uid(), type: 'text', content: '' }]
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return parsed.map((b: Block) => ({ ...b, id: b.id || uid() }))
    }
  } catch { /* not JSON */ }
  return [{ id: uid(), type: 'text', content }]
}

function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks)
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
      case 'card': {
        let h = '<div class="sc-card">'
        if (b.title || b.description) {
          h += '<div class="sc-card-header">'
          if (b.title) h += `<div class="sc-card-title">${b.title}</div>`
          if (b.description) h += `<div class="sc-card-desc">${b.description}</div>`
          h += '</div>'
        }
        if (b.content) h += `<div class="sc-card-content">${b.content}</div>`
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

/* ---- block renderers ---- */

interface RenderOpts {
  onEnter?: () => void
}

function BlockText({ block, update, opts }: { block: TextBlock; update: (d: Partial<TextBlock>) => void; opts: RenderOpts }) {
  return (
    <AutoTextarea
      className="be-text"
      value={block.content}
      onChange={v => update({ content: v })}
      placeholder="Type something..."
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); opts.onEnter?.() } }}
    />
  )
}

function BlockHeading({ block, update, opts }: { block: HeadingBlock; update: (d: Partial<HeadingBlock>) => void; opts: RenderOpts }) {
  return (
    <input
      className={`be-heading be-h${block.level}`}
      value={block.content}
      onChange={e => update({ content: e.target.value })}
      placeholder={`Heading ${block.level}`}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); opts.onEnter?.() } }}
    />
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
  const bgs: Record<string, string> = { tip: 'var(--green-bg)', note: '#eff6ff', warning: 'var(--yellow-bg)', important: 'var(--red-bg)', info: '#eff6ff', example: '#f5f3ff', question: '#fffbeb' }
  const c = colors[block.variant] || '#2563eb'
  return (
    <div className="be-callout" style={{ borderLeftColor: c, background: bgs[block.variant] || '#eff6ff' }}>
      <div className="be-callout-header">
        <select className="be-callout-type" value={block.variant} onChange={e => update({ variant: e.target.value })} style={{ color: c }}>
          {variants.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
        </select>
        <input className="be-callout-title" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Title" style={{ color: c }} />
      </div>
      <AutoTextarea className="be-callout-content" value={block.content} onChange={v => update({ content: v })} placeholder="Content..." />
    </div>
  )
}

function BlockCard({ block, update }: { block: CardBlock; update: (d: Partial<CardBlock>) => void }) {
  return (
    <div className="be-card">
      <input className="be-card-title" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Card Title" />
      <input className="be-card-desc" value={block.description} onChange={e => update({ description: e.target.value })} placeholder="Description (optional)" />
      <AutoTextarea className="be-card-content" value={block.content} onChange={v => update({ content: v })} placeholder="Content..." />
    </div>
  )
}

function BlockAlert({ block, update }: { block: AlertBlock; update: (d: Partial<AlertBlock>) => void }) {
  const icons: Record<string, string> = { info: 'ti-info-circle', warning: 'ti-alert-triangle', error: 'ti-alert-octagon', success: 'ti-circle-check' }
  const colors: Record<string, string> = { info: '#1e40af', warning: '#854d0e', error: '#991b1b', success: '#166534' }
  const bgs: Record<string, string> = { info: '#eff6ff', warning: '#fefce8', error: '#fef2f2', success: '#f0fdf4' }
  return (
    <div className="be-alert" style={{ background: bgs[block.variant], color: colors[block.variant], borderColor: colors[block.variant] + '40' }}>
      <div className="be-alert-header">
        <i className={`ti ${icons[block.variant]}`} />
        <select className="be-alert-variant" value={block.variant} onChange={e => update({ variant: e.target.value as AlertBlock['variant'] })}>
          <option value="info">Info</option><option value="warning">Warning</option><option value="error">Error</option><option value="success">Success</option>
        </select>
      </div>
      <input className="be-alert-title" value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Title" />
      <AutoTextarea className="be-alert-content" value={block.content} onChange={v => update({ content: v })} placeholder="Alert message..." />
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
    case 'bullet-list': return <ListItems items={block.items} onChange={items => update({ items })} marker={() => '•'} />
    case 'number-list': return <ListItems items={block.items} onChange={items => update({ items })} marker={i => `${i + 1}.`} />
    case 'checklist': return <BlockChecklist block={block} update={update} />
    case 'quote': return (
      <div className="be-quote">
        <AutoTextarea className="be-quote-text" value={block.content} onChange={v => update({ content: v })} placeholder="Quote..." />
      </div>
    )
    case 'divider': return <hr className="be-divider" />
    case 'code': return (
      <div className="be-code">
        <div className="be-code-header">
          <input className="be-code-lang" value={block.language} onChange={e => update({ language: e.target.value })} placeholder="language" />
        </div>
        <textarea className="be-code-content" value={block.content} onChange={e => update({ content: e.target.value })} placeholder="// code here" spellCheck={false} />
      </div>
    )
    case 'callout': return <BlockCallout block={block} update={update} />
    case 'card': return <BlockCard block={block} update={update} />
    case 'alert': return <BlockAlert block={block} update={update} />
    case 'accordion': return <BlockAccordion block={block} update={update} />
    case 'steps': return <BlockSteps block={block} update={update} />
    case 'progress': return (
      <div className="be-progress">
        <input className="be-progress-label" value={block.label} onChange={e => update({ label: e.target.value })} placeholder="Label" />
        <input type="range" min={0} max={100} value={block.value} onChange={e => update({ value: parseInt(e.target.value) })} className="be-progress-range" />
        <span className="be-progress-val">{block.value}%</span>
      </div>
    )
    case 'columns': return (
      <div className={`be-columns be-col-${block.count}`}>
        {block.columns.map((col, i) => (
          <AutoTextarea key={i} className="be-col-input" value={col} onChange={v => { const columns = [...block.columns]; columns[i] = v; update({ columns }) }} placeholder={`Column ${i + 1}`} />
        ))}
      </div>
    )
    case 'table': return <BlockTable block={block} update={update} />
    case 'recall': return (
      <div className="be-recall">
        <div className="be-recall-label"><i className="ti ti-brain" style={{ fontSize: 11 }} /> Active Recall</div>
        <AutoTextarea className="be-recall-content" value={block.content} onChange={v => update({ content: v })} placeholder="Hidden answer (revealed in Study mode)" />
      </div>
    )
    case 'image': return (
      <div className="be-image">
        {block.url && <img src={block.url} alt={block.caption} className="be-image-preview" />}
        <input className="be-image-url" value={block.url} onChange={e => update({ url: e.target.value })} placeholder="Image URL" />
        <input className="be-image-caption" value={block.caption} onChange={e => update({ caption: e.target.value })} placeholder="Caption (optional)" />
      </div>
    )
    default: return <div style={{ padding: 8, color: 'var(--subtle)', fontSize: 11 }}>Unknown block type</div>
  }
}

/* ---- block type label ---- */

function blockLabel(type: string): string {
  const map: Record<string, string> = {
    text: 'Text', heading: 'Heading', 'bullet-list': 'Bullet List', 'number-list': 'Numbered List',
    checklist: 'Checklist', quote: 'Quote', divider: 'Divider', code: 'Code', callout: 'Callout',
    card: 'Card', alert: 'Alert', accordion: 'Accordion', steps: 'Steps', progress: 'Progress',
    columns: 'Columns', table: 'Table', recall: 'Recall', image: 'Image',
  }
  return map[type] || type
}

/* ---- main component ---- */

interface Props {
  content: string
  onContentChange: (content: string) => void
}

export default function BlockEditor({ content, onContentChange }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(content))
  const [menuIndex, setMenuIndex] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [menuSearch, setMenuSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const menuSearchRef = useRef<HTMLInputElement>(null)
  const focusBlockId = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const syncTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
  const syncBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks)
    clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => onContentChange(serializeBlocks(newBlocks)), 100)
  }, [onContentChange])

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
    syncBlocks(newBlocks)
    setMenuIndex(null)
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return
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
    const clone = { ...JSON.parse(JSON.stringify(blocks[idx])), id: uid() }
    const nb = [...blocks]
    nb.splice(idx + 1, 0, clone)
    syncBlocks(nb)
  }

  function openMenu(index: number, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 260) })
    setMenuIndex(index)
  }

  const categories = [...new Set(CATALOG.map(c => c.cat))]
  const filtered = menuSearch ? CATALOG.filter(c => c.label.toLowerCase().includes(menuSearch.toLowerCase())) : CATALOG

  return (
    <div className="block-editor" ref={containerRef}>
      <div className="be-blocks">
        {blocks.map((block, i) => (
          <div key={block.id} className="be-block-row" data-block-id={block.id}>
            <div className="be-block-controls">
              <button className="be-ctrl" onClick={e => openMenu(i, e)} title="Add block"><i className="ti ti-plus" /></button>
              <div className="be-ctrl be-grab"><i className="ti ti-grip-vertical" /></div>
            </div>

            <div className="be-block-content">
              <div className="be-block-type">{blockLabel(block.type)}</div>
              <RenderBlock block={block} update={(data: any) => updateBlock(block.id, data)} opts={{ onEnter: () => addBlock(i + 1, { type: 'text', content: '' } as any) }} />
            </div>

            <div className="be-block-actions">
              <button className="be-ctrl" onClick={() => moveBlock(block.id, -1)} title="Move up" disabled={i === 0}><i className="ti ti-chevron-up" /></button>
              <button className="be-ctrl" onClick={() => moveBlock(block.id, 1)} title="Move down" disabled={i === blocks.length - 1}><i className="ti ti-chevron-down" /></button>
              <button className="be-ctrl" onClick={() => duplicateBlock(block.id)} title="Duplicate"><i className="ti ti-copy" /></button>
              <button className="be-ctrl be-ctrl-del" onClick={() => deleteBlock(block.id)} title="Delete" disabled={blocks.length <= 1}><i className="ti ti-trash" /></button>
            </div>
          </div>
        ))}

        <button className="be-add-bottom" onClick={e => openMenu(blocks.length, e)}>
          <i className="ti ti-plus" /> Add block
        </button>
      </div>

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
