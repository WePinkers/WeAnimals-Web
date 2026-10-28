
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

type ToastMessage = {
  id: number
  message: string
  kind: ToastKind
}

type ToastContextValue = {
  notify: (message: string, kind?: ToastKind) => void
  dismiss: () => void
}

const ToastContext = createContext<
  ToastContextValue | undefined
>(undefined)

type ToastProviderProps = {
  children: ReactNode
  duration?: number
}

const kindLabels: Record<ToastKind, string> = {
  success: 'Sucesso',
  error: 'Erro',
  info: 'Informação',
  warning: 'Atenção',
}

export function ToastProvider({
  children,
  duration = 3500,
}: ToastProviderProps) {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }

    setToast(null)
  }, [])

  const notify = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const trimmedMessage = message.trim()

      if (!trimmedMessage) return

      if (timer.current) {
        clearTimeout(timer.current)
      }

      const id = ++nextId.current

      setToast({
        id,
        message: trimmedMessage,
        kind,
      })

      timer.current = setTimeout(() => {
        setToast((current) =>
          current?.id === id ? null : current
        )

        timer.current = null
      }, duration)
    },
    [duration],
  )

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [])

  const value = useMemo(
    () => ({ notify, dismiss }),
    [notify, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast && (
        <div
          key={toast.id}
          className={`wa-toast wa-toast--${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live={
            toast.kind === 'error' ? 'assertive' : 'polite'
          }
        >
          <span className="wa-toast-message">
            {toast.message}
          </span>

          <button
            type="button"
            className="wa-toast-dismiss"
            onClick={dismiss}
            aria-label={`Fechar notificação: ${kindLabels[toast.kind]}`}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error(
      'useToast deve ser usado dentro de <ToastProvider>.',
    )
  }

  return context
}

export type { ToastKind }
