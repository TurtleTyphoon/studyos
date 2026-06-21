import { useState, useEffect, useRef } from 'react'

interface SlashMenuItem {
  id: string
  label: string
  icon: string
  description: string
  template: string
}

const MENU_ITEMS: SlashMenuItem[] = [
  {
    id: 'heading',
    label: 'Heading',
    icon: 'ti-heading',
    description: 'Section heading',
    template: '## ',
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    icon: 'ti-list',
    description: 'Unordered list',
    template: '- Item 1\n- Item 2\n- Item 3\n',
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    icon: 'ti-list-numbers',
    description: 'Ordered list',
    template: '1. First\n2. Second\n3. Third\n',
  },
  {
    id: 'table',
    label: 'Table',
    icon: 'ti-table',
    description: 'Markdown table',
    template: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n',
  },
  {
    id: 'callout',
    label: 'Callout',
    icon: 'ti-alert-circle',
    description: 'Important note block',
    template: '> **Important:** \n> \n',
  },
  {
    id: 'drug-card',
    label: 'Drug Card',
    icon: 'ti-pill',
    description: 'Pharmacology reference card',
    template: '## Drug Name\n\n| Property | Detail |\n|----------|--------|\n| **Class** |  |\n| **Mechanism** |  |\n| **Indications** |  |\n| **Side Effects** |  |\n| **Nursing Considerations** |  |\n| **Contraindications** |  |\n',
  },
  {
    id: 'lab-values',
    label: 'Lab Values',
    icon: 'ti-test-pipe',
    description: 'Lab reference ranges',
    template: '## Lab Values\n\n| Lab Test | Normal Range | Critical Values |\n|----------|-------------|------------------|\n| WBC | 4.5-11.0 x10^3/uL |  |\n| RBC | 4.5-5.5 x10^6/uL |  |\n| Hgb | 12-16 g/dL |  |\n| Hct | 36-46% |  |\n| Platelets | 150-400 x10^3/uL |  |\n',
  },
  {
    id: 'recall',
    label: 'Recall Block',
    icon: 'ti-brain',
    description: 'Hidden answer for study mode',
    template: '??Your answer here??',
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: 'ti-code',
    description: 'Formatted code',
    template: '```\n\n```\n',
  },
  {
    id: 'divider',
    label: 'Divider',
    icon: 'ti-minus',
    description: 'Horizontal line',
    template: '\n---\n\n',
  },
]

interface SlashMenuProps {
  visible: boolean
  query: string
  position: { top: number; left: number }
  onSelect: (template: string) => void
  onClose: () => void
}

export default function SlashMenu({ visible, query, position, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = MENU_ITEMS.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!visible) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        onSelect(filtered[selectedIndex].template)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, filtered, selectedIndex, onSelect, onClose])

  if (!visible || filtered.length === 0) return null

  return (
    <div className="slash-menu" style={{ top: position.top, left: position.left }} ref={menuRef}>
      {filtered.map((item, i) => (
        <div
          key={item.id}
          className={`slash-menu-item ${i === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(item.template)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <i className={`ti ${item.icon}`} />
          <div>
            <div className="slash-menu-label">{item.label}</div>
            <div className="slash-menu-desc">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
