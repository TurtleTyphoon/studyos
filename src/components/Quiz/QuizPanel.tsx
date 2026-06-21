import { useState } from 'react'

export default function QuizPanel() {
  return (
    <div>
      <div className="empty-state" style={{ padding: '60px 16px' }}>
        <i className="ti ti-brain" style={{ fontSize: 36 }} />
        <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Quiz Engine</p>
        <p style={{ marginTop: 4 }}>Coming soon. The quiz bank will be wired up in the next phase.</p>
      </div>
    </div>
  )
}
