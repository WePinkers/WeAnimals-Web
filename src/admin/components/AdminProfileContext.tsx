
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

export type Disponibilidade =
  | 'Online'
  | 'Ausente'
  | 'Indisponível'

type AdminProfileContextType = {
  nome: string
  setNome: (nome: string) => void
  foto: string | null
  setFoto: (foto: string | null) => void
  disponibilidade: Disponibilidade
  setDisponibilidade: (status: Disponibilidade) => void
}

const AdminProfileContext =
  createContext<AdminProfileContextType | null>(null)

export function AdminProfileProvider({
  children,
}: {
  children: ReactNode
}) {
  const [nome, setNome] = useState('Administrador')
  const [foto, setFoto] = useState<string | null>(null)

  const [disponibilidade, setDisponibilidade] =
    useState<Disponibilidade>('Indisponível')

  return (
    <AdminProfileContext.Provider
      value={{
        nome,
        setNome,
        foto,
        setFoto,
        disponibilidade,
        setDisponibilidade,
      }}
    >
      {children}
    </AdminProfileContext.Provider>
  )
}

export function useAdminProfile() {
  const context = useContext(AdminProfileContext)

  if (!context) {
    throw new Error(
      'useAdminProfile deve ser usado dentro de AdminProfileProvider.',
    )
  }

  return context
}
