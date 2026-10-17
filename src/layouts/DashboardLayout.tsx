import { useState, useEffect, useRef, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import type { DashboardSection, AppNotification } from '../types'

interface DashboardLayoutProps {
  user: User
  organizationName: string
  organizationEmail: string
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
  }) => (
    <button
      type="button"
      className={`nav ${currentSection === section ? 'on' : ''}`}
      onClick={() => {
        onNavigate(section)
        setIsNotifMenuOpen(false)
      }}
    >
      {label}
      {badgeCount !== undefined && badgeCount > 0 ? <b>{badgeCount}</b> : null}
    </button>
  )

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="logo">
          <i />
          WeAnimals
        </div>

        <nav className="portal-nav" aria-label="Navegação do painel">
          <NavButton section="home" label="Início" />
          <NavButton section="reports" label="Denúncias" badgeCount={badges.reports} />
          <NavButton section="community" label="Comunidade" />
          <NavButton section="animals" label="Animais" badgeCount={badges.animals} />
          <NavButton section="checkins" label="Check-ins" badgeCount={badges.checkins} />
          <NavButton section="profile" label="Perfil" />
        </nav>

        {/* CARD DA CONTA COM AVATAR / INICIAL DINÂMICA */}
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
            <span>✓ Verificada</span>
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
              <svg viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Configurações do perfil
            </div>
            <div style={{ height: 1, background: 'var(--ln)', margin: '4px 0' }} />
            <div className="org-item" style={{ color: 'var(--a6)' }} onClick={onLogout}>
              <svg viewBox="0 0 24 24" style={{ stroke: 'var(--a6)' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sair
            </div>
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="top">
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar denúncia, animal ou candidato..."
            aria-label="Buscar no painel"
          />

          <div
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }}
            ref={notifMenuRef}
          >
            <div
              className={`bell ${!hasUnread ? 'read' : ''}`}
              onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--i6)' }}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>

              <div
                className={`notif-menu ${isNotifMenuOpen ? 'show' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        {notif.type === 'urgent' && <span className="pill novo">Urgente</span>}
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--i6)',
                            marginLeft: notif.type !== 'urgent' ? 'auto' : 0,
                          }}
                        >
                          {notif.timeAgo}
                        </span>
                      </div>
                      <b>{notif.title}:</b> {notif.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}