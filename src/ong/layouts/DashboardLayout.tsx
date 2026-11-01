import { useState, useEffect, useRef, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import type { DashboardSection, AppNotification } from '../types'
import { SupportChatWidget } from '../components/SupportChatWidget'

interface DashboardLayoutProps {
  user: User
  organizationName: string
  organizationEmail: string
  isVerified: boolean
  currentSection: DashboardSection
  notifications: AppNotification[]
  badges: {
    reports: number
    animals: number
    checkins: number
  }
  searchQuery: string
  onSearchChange: (q: string) => void
  onNavigate: (section: DashboardSection) => void
  onLogout: () => void
  onMarkNotificationsAsRead: () => void
  children: ReactNode
}

export function DashboardLayout({
  user,
  organizationName,
  organizationEmail,
  isVerified,
  currentSection,
  notifications,
  badges,
  searchQuery,
  onSearchChange,
  onNavigate,
  onLogout,
  onMarkNotificationsAsRead,
  children,
}: DashboardLayoutProps) {
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false)
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const orgMenuRef = useRef<HTMLDivElement>(null)
  const notifMenuRef = useRef<HTMLDivElement>(null)

  const initial = (organizationName.trim().charAt(0) || 'O').toUpperCase()
  const hasUnread = notifications.some((n) => !n.read)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setIsOrgMenuOpen(false)
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const NavButton = ({
    section,
    label,
    badgeCount,
  }: {
    section: DashboardSection
    label: string
    badgeCount?: number
  }) => {
    const isLocked = !isVerified && section !== 'home' && section !== 'profile'

    return (
      <button
        type="button"
        className={`nav ${currentSection === section ? 'on' : ''}`}
        onClick={() => {
          if (isLocked) {
            alert('Esta funcionalidade está temporariamente bloqueada até que a moderação aprove o cadastro da sua ONG.')
            return
          }
          onNavigate(section)
          setIsNotifMenuOpen(false)
          setIsMobileMenuOpen(false)
        }}
        style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      >
        <span>{label} {isLocked && '🔒'}</span>
        {badgeCount !== undefined && badgeCount > 0 && !isLocked ? <b>{badgeCount}</b> : null}
      </button>
    )
  }

  return (
    <div className="portal-shell">
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`portal-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/weanimals-entry-silhouette.png"
            alt="WeAnimals"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              objectFit: 'contain',
              padding: '4px',
              background: '#d4a373',
              flexShrink: 0,
            }}
          />
          WeAnimals
        </div>

        <nav className="portal-nav" aria-label="Navegação do painel">
          <NavButton section="home" label="Início" />
          <NavButton section="reports" label="Denúncias" badgeCount={badges.reports} />
          <NavButton section="community" label="Comunidade" />
          <NavButton section="animals" label="Animais" badgeCount={badges.animals} />
          <NavButton section="checkins" label="Check-ins" badgeCount={badges.checkins} />
        </nav>

        <div
          className="org"
          ref={orgMenuRef}
          onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={organizationName}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--p7)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {organizationName}
            </b>
            <span style={{ color: isVerified ? '#22c55e' : '#eab308' }}>
              {isVerified ? '✓ Verificada' : '⏳ Pendente de aprovação'}
            </span>
          </div>

          <div
            className={`org-menu ${isOrgMenuOpen ? 'show' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="account-card">
              <div className="avatar">{initial}</div>
              <div className="info">
                <div className="name">{organizationName}</div>
                <div className="email">{organizationEmail}</div>
              </div>
            </div>
            <div
              className="org-item"
              onClick={() => {
                setIsOrgMenuOpen(false)
                onNavigate('profile')
              }}
            >
              Configurações do perfil
            </div>
            <div
              className="org-item"
              onClick={() => {
                setIsOrgMenuOpen(false)
                onLogout()
              }}
            >
              Adicionar outra conta
            </div>
            <div style={{ height: 1, background: 'var(--ln)', margin: '4px 0' }} />
            <div className="org-item" style={{ color: 'var(--a6)' }} onClick={onLogout}>
              Sair
            </div>
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="top">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Abrir menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar denúncia, animal ou candidato..."
            aria-label="Buscar no painel"
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }} ref={notifMenuRef}>
            <div
              className={`bell ${!hasUnread ? 'read' : ''}`}
              onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--i6)' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>

              <div className={`notif-menu ${isNotifMenuOpen ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="notif-head">
                  Notificações
                  <button
                    type="button"
                    className="btn g"
                    style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8 }}
                    onClick={onMarkNotificationsAsRead}
                  >
                    Marcar lidas
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--i6)', fontSize: 13 }}>
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notif-item ${!notif.read ? 'unread' : ''}`}
                      onClick={() => {
                        onNavigate(notif.targetSection)
                        setIsNotifMenuOpen(false)
                      }}
                    >
                      <b>{notif.title}:</b> {notif.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        {!isVerified && (
          <div style={{ background: '#fef9c3', color: '#854d0e', padding: '12px 24px', fontSize: '13px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fde047' }}>
            <span>⚠️ A sua conta está pendente de aprovação pela moderação. O envio de documentos foi encaminhado para o administrador.</span>
            <button onClick={() => onNavigate('profile')} style={{ background: '#854d0e', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Ver Perfil</button>
          </div>
        )}

        {children}
      </main>

      <SupportChatWidget organizationName={organizationName} />
    </div>
  )
}