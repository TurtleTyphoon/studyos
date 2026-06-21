import { useEffect } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  return <div className="toast" style={{ display: 'block' }}>{message}</div>
}
