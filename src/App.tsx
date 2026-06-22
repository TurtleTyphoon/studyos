import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './components/AuthPage'
import Workspace from './components/Workspace'

function Inner() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <AuthPage />
  return <Workspace />
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
