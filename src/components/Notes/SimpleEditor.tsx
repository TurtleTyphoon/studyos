import { useRef, useEffect, useCallback } from 'react'

interface Props {
  content: string
  onContentChange: (markdown: string) => void
}

function markdownToHtml(md: string): string {
  let html = md
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/^---$/gm, '<hr>')
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/^- \[x\] (.+)$/gm, '<div class="se-check checked"><input type="checkbox" checked disabled> $1</div>')
  html = html.replace(/^- \[ \] (.+)$/gm, '<div class="se-check"><input type="checkbox" disabled> $1</div>')
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  const lines = html.split('\n')
  const result: string[] = []
  for (const line of lines) {
    if (line.startsWith('<h') || line.startsWith('<hr') || line.startsWith('<blockquote') || line.startsWith('<li') || line.startsWith('<div class="se-check')) {
      result.push(line)
    } else if (line.trim() === '') {
      result.push('<br>')
    } else {
      result.push(`<p>${line}</p>`)
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
    const inner = Array.from(el.childNodes).map(walk).join('')

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
      case 'div': {
        if (el.classList.contains('se-check')) {
          const checked = el.querySelector('input')?.checked
          const text = inner.replace(/^\s*/, '')
          return `- [${checked ? 'x' : ' '}] ${text}\n`
        }
        return `${inner}\n`
      }
      default: return inner
    }
  }

  const md = Array.from(tmp.childNodes).map(walk).join('')
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

export default function SimpleEditor({ content, onContentChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const html = markdownToHtml(content)
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html || '<p><br></p>'
      }
    }
    isInternalUpdate.current = false
  }, [content])

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

  function insertBlock(html: string) {
    document.execCommand('insertHTML', false, html)
    editorRef.current?.focus()
    handleInput()
  }

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

        <button className="se-btn" title="Bullet List" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertUnorderedList')}>
          <i className="ti ti-list" />
        </button>
        <button className="se-btn" title="Numbered List" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertOrderedList')}>
          <i className="ti ti-list-numbers" />
        </button>

        <div className="se-sep" />

        <button className="se-btn" title="Blockquote" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('formatBlock', 'blockquote')}>
          <i className="ti ti-blockquote" />
        </button>
        <button className="se-btn" title="Divider" onMouseDown={e => e.preventDefault()} onClick={() => insertBlock('<hr>')}>
          <i className="ti ti-minus" />
        </button>
        <button className="se-btn" title="Link" onMouseDown={e => e.preventDefault()} onClick={() => {
          const url = prompt('Enter URL:')
          if (url) execCmd('createLink', url)
        }}>
          <i className="ti ti-link" />
        </button>
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
    </div>
  )
}
