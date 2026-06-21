import { useState, useRef, useEffect } from 'react'

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

  let lineStart = content.lastIndexOf('\n', start - 1) + 1
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

export default function TypographyToolbar({ textareaRef, content, onContentChange }: Props) {
  const [headingOpen, setHeadingOpen] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const headingRef = useRef<HTMLDivElement>(null)
  const insertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) setHeadingOpen(false)
      if (insertRef.current && !insertRef.current.contains(e.target as Node)) setInsertOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

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

  return (
    <div className="typo-toolbar">
      {/* Heading dropdown */}
      <div className="typo-group" ref={headingRef}>
        <button className="typo-btn typo-btn-wide" onClick={() => setHeadingOpen(v => !v)} onMouseDown={e => e.preventDefault()} title="Heading">
          <i className="ti ti-heading" />
          <i className="ti ti-chevron-down" style={{ fontSize: 9, marginLeft: 2 }} />
        </button>
        {headingOpen && (
          <div className="typo-dropdown">
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
      </div>

      <div className="typo-sep" />

      {/* Inline formatting */}
      <div className="typo-group">
        <button className="typo-btn" title="Bold (Cmd+B)" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '**', '**'))}>
          <i className="ti ti-bold" />
        </button>
        <button className="typo-btn" title="Italic (Cmd+I)" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '*', '*'))}>
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
      </div>

      <div className="typo-sep" />

      {/* Code */}
      <div className="typo-group">
        <button className="typo-btn" title="Inline Code" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '`', '`'))}>
          <i className="ti ti-code" />
        </button>
        <button className="typo-btn" title="Code Block" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => insertText(ta, c, '\n```\n\n```\n'))}>
          <i className="ti ti-source-code" />
        </button>
      </div>

      <div className="typo-sep" />

      {/* Lists */}
      <div className="typo-group">
        <button className="typo-btn" title="Bullet List" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '- '))}>
          <i className="ti ti-list" />
        </button>
        <button className="typo-btn" title="Numbered List" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '1. '))}>
          <i className="ti ti-list-numbers" />
        </button>
        <button className="typo-btn" title="Checklist" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '- [ ] '))}>
          <i className="ti ti-checkbox" />
        </button>
      </div>

      <div className="typo-sep" />

      {/* Block elements */}
      <div className="typo-group">
        <button className="typo-btn" title="Blockquote" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => prefixLine(ta, c, '> '))}>
          <i className="ti ti-blockquote" />
        </button>
        <button className="typo-btn" title="Link" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '[', '](url)'))}>
          <i className="ti ti-link" />
        </button>
        <button className="typo-btn" title="Divider" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => insertText(ta, c, '\n---\n'))}>
          <i className="ti ti-minus" />
        </button>
      </div>

      <div className="typo-sep" />

      {/* Insert dropdown */}
      <div className="typo-group" ref={insertRef}>
        <button className="typo-btn typo-btn-wide" onClick={() => setInsertOpen(v => !v)} onMouseDown={e => e.preventDefault()} title="Insert block">
          <i className="ti ti-plus" />
          <i className="ti ti-chevron-down" style={{ fontSize: 9, marginLeft: 2 }} />
        </button>
        {insertOpen && (
          <div className="typo-dropdown">
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n| Header | Header | Header |\n|--------|--------|--------|\n| Cell   | Cell   | Cell   |\n| Cell   | Cell   | Cell   |\n')); setInsertOpen(false) }}>
              <i className="ti ti-table" style={{ fontSize: 14 }} />
              <span>Table</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n> [!tip] Tip\n> Your content here\n')); setInsertOpen(false) }}>
              <i className="ti ti-bulb" style={{ fontSize: 14 }} />
              <span>Callout (Tip)</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n> [!warning] Warning\n> Your content here\n')); setInsertOpen(false) }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
              <span>Callout (Warning)</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n> [!toggle] Click to expand\n> Hidden content here\n')); setInsertOpen(false) }}>
              <i className="ti ti-caret-right" style={{ fontSize: 14 }} />
              <span>Toggle / Collapsible</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n??Hidden answer here??\n')); setInsertOpen(false) }}>
              <i className="ti ti-brain" style={{ fontSize: 14 }} />
              <span>Active Recall Block</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n```mermaid\nflowchart LR\n  A --> B --> C\n```\n')); setInsertOpen(false) }}>
              <i className="ti ti-chart-dots-3" style={{ fontSize: 14 }} />
              <span>Mermaid Diagram</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n$$\n\\int_0^1 f(x)\\,dx\n$$\n')); setInsertOpen(false) }}>
              <i className="ti ti-math" style={{ fontSize: 14 }} />
              <span>Math Block</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => insertText(ta, c, '\n![image](url)\n')); setInsertOpen(false) }}>
              <i className="ti ti-photo" style={{ fontSize: 14 }} />
              <span>Image</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => {
              const selected = c.slice(ta.selectionStart, ta.selectionEnd) || 'Lead paragraph text'
              return insertText(ta, c, `\n<p class="lead">${selected}</p>\n`)
            }); setInsertOpen(false) }}>
              <i className="ti ti-letter-case" style={{ fontSize: 14 }} />
              <span>Lead Text</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => {
              const selected = c.slice(ta.selectionStart, ta.selectionEnd) || 'Large text'
              return insertText(ta, c, `\n<div class="text-large">${selected}</div>\n`)
            }); setInsertOpen(false) }}>
              <i className="ti ti-letter-case-upper" style={{ fontSize: 14 }} />
              <span>Large Text</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => {
              const selected = c.slice(ta.selectionStart, ta.selectionEnd) || 'Small text'
              return insertText(ta, c, `\n<small>${selected}</small>\n`)
            }); setInsertOpen(false) }}>
              <i className="ti ti-letter-case-lower" style={{ fontSize: 14 }} />
              <span>Small Text</span>
            </button>
            <button className="typo-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { exec((ta, c) => {
              const selected = c.slice(ta.selectionStart, ta.selectionEnd) || 'Muted helper text'
              return insertText(ta, c, `\n<p class="text-muted">${selected}</p>\n`)
            }); setInsertOpen(false) }}>
              <i className="ti ti-eye-off" style={{ fontSize: 14 }} />
              <span>Muted Text</span>
            </button>
          </div>
        )}
      </div>

      <div className="typo-sep" />

      {/* Math inline */}
      <button className="typo-btn" title="Inline Math" onMouseDown={e => e.preventDefault()} onClick={() => exec((ta, c) => wrapSelection(ta, c, '$', '$'))}>
        <i className="ti ti-math" />
      </button>
    </div>
  )
}
