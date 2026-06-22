import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = isSignUp
      ? await signUp(email, password, name)
      : await signIn(email, password)
    if (result.error) setError(result.error.message)
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">StudyOS</div>
        <div className="auth-sub">Your study workspace</div>
        {error && <div className="auth-error">{error}</div>}
        {isSignUp && (
          <input className="auth-input" placeholder="Display name" value={name} onChange={e => setName(e.target.value)} required />
        )}
        <input className="auth-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
        <div className="auth-toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </form>
    </div>
  )
}
