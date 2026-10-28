
import type { ReactNode } from 'react'
import { useAdminProfile } from '../components/AdminProfileContext'

type AdminPage =
  | 'geral'
  | 'den'
  | 'usu'
  | 'perdidos'
  | 'ong'
  | 'ouv'
  | 'aud'
  | 'perfil'

type AdminLayoutProps = {
  children: ReactNode
  activePage: AdminPage
  onNavigate: (page: AdminPage) => void
}

const navigation: {
  id: AdminPage
  label: string
  icon: string
}[] = [
  { id: 'geral', label: 'Visão geral', icon: '◫' },
  { id: 'den', label: 'Denúncias', icon: '⚑' },
  { id: 'usu', label: 'Usuários e reputação', icon: '♙' },
  { id: 'perdidos', label: 'Achados e perdidos', icon: '⌕' },
  { id: 'ong', label: 'ONGs', icon: '⌂' },
  { id: 'ouv', label: 'Ouvidoria', icon: '▤' },
  { id: 'aud', label: 'Auditoria', icon: '◷' },
]

export default function AdminLayout({
  children,
  activePage,
  onNavigate,
}: AdminLayoutProps) {
  const { nome, foto, disponibilidade } = useAdminProfile()

  const inicial =
    nome.trim().charAt(0).toUpperCase() || 'A'

  const classeStatus =
    disponibilidade === 'Online'
      ? 'online'
      : disponibilidade === 'Ausente'
        ? 'ausente'
        : 'indisponivel'

  return (
    <div className="wa-shell">
      <aside className="wa-sidebar">
        <div className="wa-brand">
          <div className="wa-brand-mark">W</div>

          <div>
            <strong>WeAnimals</strong>
            <span>PAINEL ADMINISTRATIVO</span>
          </div>
        </div>

        <div className="wa-nav-label">
          GESTÃO DA PLATAFORMA
        </div>

        <nav
          className="wa-nav"
          aria-label="Navegação administrativa"
        >
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`wa-nav-item ${
                activePage === item.id ? 'active' : ''
              }`}
              onClick={() => onNavigate(item.id)}
              aria-current={
                activePage === item.id ? 'page' : undefined
              }
            >
              <span
                className="wa-nav-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              {item.label}
            </button>
          ))}
        </nav>

        <div className="wa-sidebar-bottom">
          <div className="wa-prototype-status">
            <span className="wa-status-dot" />
            Protótipo administrativo
          </div>

          <button
            type="button"
            className={`wa-admin-profile ${
              activePage === 'perfil' ? 'active' : ''
            }`}
            onClick={() => onNavigate('perfil')}
            aria-label="Abrir perfil do administrador"
            aria-current={
              activePage === 'perfil' ? 'page' : undefined
            }
          >
            <div className="wa-avatar">
              {foto ? (
                <img src={foto} alt="" />
              ) : (
                inicial
              )}
            </div>

            <div className="wa-admin-profile-info">
              <strong>
                {nome.trim() || 'Administrador'}
              </strong>

              <span className="wa-admin-presence">
                <span
                  className={`wa-admin-presence-dot ${classeStatus}`}
                />

                <span>{disponibilidade}</span>

                <span className="wa-admin-profile-separator">
                  ·
                </span>

                <span className="wa-admin-view-profile">
                  Ver perfil
                </span>
              </span>
            </div>
          </button>
        </div>
      </aside>

      <main className="wa-main">
        <header className="wa-topbar">
          <span>
            WeAnimals{' '}
            <span className="wa-muted">
              / Administração
            </span>
          </span>

          <span className="wa-topbar-tag">
            AMBIENTE DE DEMONSTRAÇÃO
          </span>
        </header>

        <section className="wa-view">
          {children}
        </section>
      </main>
    </div>
  )
}
