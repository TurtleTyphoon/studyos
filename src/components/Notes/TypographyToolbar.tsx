import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  content: string
  onContentChange: (content: string) => void
}

function wrapSelection(textarea: HTMLTextAreaElement, content: string, before: string, after: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.slice(start, end)

  if (selected && content.slice(start - before.length, start) === before && content.slice(end, end + after.length) === after) {
    const newContent = content.slice(0, start - before.length) + selected + content.slice(end + after.length)
    return { newContent, selStart: start - before.length, selEnd: end - before.length }
  }

  const newContent = content.slice(0, start) + before + selected + after + content.slice(end)
  return { newContent, selStart: start + before.length, selEnd: end + before.length }
}

function prefixLine(textarea: HTMLTextAreaElement, content: string, prefix: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  let lineEnd = content.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = content.length

  const lines = content.slice(lineStart, lineEnd).split('\n')
  const prefixed = lines.map(line => {
    if (line.startsWith(prefix)) return line.slice(prefix.length)
    return prefix + line
  }).join('\n')

  const newContent = content.slice(0, lineStart) + prefixed + content.slice(lineEnd)
  return { newContent, selStart: lineStart, selEnd: lineStart + prefixed.length }
}

function insertText(textarea: HTMLTextAreaElement, content: string, text: string) {
  const pos = textarea.selectionStart
  const before = content.slice(0, pos)
  const after = content.slice(textarea.selectionEnd)
  const pad = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
  const newContent = before + pad + text + after
  return { newContent, cursorPos: pos + pad.length + text.length }
}

function setHeading(textarea: HTMLTextAreaElement, content: string, level: number) {
  const start = textarea.selectionStart
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  const lineEnd = content.indexOf('\n', start)
  const end = lineEnd === -1 ? content.length : lineEnd
  const line = content.slice(lineStart, end)

  const stripped = line.replace(/^#{1,6}\s*/, '')
  const prefix = level > 0 ? '#'.repeat(level) + ' ' : ''
  const newContent = content.slice(0, lineStart) + prefix + stripped + content.slice(end)
  return { newContent, cursorPos: lineStart + prefix.length + stripped.length }
}

interface DropdownPos { top: number; left: number }

export default function TypographyToolbar({ textareaRef, content, onContentChange }: Props) {
  const [headingOpen, setHeadingOpen] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [headingPos, setHeadingPos] = useState<DropdownPos>({ top: 0, left: 0 })
  const [insertPos, setInsertPos] = useState<DropdownPos>({ top: 0, left: 0 })
  const headingBtnRef = useRef<HTMLButtonElement>(null)
  const insertBtnRef = useRef<HTMLButtonElement>(null)
  const headingDropRef = useRef<HTMLDivElement>(null)
  const insertDropRef = useRef<HTMLDivElement>(null)

  const closeAll = useCallback((e: MouseEvent) => {
    if (headingDropRef.current && !headingDropRef.current.contains(e.target as Node) &&
        headingBtnRef.current && !headingBtnRef.current.contains(e.target as Node)) {
      setHeadingOpen(false)
    }
    if (insertDropRef.current && !insertDropRef.current.contains(e.target as Node) &&
        insertBtnRef.current && !insertBtnRef.current.contains(e.target as Node)) {
      setInsertOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', closeAll)
    return () => document.removeEventListener('mousedown', closeAll)
  }, [closeAll])

  function openHeading() {
    if (headingOpen) { setHeadingOpen(false); return }
    const rect = headingBtnRef.current?.getBoundingClientRect()
    if (rect) setHeadingPos({ top: rect.bottom + 4, left: rect.left })
    setHeadingOpen(true)
    setInsertOpen(false)
  }

  function openInsert() {
    if (insertOpen) { setInsertOpen(false); return }
    const rect = insertBtnRef.current?.getBoundingClientRect()
    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - 240)
      setInsertPos({ top: rect.bottom + 4, left })
    }
    setInsertOpen(true)
    setHeadingOpen(false)
  }

  function exec(fn: (ta: HTMLTextAreaElement, c: string) => { newContent: string; selStart?: number; selEnd?: number; cursorPos?: number }) {
    const ta = textareaRef.current
    if (!ta) return
    const result = fn(ta, content)
    onContentChange(result.newContent)
    setTimeout(() => {
      ta.focus()
      if (result.selStart !== undefined && result.selEnd !== undefined) {
        ta.setSelectionRange(result.selStart, result.selEnd)
      } else if (result.cursorPos !== undefined) {
        ta.setSelectionRange(result.cursorPos, result.cursorPos)
      }
    }, 0)
  }

  function doHeading(level: number) {
    exec((ta, c) => setHeading(ta, c, level))
    setHeadingOpen(false)
  }

  function doInsert(text: string) {
    exec((ta, c) => insertText(ta, c, text))
    setInsertOpen(false)
  }

  function doWrap(before: string, after: string) {
    exec((ta, c) => wrapSelection(ta, c, before, after))
    setInsertOpen(false)
  }

  return (
    <>
      <div className="typo-toolbar">
        {/* Heading dropdown */}
        <button ref={headingBtnRef} className={`typo-btn typo-btn-wide ${headingOpen ? 'active' : ''}`} onClick={openHeading} onMouseDown={e => e.preventDefault()} title="Heading">
          <i className="ti ti-heading" />
          <i className="ti ti-chevron-down" style={{ fontSize: 9, marginLeft: 2 }} />
        </button>

        <div className="typo-sep" />

        <button className="typo-btn" title="Bold" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '**', '**'))}>
          <i className="ti ti-bold" />
        </button>
        <button className="typo-btn" title="Italic" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '*', '*'))}>
          <i className="ti ti-italic" />
        </button>
        <button className="typo-btn" title="Underline" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '<u>', '</u>'))}>
          <i className="ti ti-underline" />
        </button>
        <button className="typo-btn" title="Strikethrough" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '~~', '~~'))}>
          <i className="ti ti-strikethrough" />
        </button>
        <button className="typo-btn" title="Highlight" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '==', '=='))}>
          <i className="ti ti-highlight" />
        </button>

        <div className="typo-sep" />

        <button className="typo-btn" title="Inline Code" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '`', '`'))}>
          <i className="ti ti-code" />
        </button>
        <button className="typo-btn" title="Code Block" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => insertText(ta, c, '\n```\n\n```\n'))}>
          <i className="ti ti-source-code" />
        </button>

        <div className="typo-sep" />

        <button className="typo-btn" title="Bullet List" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '- '))}>
          <i className="ti ti-list" />
        </button>
        <button className="typo-btn" title="Numbered List" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '1. '))}>
          <i className="ti ti-list-numbers" />
        </button>
        <button className="typo-btn" title="Checklist" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '- [ ] '))}>
          <i className="ti ti-checkbox" />
        </button>

        <div className="typo-sep" />

        <button className="typo-btn" title="Blockquote" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '> '))}>
          <i className="ti ti-blockquote" />
        </button>
        <button className="typo-btn" title="Link" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '[', '](url)'))}>
          <i className="ti ti-link" />
        </button>
        <button className="typo-btn" title="Divider" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => insertText(ta, c, '\n---\n'))}>
          <i className="ti ti-minus" />
        </button>

        <div className="typo-sep" />

        {/* Insert dropdown */}
        <button ref={insertBtnRef} className={`typo-btn typo-btn-wide ${insertOpen ? 'active' : ''}`} onClick={openInsert} onMouseDown={e => e.preventDefault()} title="Insert component">
          <i className="ti ti-plus" />
          <i className="ti ti-chevron-down" style={{ fontSize: 9, marginLeft: 2 }} />
        </button>

        <div className="typo-sep" />

        <button className="typo-btn" title="Inline Math" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '$', '$'))}>
          <i className="ti ti-math" />
        </button>
      </div>

      {/* Heading dropdown - fixed position portal */}
      {headingOpen && (
        <div ref={headingDropRef} className="typo-dropdown-fixed" style={{ top: headingPos.top, left: headingPos.left }}>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doHeading(0)}>
            <span style={{ fontSize: 12 }}>Normal text</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doHeading(1)}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Heading 1</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doHeading(2)}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Heading 2</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doHeading(3)}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Heading 3</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doHeading(4)}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Heading 4</span>
          </button>
        </div>
      )}

      {/* Insert dropdown - fixed position portal */}
      {insertOpen && (
        <div ref={insertDropRef} className="typo-dropdown-fixed typo-dropdown-wide" style={{ top: insertPos.top, left: insertPos.left }}>
          <div className="typo-dropdown-label">Data</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n| Header | Header | Header |\n|--------|--------|--------|\n| Cell   | Cell   | Cell   |\n| Cell   | Cell   | Cell   |\n')}>
            <i className="ti ti-table" /><span>Table</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-card">\n<div class="sc-card-header">\n<div class="sc-card-title">Card Title</div>\n<div class="sc-card-desc">A short description goes here</div>\n</div>\n<div class="sc-card-content">\n\nCard content goes here. You can write **markdown** inside.\n\n</div>\n<div class="sc-card-footer">\n<span class="sc-badge">Label</span>\n</div>\n</div>\n')}>
            <i className="ti ti-layout-cards" /><span>Card</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-card sc-card-sm">\n<div class="sc-card-header">\n<div class="sc-card-title">Title</div>\n</div>\n<div class="sc-card-content">\n\nCompact card content.\n\n</div>\n</div>\n')}>
            <i className="ti ti-square" /><span>Card (Small)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-card-row">\n<div class="sc-card">\n<div class="sc-card-header">\n<div class="sc-card-title">Card 1</div>\n<div class="sc-card-desc">Description</div>\n</div>\n<div class="sc-card-content">\n\nContent here.\n\n</div>\n</div>\n<div class="sc-card">\n<div class="sc-card-header">\n<div class="sc-card-title">Card 2</div>\n<div class="sc-card-desc">Description</div>\n</div>\n<div class="sc-card-content">\n\nContent here.\n\n</div>\n</div>\n<div class="sc-card">\n<div class="sc-card-header">\n<div class="sc-card-title">Card 3</div>\n<div class="sc-card-desc">Description</div>\n</div>\n<div class="sc-card-content">\n\nContent here.\n\n</div>\n</div>\n</div>\n')}>
            <i className="ti ti-columns-3" /><span>Card Row (3)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-card sc-card-accent">\n<div class="sc-card-header">\n<div class="sc-card-action"><span class="sc-badge sc-badge-blue">Important</span></div>\n<div class="sc-card-title">Highlighted Card</div>\n<div class="sc-card-desc">This card stands out with an accent border</div>\n</div>\n<div class="sc-card-content">\n\nKey information or summary goes here.\n\n</div>\n<div class="sc-card-footer">\n\nFooter content or actions.\n\n</div>\n</div>\n')}>
            <i className="ti ti-star" /><span>Card (Accent)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-tabs">\n<div class="sc-tab-list">\n<span class="sc-tab active">Tab 1</span>\n<span class="sc-tab">Tab 2</span>\n<span class="sc-tab">Tab 3</span>\n</div>\n<div class="sc-tab-content">\n\nTab 1 content here.\n\n</div>\n</div>\n')}>
            <i className="ti ti-layout-navbar" /><span>Tabs</span>
          </button>

          <div className="typo-dropdown-label">Feedback</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-alert sc-alert-info">\n<i class="ti ti-info-circle"></i>\n<div><strong>Note</strong><br>This is an informational alert.</div>\n</div>\n')}>
            <i className="ti ti-info-circle" /><span>Alert (Info)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-alert sc-alert-warning">\n<i class="ti ti-alert-triangle"></i>\n<div><strong>Warning</strong><br>Pay attention to this.</div>\n</div>\n')}>
            <i className="ti ti-alert-triangle" /><span>Alert (Warning)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-alert sc-alert-error">\n<i class="ti ti-alert-octagon"></i>\n<div><strong>Critical</strong><br>This is a critical alert.</div>\n</div>\n')}>
            <i className="ti ti-alert-octagon" /><span>Alert (Error)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-alert sc-alert-success">\n<i class="ti ti-circle-check"></i>\n<div><strong>Success</strong><br>Everything looks good.</div>\n</div>\n')}>
            <i className="ti ti-circle-check" /><span>Alert (Success)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-progress-wrap">\n<div class="sc-progress-label">Progress</div>\n<div class="sc-progress"><div class="sc-progress-bar" style="width:60%"></div></div>\n<div class="sc-progress-value">60%</div>\n</div>\n')}>
            <i className="ti ti-chart-bar" /><span>Progress Bar</span>
          </button>

          <div className="typo-dropdown-label">Interactive</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<details class="sc-accordion">\n<summary>Click to expand</summary>\n<div class="sc-accordion-content">\n\nHidden content goes here.\n\n</div>\n</details>\n')}>
            <i className="ti ti-layout-bottombar-collapse" /><span>Accordion</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<details class="sc-accordion">\n<summary>Section 1</summary>\n<div class="sc-accordion-content">Content 1</div>\n</details>\n<details class="sc-accordion">\n<summary>Section 2</summary>\n<div class="sc-accordion-content">Content 2</div>\n</details>\n<details class="sc-accordion">\n<summary>Section 3</summary>\n<div class="sc-accordion-content">Content 3</div>\n</details>\n')}>
            <i className="ti ti-layout-list" /><span>Accordion Group</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n> [!toggle] Click to expand\n> Hidden content here\n')}>
            <i className="ti ti-caret-right" /><span>Toggle / Collapsible</span>
          </button>

          <div className="typo-dropdown-label">Inline</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { doWrap('<span class="sc-badge">', '</span>') }}>
            <i className="ti ti-tag" /><span>Badge</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { doWrap('<span class="sc-badge sc-badge-green">', '</span>') }}>
            <i className="ti ti-tag" style={{ color: '#166534' }} /><span>Badge (Green)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { doWrap('<span class="sc-badge sc-badge-red">', '</span>') }}>
            <i className="ti ti-tag" style={{ color: '#991b1b' }} /><span>Badge (Red)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { doWrap('<span class="sc-badge sc-badge-blue">', '</span>') }}>
            <i className="ti ti-tag" style={{ color: '#1e40af' }} /><span>Badge (Blue)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { doWrap('<span class="sc-badge sc-badge-outline">', '</span>') }}>
            <i className="ti ti-tag" /><span>Badge (Outline)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { doWrap('<kbd>', '</kbd>') }}>
            <i className="ti ti-keyboard" /><span>Keyboard Key</span>
          </button>

          <div className="typo-dropdown-label">Layout</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-separator"></div>\n')}>
            <i className="ti ti-minus" /><span>Separator</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-columns">\n<div class="sc-col">\n\nLeft column content.\n\n</div>\n<div class="sc-col">\n\nRight column content.\n\n</div>\n</div>\n')}>
            <i className="ti ti-columns-2" /><span>Two Columns</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-columns sc-columns-3">\n<div class="sc-col">\n\nCol 1\n\n</div>\n<div class="sc-col">\n\nCol 2\n\n</div>\n<div class="sc-col">\n\nCol 3\n\n</div>\n</div>\n')}>
            <i className="ti ti-columns-3" /><span>Three Columns</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<figure class="sc-figure">\n<img src="url" alt="description" />\n<figcaption>Image caption here</figcaption>\n</figure>\n')}>
            <i className="ti ti-photo" /><span>Figure + Caption</span>
          </button>

          <div className="typo-dropdown-label">Steps & Lists</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<div class="sc-steps">\n<div class="sc-step">\n<div class="sc-step-num">1</div>\n<div class="sc-step-body">\n<div class="sc-step-title">First step</div>\n<div class="sc-step-desc">Description of what to do</div>\n</div>\n</div>\n<div class="sc-step">\n<div class="sc-step-num">2</div>\n<div class="sc-step-body">\n<div class="sc-step-title">Second step</div>\n<div class="sc-step-desc">Description of what to do</div>\n</div>\n</div>\n<div class="sc-step">\n<div class="sc-step-num">3</div>\n<div class="sc-step-body">\n<div class="sc-step-title">Third step</div>\n<div class="sc-step-desc">Description of what to do</div>\n</div>\n</div>\n</div>\n')}>
            <i className="ti ti-list-numbers" /><span>Steps</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n<dl class="sc-dl">\n<dt>Term 1</dt>\n<dd>Definition of term 1</dd>\n<dt>Term 2</dt>\n<dd>Definition of term 2</dd>\n<dt>Term 3</dt>\n<dd>Definition of term 3</dd>\n</dl>\n')}>
            <i className="ti ti-vocabulary" /><span>Definition List</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n??Hidden answer here??\n')}>
            <i className="ti ti-brain" /><span>Active Recall Block</span>
          </button>

          <div className="typo-dropdown-label">Typography</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => { const s = c.slice(ta.selectionStart, ta.selectionEnd) || 'Lead paragraph text'; return insertText(ta, c, `\n<p class="lead">${s}</p>\n`) }); setInsertOpen(false) }}>
            <i className="ti ti-letter-case" /><span>Lead Text</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => { const s = c.slice(ta.selectionStart, ta.selectionEnd) || 'Large text'; return insertText(ta, c, `\n<div class="text-large">${s}</div>\n`) }); setInsertOpen(false) }}>
            <i className="ti ti-letter-case-upper" /><span>Large Text</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => { const s = c.slice(ta.selectionStart, ta.selectionEnd) || 'Small text'; return insertText(ta, c, `\n<small>${s}</small>\n`) }); setInsertOpen(false) }}>
            <i className="ti ti-letter-case-lower" /><span>Small Text</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => { const s = c.slice(ta.selectionStart, ta.selectionEnd) || 'Muted text'; return insertText(ta, c, `\n<p class="text-muted">${s}</p>\n`) }); setInsertOpen(false) }}>
            <i className="ti ti-eye-off" /><span>Muted Text</span>
          </button>

          <div className="typo-dropdown-label">Embeds</div>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n> [!tip] Tip\n> Your content here\n')}>
            <i className="ti ti-bulb" /><span>Callout (Tip)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n> [!warning] Warning\n> Your content here\n')}>
            <i className="ti ti-alert-triangle" /><span>Callout (Warning)</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n```mermaid\nflowchart LR\n  A --> B --> C\n```\n')}>
            <i className="ti ti-chart-dots-3" /><span>Mermaid Diagram</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n$$\n\\int_0^1 f(x)\\,dx\n$$\n')}>
            <i className="ti ti-math" /><span>Math Block</span>
          </button>
          <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => doInsert('\n![image](url)\n')}>
            <i className="ti ti-photo" /><span>Image</span>
          </button>
        </div>
      )}
    </>
  )
}
