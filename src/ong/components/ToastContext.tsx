import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastMessage = {
  id: number
  message: string
  icon: string
}

interface ToastContextData {
  showToast: (message: string, icon?: string) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, icon = '✓') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, icon }])

    // Remove o toast depois de 3 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Container onde os Toasts aparecem na tela */}
      <div className="toast-container" id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span>{toast.icon}</span> <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}