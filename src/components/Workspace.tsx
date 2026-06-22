import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import NoteView from './NoteView'
import ChatBar from './ChatBar'
import type { Block } from './blocks'

interface Note {
  id: string
  title: string
  content: string | null
  created_at: string
}

export default function Workspace() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])

  const activeNote = notes.find(n => n.id === activeId) ?? null

  useEffect(() => {
    if (!user) return
    supabase
      .from('notes')
      .select('id, title, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotes(data)
      })
  }, [user])

  useEffect(() => {
    if (!activeNote) { setBlocks([]); return }
    try {
      const parsed = JSON.parse(activeNote.content || '[]')
      const arr = Array.isArray(parsed) ? parsed : parsed.blocks || []
      setBlocks(arr.map((b: Block) => ({ ...b, id: b.id || crypto.randomUUID().slice(0, 8) })))
    } catch {
      setBlocks([])
    }
  }, [activeNote])

  const saveBlocks = useCallback(async (newBlocks: Block[]) => {
    setBlocks(newBlocks)
    if (!activeId || !user) return
    const content = JSON.stringify(newBlocks)
    const title = deriveTitle(newBlocks)
    await supabase.from('notes').update({ content, title }).eq('id', activeId)
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, content, title } : n))
  }, [activeId, user])

  async function createNote() {
    if (!user) return
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: 'New note', content: '[]', file_type: 'text' })
      .select('id, title, content, created_at')
      .single()
    if (data && !error) {
      setNotes(prev => [data, ...prev])
      setActiveId(data.id)
    }
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function addBlocks(newBlocks: Block[]) {
    const updated = [...blocks, ...newBlocks]
    saveBlocks(updated)
  }

  function updateBlock(id: string, data: Partial<Block>) {
    const updated = blocks.map(b => b.id === id ? { ...b, ...data } as Block : b)
    saveBlocks(updated)
  }

  function deleteBlock(id: string) {
    const updated = blocks.filter(b => b.id !== id)
    saveBlocks(updated)
  }

  return (
    <div className="app">
      <Sidebar
        notes={notes}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createNote}
        onDelete={deleteNote}
      />
      <div className="main">
        {activeNote ? (
          <>
            <NoteView blocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} />
            <ChatBar onSubmit={addBlocks} />
          </>
        ) : (
          <div className="note-empty">
            <i className="ti ti-notebook note-empty-icon" />
            <div className="note-empty-title">StudyOS</div>
            <div className="note-empty-hint">
              Select a note from the sidebar or create a new one to get started.
              Use the chat bar to add content with natural commands.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function deriveTitle(blocks: Block[]): string {
  for (const b of blocks) {
    if (b.type === 'heading' && b.content?.trim()) return b.content.trim().slice(0, 60)
    if (b.type === 'text' && b.content?.trim()) return b.content.trim().slice(0, 60)
  }
  return 'New note'
}
