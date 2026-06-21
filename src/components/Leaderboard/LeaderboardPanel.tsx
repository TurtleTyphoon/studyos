import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { LeaderboardEntry } from '../../types/database'

export default function LeaderboardPanel() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    loadLeaderboard()
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadLeaderboard())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadLeaderboard() {
    const { data } = await supabase.from('leaderboard').select('*').limit(20)
    if (data) setEntries(data)
  }

  const renderList = (list: LeaderboardEntry[]) =>
    list.map((u, i) => (
      <div key={u.id} className="lb-row">
        <div className={`rank-num ${i === 0 ? 'rank-1' : ''}`}>{i + 1}</div>
        <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
          {u.display_name[0]?.toUpperCase()}
        </div>
        <div className="lb-name">{u.display_name}</div>
        <div className="lb-streak">
          <i className="ti ti-flame" style={{ fontSize: 11 }} />{u.streak}d
        </div>
        <div className="lb-xp">{u.xp.toLocaleString()} XP</div>
      </div>
    ))

  return (
    <div>
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label" style={{ marginBottom: 4 }}>All Time</div>
          {entries.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--subtle)', padding: 8 }}>No users yet</div>
          ) : renderList(entries)}
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ marginBottom: 4 }}>Top Streaks</div>
          {entries.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--subtle)', padding: 8 }}>No users yet</div>
          ) : renderList([...entries].sort((a, b) => b.streak - a.streak))}
        </div>
      </div>

      <div className="section-title">Study Duel</div>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, textAlign: 'center' }}>
        <i className="ti ti-sword" style={{ fontSize: 24, color: 'var(--text)', display: 'block', marginBottom: 7 }} />
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Challenge a classmate</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Pick a concept, race for XP</div>
        <button className="btn btn-accent">
          <i className="ti ti-bolt" />Coming in Phase 2
        </button>
      </div>
    </div>
  )
}
