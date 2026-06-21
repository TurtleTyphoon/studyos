import { useState, useEffect, useRef } from 'react'
import type { Note } from '../../types/database'

interface Command {
  id: string
  label: string
  icon: string
  category: string
  action: () => void
}

interface Props {
  visible: boolean
  onClose: () => void
  allNotes: Note[]
  onOpenNote: (note: Note) => void
  onNewNote: () => void
  onToggleMode: (mode: 'edit' | 'preview' | 'study') => void
  onToggleFocus: () => void
  onInsertTemplate: (template: string) => void
}

const TEMPLATES: { id: string; label: string; content: string }[] = [
  {
    id: 'cornell',
    label: 'Cornell Notes',
    content: `## Topic\n\n| Questions | Notes |\n|-----------|-------|\n| What is...? | |\n| Why does...? | |\n| How does...? | |\n\n---\n\n## Summary\n\n`,
  },
  {
    id: 'lecture',
    label: 'Lecture Notes',
    content: `## Lecture: \n**Date:** ${new Date().toLocaleDateString()}\n**Professor:** \n\n---\n\n### Key Points\n\n- \n- \n- \n\n### Details\n\n\n\n### Questions\n\n- \n\n### Summary\n\n`,
  },
  {
    id: 'drug-card',
    label: 'Drug Card',
    content: `## Drug Name\n\n| Property | Detail |\n|----------|--------|\n| **Class** | |\n| **Mechanism** | |\n| **Indications** | |\n| **Dosage** | |\n| **Side Effects** | |\n| **Nursing Considerations** | |\n| **Contraindications** | |\n| **Interactions** | |\n\n### Patient Teaching\n\n- \n`,
  },
  {
    id: 'case-study',
    label: 'Case Study',
    content: `## Case Study\n\n### Patient Information\n- **Age/Sex:** \n- **Chief Complaint:** \n- **History:** \n\n### Assessment\n\n| System | Findings |\n|--------|----------|\n| Cardiovascular | |\n| Respiratory | |\n| Neurological | |\n| GI | |\n\n### Diagnosis\n\n\n### Nursing Interventions\n\n1. \n2. \n3. \n\n### Expected Outcomes\n\n- \n`,
  },
  {
    id: 'lab-report',
    label: 'Lab Report',
    content: `## Lab Report\n**Date:** ${new Date().toLocaleDateString()}\n\n### Objective\n\n\n### Materials\n\n- \n\n### Procedure\n\n1. \n2. \n3. \n\n### Results\n\n| Parameter | Value | Normal Range |\n|-----------|-------|--------------|\n| | | |\n\n### Discussion\n\n\n### Conclusion\n\n`,
  },
  {
    id: 'weekly-summary',
    label: 'Weekly Summary',
    content: `## Week Summary\n**Week:** \n**Date:** ${new Date().toLocaleDateString()}\n\n### Topics Covered\n\n- \n\n### Key Takeaways\n\n1. \n2. \n3. \n\n### Still Confused About\n\n- \n\n### Action Items\n\n- [ ] \n- [ ] \n`,
  },
  {
    id: 'flashcard-set',
    label: 'Flashcard Set',
    content: `## Flashcard Set: \n\n??Term 1 definition??\n\n??Term 2 definition??\n\n??Term 3 definition??\n\n??Term 4 definition??\n\n??Term 5 definition??\n`,
  },
]

export default function CommandPalette({ visible, onClose, allNotes, onOpenNote, onNewNote, onToggleMode, onToggleFocus, onInsertTemplate }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  const commands: Command[] = [
    { id: 'new-note', label: 'New Note', icon: 'ti-plus', category: 'Notes', action: () => { onNewNote(); onClose() } },
    ...allNotes.slice(0, 20).map(n => ({
      id: `open-${n.id}`,
      label: n.title,
      icon: 'ti-file-text',
      category: 'Open Note',
      action: () => { onOpenNote(n); onClose() },
    })),
    { id: 'mode-edit', label: 'Switch to Edit Mode', icon: 'ti-pencil', category: 'Mode', action: () => { onToggleMode('edit'); onClose() } },
    { id: 'mode-preview', label: 'Switch to Preview Mode', icon: 'ti-eye', category: 'Mode', action: () => { onToggleMode('preview'); onClose() } },
    { id: 'mode-study', label: 'Switch to Study Mode', icon: 'ti-brain', category: 'Mode', action: () => { onToggleMode('study'); onClose() } },
    { id: 'focus', label: 'Toggle Focus Mode', icon: 'ti-focus-2', category: 'View', action: () => { onToggleFocus(); onClose() } },
    ...TEMPLATES.map(t => ({
      id: `template-${t.id}`,
      label: `Template: ${t.label}`,
      icon: 'ti-template',
      category: 'Templates',
      action: () => { onInsertTemplate(t.content); onClose() },
    })),
  ]

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
    : commands

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!visible) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); filtered[selectedIndex].action() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, filtered, selectedIndex, onClose])

  if (!visible) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-wrap">
          <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--subtle)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search notes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="command-palette-input"
          />
          <kbd className="command-palette-kbd">esc</kbd>
        </div>
        <div className="command-palette-list">
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--subtle)' }}>No results</div>
          )}
          {filtered.slice(0, 15).map((cmd, i) => (
            <div
              key={cmd.id}
              className={`command-palette-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={cmd.action}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <i className={`ti ${cmd.icon}`} style={{ fontSize: 13, color: 'var(--muted)', width: 18, textAlign: 'center' }} />
              <span style={{ flex: 1 }}>{cmd.label}</span>
              <span className="command-palette-category">{cmd.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
