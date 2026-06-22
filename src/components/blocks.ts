export interface TextBlock { id: string; type: 'text'; content: string }
export interface HeadingBlock { id: string; type: 'heading'; content: string; level: 1 | 2 | 3 | 4 }
export interface QuoteBlock { id: string; type: 'quote'; content: string }
export interface CodeBlock { id: string; type: 'code'; content: string; language: string }
export interface DividerBlock { id: string; type: 'divider' }
export interface BulletListBlock { id: string; type: 'bullet-list'; items: string[] }
export interface NumberListBlock { id: string; type: 'number-list'; items: string[] }
export interface ChecklistBlock { id: string; type: 'checklist'; items: { text: string; done: boolean }[] }
export interface CalloutBlock { id: string; type: 'callout'; variant: string; title: string; content: string }
export interface CardBlock { id: string; type: 'card'; title: string; content: string }
export interface ImageBlock { id: string; type: 'image'; url: string; caption: string }

export type Block =
  | TextBlock | HeadingBlock | QuoteBlock | CodeBlock | DividerBlock
  | BulletListBlock | NumberListBlock | ChecklistBlock
  | CalloutBlock | CardBlock | ImageBlock

export function uid(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function parseCommand(input: string): Block[] | null {
  const trimmed = input.trim()

  const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/)
  if (headingMatch) {
    return [{ id: uid(), type: 'heading', content: headingMatch[2], level: headingMatch[1].length as 1|2|3|4 }]
  }

  if (trimmed.startsWith('> ')) {
    return [{ id: uid(), type: 'quote', content: trimmed.slice(2) }]
  }

  if (trimmed.startsWith('```')) {
    const lang = trimmed.slice(3).split('\n')[0].trim()
    const code = trimmed.split('\n').slice(1).join('\n').replace(/```$/, '').trim()
    return [{ id: uid(), type: 'code', content: code || '', language: lang || 'text' }]
  }

  if (trimmed === '---' || trimmed === '***') {
    return [{ id: uid(), type: 'divider' }]
  }

  const bulletLines = trimmed.split('\n').filter(l => l.match(/^[-*]\s/))
  if (bulletLines.length > 0 && bulletLines.length === trimmed.split('\n').length) {
    return [{ id: uid(), type: 'bullet-list', items: bulletLines.map(l => l.replace(/^[-*]\s/, '')) }]
  }

  const numLines = trimmed.split('\n').filter(l => l.match(/^\d+\.\s/))
  if (numLines.length > 0 && numLines.length === trimmed.split('\n').length) {
    return [{ id: uid(), type: 'number-list', items: numLines.map(l => l.replace(/^\d+\.\s/, '')) }]
  }

  const checkLines = trimmed.split('\n').filter(l => l.match(/^- \[[ x]\]\s/))
  if (checkLines.length > 0 && checkLines.length === trimmed.split('\n').length) {
    return [{ id: uid(), type: 'checklist', items: checkLines.map(l => ({
      text: l.replace(/^- \[[ x]\]\s/, ''),
      done: l.includes('[x]'),
    }))}]
  }

  const calloutMatch = trimmed.match(/^(?:callout|note|tip|warning|important):\s*(.+)/i)
  if (calloutMatch) {
    const variant = trimmed.split(':')[0].toLowerCase()
    return [{ id: uid(), type: 'callout', variant, title: variant.charAt(0).toUpperCase() + variant.slice(1), content: calloutMatch[1] }]
  }

  const cardMatch = trimmed.match(/^card:\s*(.+)/i)
  if (cardMatch) {
    const parts = cardMatch[1].split('|').map(s => s.trim())
    return [{ id: uid(), type: 'card', title: parts[0], content: parts[1] || '' }]
  }

  return null
}
