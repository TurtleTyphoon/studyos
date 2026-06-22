import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  content: string
  onContentChange: (markdown: string) => void
}

const SC_CLASSES = ['sc-card', 'sc-alert', 'sc-tabs', 'sc-steps', 'sc-accordion', 'sc-columns', 'sc-progress-wrap', 'sc-dl', 'sc-figure', 'sc-separator', 'sc-badge']


function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inComponent = false
  let componentLines: string[] = []
  let depth = 0

  for (const line of lines) {
    if (!inComponent && (line.trim().startsWith('<div class="sc-') || line.trim().startsWith('<details class="sc-') ||
        line.trim().startsWith('<dl class="sc-') || line.trim().startsWith('<figure class="sc-') ||
        line.trim().startsWith('<div class="sc-card-row">'))) {
      inComponent = true
      depth = 1
      componentLines = [line]
      continue
    }

    if (inComponent) {
      componentLines.push(line)
      const opens = (line.match(/<(div|details|dl|figure|table)\b/g) ?? []).length
      const closes = (line.match(/<\/(div|details|dl|figure|table)>/g) ?? []).length
      depth += opens - closes
      if (depth <= 0) {
        result.push(`<div class="se-component" contenteditable="false">${componentLines.join('\n')}<button class="se-component-edit" title="Edit">Edit</button></div>`)
        inComponent = false
        componentLines = []
        depth = 0
      }
      continue
    }

    let html = line
    html = html.replace(/^#### (.+)$/, '<h4>$1</h4>')
    html = html.replace(/^### (.+)$/, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/, '<h1>$1</h1>')
    if (html === '---') { result.push('<hr>'); continue }
    html = html.replace(/^> (.+)$/, '<blockquote>$1</blockquote>')
    html = html.replace(/^- \[x\] (.+)$/, '<div class="se-check checked"><input type="checkbox" checked disabled> $1</div>')
    html = html.replace(/^- \[ \] (.+)$/, '<div class="se-check"><input type="checkbox" disabled> $1</div>')
    html = html.replace(/^- (.+)$/, '<li>$1</li>')
    html = html.replace(/^(\d+)\. (.+)$/, '<li>$2</li>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
    html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    if (html.startsWith('<h') || html.startsWith('<hr') || html.startsWith('<blockquote') || html.startsWith('<li') || html.startsWith('<div class="se-check')) {
      result.push(html)
    } else if (html.trim() === '') {
      result.push('<br>')
    } else {
      result.push(`<p>${html}</p>`)
    }
  }

  return result.join('')
}

function htmlToMarkdown(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (el.classList.contains('se-component')) {
      const clone = el.cloneNode(true) as HTMLElement
      clone.querySelector('.se-component-edit')?.remove()
      return '\n' + clone.innerHTML.trim() + '\n'
    }

    const inner = Array.from(el.childNodes).map(walk).join('')

    if (SC_CLASSES.some(c => el.classList.contains(c))) {
      return el.outerHTML + '\n'
    }

    switch (tag) {
      case 'h1': return `# ${inner}\n`
      case 'h2': return `## ${inner}\n`
      case 'h3': return `### ${inner}\n`
      case 'h4': return `#### ${inner}\n`
      case 'strong': case 'b': return `**${inner}**`
      case 'em': case 'i': {
        if (el.classList.contains('ti')) return ''
        return `*${inner}*`
      }
      case 'del': case 's': return `~~${inner}~~`
      case 'mark': return `==${inner}==`
      case 'code': return `\`${inner}\``
      case 'u': return `<u>${inner}</u>`
      case 'a': return `[${inner}](${el.getAttribute('href') ?? 'url'})`
      case 'blockquote': return `> ${inner}\n`
      case 'hr': return '---\n'
      case 'br': return '\n'
      case 'li': return `- ${inner}\n`
      case 'ul': case 'ol': return inner
      case 'p': return `${inner}\n`
      case 'span': {
        if (el.style.backgroundColor) return `==${inner}==`
        return inner
      }
      case 'div': {
        if (el.classList.contains('se-check')) {
          const checked = el.querySelector('input')?.checked
          const text = inner.replace(/^\s*/, '')
          return `- [${checked ? 'x' : ' '}] ${text}\n`
        }
        return `${inner}\n`
      }
      case 'table': return el.outerHTML + '\n'
      case 'button': return ''
      default: return inner
    }
  }

  const md = Array.from(tmp.childNodes).map(walk).join('')
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

interface InsertItem {
  icon: string
  label: string
  html: string
  category: string
}

const INSERT_ITEMS: InsertItem[] = [
  { category: 'Data', icon: 'ti-table', label: 'Table', html: '<table class="se-table"><thead><tr><th>Header</th><th>Header</th><th>Header</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr></tbody></table>' },
  { category: 'Data', icon: 'ti-layout-cards', label: 'Card', html: '<div class="sc-card"><div class="sc-card-header"><div class="sc-card-title">Card Title</div><div class="sc-card-desc">A short description goes here</div></div><div class="sc-card-content">Card content goes here.</div><div class="sc-card-footer">Footer</div></div>' },
  { category: 'Data', icon: 'ti-columns-3', label: 'Card Row', html: '<div class="sc-card-row"><div class="sc-card"><div class="sc-card-header"><div class="sc-card-title">Card 1</div></div><div class="sc-card-content">Content</div></div><div class="sc-card"><div class="sc-card-header"><div class="sc-card-title">Card 2</div></div><div class="sc-card-content">Content</div></div><div class="sc-card"><div class="sc-card-header"><div class="sc-card-title">Card 3</div></div><div class="sc-card-content">Content</div></div></div>' },

  { category: 'Feedback', icon: 'ti-info-circle', label: 'Alert (Info)', html: '<div class="sc-alert sc-alert-info"><i class="ti ti-info-circle"></i><div><strong>Note</strong><br>This is an informational alert.</div></div>' },
  { category: 'Feedback', icon: 'ti-alert-triangle', label: 'Alert (Warning)', html: '<div class="sc-alert sc-alert-warning"><i class="ti ti-alert-triangle"></i><div><strong>Warning</strong><br>Pay attention to this.</div></div>' },
  { category: 'Feedback', icon: 'ti-alert-octagon', label: 'Alert (Error)', html: '<div class="sc-alert sc-alert-error"><i class="ti ti-alert-octagon"></i><div><strong>Critical</strong><br>This is a critical alert.</div></div>' },
  { category: 'Feedback', icon: 'ti-circle-check', label: 'Alert (Success)', html: '<div class="sc-alert sc-alert-success"><i class="ti ti-circle-check"></i><div><strong>Success</strong><br>Everything looks good.</div></div>' },
  { category: 'Feedback', icon: 'ti-chart-bar', label: 'Progress Bar', html: '<div class="sc-progress-wrap"><div class="sc-progress-label">Progress</div><div class="sc-progress"><div class="sc-progress-bar" style="width:60%"></div></div><div class="sc-progress-value">60%</div></div>' },

  { category: 'Interactive', icon: 'ti-layout-bottombar-collapse', label: 'Accordion', html: '<details class="sc-accordion"><summary>Click to expand</summary><div class="sc-accordion-content">Hidden content goes here.</div></details>' },
  { category: 'Interactive', icon: 'ti-layout-list', label: 'Accordion Group', html: '<details class="sc-accordion"><summary>Section 1</summary><div class="sc-accordion-content">Content 1</div></details><details class="sc-accordion"><summary>Section 2</summary><div class="sc-accordion-content">Content 2</div></details><details class="sc-accordion"><summary>Section 3</summary><div class="sc-accordion-content">Content 3</div></details>' },

  { category: 'Inline', icon: 'ti-tag', label: 'Badge', html: '<span class="sc-badge">Label</span>&nbsp;' },
  { category: 'Inline', icon: 'ti-tag', label: 'Badge (Green)', html: '<span class="sc-badge sc-badge-green">Label</span>&nbsp;' },
  { category: 'Inline', icon: 'ti-tag', label: 'Badge (Red)', html: '<span class="sc-badge sc-badge-red">Label</span>&nbsp;' },
  { category: 'Inline', icon: 'ti-tag', label: 'Badge (Blue)', html: '<span class="sc-badge sc-badge-blue">Label</span>&nbsp;' },

  { category: 'Layout', icon: 'ti-columns-2', label: 'Two Columns', html: '<div class="sc-columns"><div class="sc-col">Left column</div><div class="sc-col">Right column</div></div>' },
  { category: 'Layout', icon: 'ti-columns-3', label: 'Three Columns', html: '<div class="sc-columns sc-columns-3"><div class="sc-col">Col 1</div><div class="sc-col">Col 2</div><div class="sc-col">Col 3</div></div>' },

  { category: 'Steps', icon: 'ti-list-numbers', label: 'Steps', html: '<div class="sc-steps"><div class="sc-step"><div class="sc-step-num">1</div><div class="sc-step-body"><div class="sc-step-title">First step</div><div class="sc-step-desc">Description</div></div></div><div class="sc-step"><div class="sc-step-num">2</div><div class="sc-step-body"><div class="sc-step-title">Second step</div><div class="sc-step-desc">Description</div></div></div><div class="sc-step"><div class="sc-step-num">3</div><div class="sc-step-body"><div class="sc-step-title">Third step</div><div class="sc-step-desc">Description</div></div></div></div>' },
  { category: 'Steps', icon: 'ti-vocabulary', label: 'Definition List', html: '<dl class="sc-dl"><dt>Term 1</dt><dd>Definition of term 1</dd><dt>Term 2</dt><dd>Definition of term 2</dd></dl>' },

  { category: 'Tabs', icon: 'ti-layout-navbar', label: 'Tabs', html: '<div class="sc-tabs"><div class="sc-tab-list"><span class="sc-tab active">Tab 1</span><span class="sc-tab">Tab 2</span><span class="sc-tab">Tab 3</span></div><div class="sc-tab-content">Tab content here.</div></div>' },
]

export default function SimpleEditor({ content, onContentChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [insertPos, setInsertPos] = useState({ top: 0, left: 0 })
  const insertBtnRef = useRef<HTMLButtonElement>(null)
  const insertDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const html = markdownToHtml(content)
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html || '<p><br></p>'
        bindComponentEdits()
      }
    }
    isInternalUpdate.current = false
  }, [content])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (insertDropRef.current && !insertDropRef.current.contains(e.target as Node) &&
          insertBtnRef.current && !insertBtnRef.current.contains(e.target as Node)) {
        setInsertOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function bindComponentEdits() {
    if (!editorRef.current) return
    editorRef.current.querySelectorAll('.se-component-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const component = (e.target as HTMLElement).closest('.se-component')
        if (!component) return
        const isEditing = component.getAttribute('contenteditable') === 'true'
        if (isEditing) {
          component.setAttribute('contenteditable', 'false')
          ;(btn as HTMLElement).textContent = 'Edit'
          handleInput()
        } else {
          component.setAttribute('contenteditable', 'true')
          ;(btn as HTMLElement).textContent = 'Done'
          ;(component as HTMLElement).focus()
        }
      })
    })
  }

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    isInternalUpdate.current = true
    const md = htmlToMarkdown(editorRef.current.innerHTML)
    onContentChange(md)
  }, [onContentChange])

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  function insertComponent(html: string) {
    const wrapper = `<div class="se-component" contenteditable="false">${html}<button class="se-component-edit" title="Edit">Edit</button></div><p><br></p>`
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand('insertHTML', false, wrapper)
      handleInput()
      setTimeout(bindComponentEdits, 0)
    }
    setInsertOpen(false)
  }

  function insertInline(html: string) {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand('insertHTML', false, html)
      handleInput()
    }
    setInsertOpen(false)
  }

  function openInsert() {
    if (insertOpen) { setInsertOpen(false); return }
    const rect = insertBtnRef.current?.getBoundingClientRect()
    if (rect) {
      setInsertPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 240) })
    }
    setInsertOpen(true)
  }

  const categories = [...new Set(INSERT_ITEMS.map(i => i.category))]

  return (
    <div className="simple-editor">
      <div className="se-toolbar">
        <select className="se-heading-select" onChange={e => { execCmd('formatBlock', e.target.value); e.target.value = '' }} defaultValue="">
          <option value="" disabled>Heading</option>
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <div className="se-sep" />

        <button className="se-btn" title="Bold" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('bold')}>
          <i className="ti ti-bold" />
        </button>
        <button className="se-btn" title="Italic" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('italic')}>
          <i className="ti ti-italic" />
        </button>
        <button className="se-btn" title="Underline" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('underline')}>
          <i className="ti ti-underline" />
        </button>
        <button className="se-btn" title="Strikethrough" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('strikeThrough')}>
          <i className="ti ti-strikethrough" />
        </button>
        <button className="se-btn" title="Highlight" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('hiliteColor', '#fef08a')}>
          <i className="ti ti-highlight" />
        </button>

        <div className="se-sep" />

        <button className="se-btn" title="Inline Code" onMouseDown={e => e.preventDefault()} onClick={() => {
          const sel = window.getSelection()
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0)
            const code = document.createElement('code')
            code.appendChild(range.extractContents())
            range.insertNode(code)
            handleInput()
          }
        }}>
          <i className="ti ti-code" />
        </button>

        <div className="se-sep" />

        <button className="se-btn" title="Bullet List" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertUnorderedList')}>
          <i className="ti ti-list" />
        </button>
        <button className="se-btn" title="Numbered List" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertOrderedList')}>
          <i className="ti ti-list-numbers" />
        </button>
        <button className="se-btn" title="Checklist" onMouseDown={e => e.preventDefault()} onClick={() => {
          const html = '<div class="se-check"><input type="checkbox" disabled> Task item</div>'
          if (editorRef.current) {
            editorRef.current.focus()
            document.execCommand('insertHTML', false, html)
            handleInput()
          }
        }}>
          <i className="ti ti-checkbox" />
        </button>

        <div className="se-sep" />

        <button className="se-btn" title="Blockquote" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('formatBlock', 'blockquote')}>
          <i className="ti ti-blockquote" />
        </button>
        <button className="se-btn" title="Divider" onMouseDown={e => e.preventDefault()} onClick={() => {
          if (editorRef.current) {
            editorRef.current.focus()
            document.execCommand('insertHTML', false, '<hr>')
            handleInput()
          }
        }}>
          <i className="ti ti-minus" />
        </button>
        <button className="se-btn" title="Link" onMouseDown={e => e.preventDefault()} onClick={() => {
          const url = prompt('Enter URL:')
          if (url) execCmd('createLink', url)
        }}>
          <i className="ti ti-link" />
        </button>

        <div className="se-sep" />

        <button ref={insertBtnRef} className={`se-btn se-btn-wide ${insertOpen ? 'active' : ''}`} onClick={openInsert} onMouseDown={e => e.preventDefault()} title="Insert component">
          <i className="ti ti-plus" />
          <i className="ti ti-chevron-down" style={{ fontSize: 9, marginLeft: 2 }} />
        </button>

        <div className="se-sep" />

        <button className="se-btn" title="Clear Formatting" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('removeFormat')}>
          <i className="ti ti-clear-formatting" />
        </button>
      </div>

      <div
        ref={editorRef}
        className="se-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder="Start writing..."
        spellCheck
      />

      {insertOpen && createPortal(
        <div ref={insertDropRef} className="typo-dropdown-fixed typo-dropdown-wide" style={{ top: insertPos.top, left: insertPos.left }}>
          {categories.map(cat => (
            <div key={cat}>
              <div className="typo-dropdown-label">{cat}</div>
              {INSERT_ITEMS.filter(i => i.category === cat).map(item => (
                <button
                  key={item.label}
                  className="typo-dropdown-item"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => item.category === 'Inline' ? insertInline(item.html) : insertComponent(item.html)}
                >
                  <i className={`ti ${item.icon}`} /><span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
