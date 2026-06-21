import { useState, useRef, useEffect } from 'react'

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  content: string
  onContentChange: (content: string) => void
}

interface ToolbarItem {
  id: string
  label: string
  icon: string
  shortLabel: string
  action: (textarea: HTMLTextAreaElement, content: string) => { newContent: string; cursorPos: number }
  group: string
}

function wrapSelection(textarea: HTMLTextAreaElement, content: string, before: string, after: string): { newContent: string; cursorPos: number } {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.slice(start, end)
  const newContent = content.slice(0, start) + before + selected + after + content.slice(end)
  return { newContent, cursorPos: selected ? start + before.length + selected.length + after.length : start + before.length }
}

function wrapLine(textarea: HTMLTextAreaElement, content: string, prefix: string): { newContent: string; cursorPos: number } {
  const start = textarea.selectionStart
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  const lineEnd = content.indexOf('\n', start)
  const end = lineEnd === -1 ? content.length : lineEnd
  const line = content.slice(lineStart, end)
  const newContent = content.slice(0, lineStart) + prefix + line + content.slice(end)
  return { newContent, cursorPos: lineStart + prefix.length + line.length }
}

function insertBlock(textarea: HTMLTextAreaElement, content: string, block: string): { newContent: string; cursorPos: number } {
  const pos = textarea.selectionStart
  const before = content.slice(0, pos)
  const after = content.slice(pos)
  const needsNewline = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
  const newContent = before + needsNewline + block + after
  return { newContent, cursorPos: pos + needsNewline.length + block.length }
}

const ITEMS: ToolbarItem[] = [
  {
    id: 'h1', label: 'Heading 1', icon: 'ti-h-1', shortLabel: 'H1', group: 'heading',
    action: (ta, c) => wrapLine(ta, c, '# '),
  },
  {
    id: 'h2', label: 'Heading 2', icon: 'ti-h-2', shortLabel: 'H2', group: 'heading',
    action: (ta, c) => wrapLine(ta, c, '## '),
  },
  {
    id: 'h3', label: 'Heading 3', icon: 'ti-h-3', shortLabel: 'H3', group: 'heading',
    action: (ta, c) => wrapLine(ta, c, '### '),
  },
  {
    id: 'h4', label: 'Heading 4', icon: 'ti-h-4', shortLabel: 'H4', group: 'heading',
    action: (ta, c) => wrapLine(ta, c, '#### '),
  },
  {
    id: 'bold', label: 'Bold', icon: 'ti-bold', shortLabel: 'B', group: 'inline',
    action: (ta, c) => wrapSelection(ta, c, '**', '**'),
  },
  {
    id: 'italic', label: 'Italic', icon: 'ti-italic', shortLabel: 'I', group: 'inline',
    action: (ta, c) => wrapSelection(ta, c, '*', '*'),
  },
  {
    id: 'strikethrough', label: 'Strikethrough', icon: 'ti-strikethrough', shortLabel: 'S', group: 'inline',
    action: (ta, c) => wrapSelection(ta, c, '~~', '~~'),
  },
  {
    id: 'code', label: 'Inline Code', icon: 'ti-code', shortLabel: '<>', group: 'inline',
    action: (ta, c) => wrapSelection(ta, c, '`', '`'),
  },
  {
    id: 'highlight', label: 'Highlight', icon: 'ti-highlight', shortLabel: 'HL', group: 'inline',
    action: (ta, c) => wrapSelection(ta, c, '==', '=='),
  },
  {
    id: 'link', label: 'Link', icon: 'ti-link', shortLabel: 'Lnk', group: 'inline',
    action: (ta, c) => wrapSelection(ta, c, '[', '](url)'),
  },
  {
    id: 'blockquote', label: 'Blockquote', icon: 'ti-blockquote', shortLabel: '"', group: 'block',
    action: (ta, c) => wrapLine(ta, c, '> '),
  },
  {
    id: 'lead', label: 'Lead Text', icon: 'ti-letter-case', shortLabel: 'Lead', group: 'block',
    action: (ta, c) => {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = c.slice(start, end) || 'Lead paragraph text here'
      const block = `<p class="lead">${selected}</p>\n`
      return { newContent: c.slice(0, start) + block + c.slice(end), cursorPos: start + block.length }
    },
  },
  {
    id: 'large', label: 'Large Text', icon: 'ti-letter-case-upper', shortLabel: 'Lg', group: 'block',
    action: (ta, c) => {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = c.slice(start, end) || 'Large text here'
      const block = `<div class="text-large">${selected}</div>\n`
      return { newContent: c.slice(0, start) + block + c.slice(end), cursorPos: start + block.length }
    },
  },
  {
    id: 'small', label: 'Small Text', icon: 'ti-letter-case-lower', shortLabel: 'Sm', group: 'block',
    action: (ta, c) => {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = c.slice(start, end) || 'Small text here'
      const block = `<small>${selected}</small>\n`
      return { newContent: c.slice(0, start) + block + c.slice(end), cursorPos: start + block.length }
    },
  },
  {
    id: 'muted', label: 'Muted Text', icon: 'ti-eye-off', shortLabel: 'Mut', group: 'block',
    action: (ta, c) => {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = c.slice(start, end) || 'Muted text here'
      const block = `<p class="text-muted">${selected}</p>\n`
      return { newContent: c.slice(0, start) + block + c.slice(end), cursorPos: start + block.length }
    },
  },
  {
    id: 'ul', label: 'Bullet List', icon: 'ti-list', shortLabel: 'UL', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n- Item 1\n- Item 2\n- Item 3\n'),
  },
  {
    id: 'ol', label: 'Numbered List', icon: 'ti-list-numbers', shortLabel: 'OL', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n1. First item\n2. Second item\n3. Third item\n'),
  },
  {
    id: 'checklist', label: 'Checklist', icon: 'ti-checkbox', shortLabel: 'CL', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n'),
  },
  {
    id: 'table', label: 'Table', icon: 'ti-table', shortLabel: 'Tbl', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n| Header | Header | Header |\n|--------|--------|--------|\n| Cell   | Cell   | Cell   |\n| Cell   | Cell   | Cell   |\n'),
  },
  {
    id: 'codeblock', label: 'Code Block', icon: 'ti-source-code', shortLabel: '{;}', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n```\ncode here\n```\n'),
  },
  {
    id: 'hr', label: 'Divider', icon: 'ti-minus', shortLabel: '---', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n---\n'),
  },
  {
    id: 'callout', label: 'Callout', icon: 'ti-info-circle', shortLabel: '!', group: 'block',
    action: (ta, c) => insertBlock(ta, c, '\n> [!tip] Tip\n> Your tip text here\n'),
  },
]

export default function TypographyToolbar({ textareaRef, content, onContentChange }: Props) {
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMore) return
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMore])

  function handleAction(item: ToolbarItem) {
    const textarea = textareaRef.current
    if (!textarea) return
    const { newContent, cursorPos } = item.action(textarea, content)
    onContentChange(newContent)
    setShowMore(false)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  const primary = ITEMS.filter(i => ['h1', 'h2', 'h3', 'h4', 'bold', 'italic', 'code', 'highlight', 'link', 'blockquote', 'ul', 'table'].includes(i.id))
  const secondary = ITEMS.filter(i => !primary.includes(i))

  return (
    <div className="typo-toolbar">
      <div className="typo-toolbar-primary">
        {primary.map(item => (
          <button
            key={item.id}
            className="typo-btn"
            onClick={() => handleAction(item)}
            title={item.label}
            onMouseDown={e => e.preventDefault()}
          >
            <i className={`ti ${item.icon}`} />
          </button>
        ))}
        <div style={{ position: 'relative' }} ref={moreRef}>
          <button
            className={`typo-btn ${showMore ? 'active' : ''}`}
            onClick={() => setShowMore(v => !v)}
            title="More formatting"
            onMouseDown={e => e.preventDefault()}
          >
            <i className="ti ti-dots" />
          </button>
          {showMore && (
            <div className="typo-dropdown">
              {secondary.map(item => (
                <button
                  key={item.id}
                  className="typo-dropdown-item"
                  onClick={() => handleAction(item)}
                  onMouseDown={e => e.preventDefault()}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 13, width: 18, textAlign: 'center' }} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
