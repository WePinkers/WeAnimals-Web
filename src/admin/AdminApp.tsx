
import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'

import AdminLayout from './layouts/AdminLayout'
import { ToastProvider } from './components/ToastContext'
import { auth } from '../firebase'

import GeralPage from './pages/GeralPage'
import DenunciasPage from './pages/DenunciasPage'
import UsuariosPage from './pages/UsuariosPage'
import PerdidosPage from './pages/PerdidosPage'
import OngsPage from './pages/OngsPage'
import OuvidoriaPage from './pages/OuvidoriaPage'
import AuditoriaPage from './pages/AuditoriaPage'
import PerfilPage from './pages/PerfilPage'

import {
  AdminProfileProvider,
} from './components/AdminProfileContext'

type AdminPage =
  | 'geral'
  | 'den'
  | 'usu'
  | 'perdidos'
  | 'ong'
  | 'ouv'
  | 'aud'
  | 'perfil'

function App() {
  const [pagina, setPagina] =
    useState<AdminPage>('geral')

  useEffect(() => {
    // Carrega o CSS administrativo somente quando o painel é aberto,
    // mantendo o portal da ONG isolado dos estilos do admin.
    void import('./layouts/admin.css')
  }, [])

  function navigateToPage(page: string) {
    const paginas: AdminPage[] = [
      'geral',
      'den',
      'usu',
      'perdidos',
      'ong',
      'ouv',
      'aud',
      'perfil',
    ]

    if (paginas.includes(page as AdminPage)) {
      setPagina(page as AdminPage)
    }
  }

  function renderPage() {
    switch (pagina) {
      case 'geral':
        return <GeralPage onNavigate={navigateToPage} />

      case 'den':
        return <DenunciasPage />

      case 'usu':
        return <UsuariosPage />

      case 'perdidos':
        return <PerdidosPage />

      case 'ong':
        return <OngsPage />

      case 'ouv':
        return <OuvidoriaPage />

      case 'aud':
        return <AuditoriaPage />

      case 'perfil':
        return (
          <PerfilPage
            onLogout={() => {
              void signOut(auth).then(() => window.location.assign('/'))
            }}
          />
        )

      default:
        return <GeralPage onNavigate={navigateToPage} />
    }
  }

  return (
    <ToastProvider>
      <AdminProfileProvider>
        <div className="admin-app">
          <AdminLayout
            activePage={pagina}
            onNavigate={navigateToPage}
          >
            {renderPage()}
          </AdminLayout>
        </div>
      </AdminProfileProvider>
    </ToastProvider>
  )
}

export default App
