import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import './App.css'
import { OrganizationAuthError, signInOrganization } from './organizationAuth'

type LoginErrorCode =
  | 'invalid-identifier'
  | 'not-found'
  | 'invalid-credential'
  | 'email-not-verified'
  | 'pending'
  | 'too-many-requests'
  | 'disabled'
  | 'generic'

type DashboardSection =
  | 'home'
  | 'reports'
  | 'community'
  | 'animals'
  | 'checkins'
  | 'profile'

type ReportStatus =
  | 'Equipe acionada'
  | 'Equipe a caminho'
  | 'Resgate'
  | 'Encaminhado a abrigo'

type Report = {
  id: number
  priority: string
  priorityClass: 'very-urgent' | 'urgent' | 'priority'
  title: string
  location: string
  status: ReportStatus
  reporter: string
  elapsed: string
}

const reportStatuses: ReportStatus[] = [
  'Equipe acionada',
  'Equipe a caminho',
  'Resgate',
  'Encaminhado a abrigo',
]

const initialReports: Report[] = [
  {
    id: 4468,
    priority: 'Muito urgente',
    priorityClass: 'very-urgent',
    title: 'Cão idoso',
    location: 'Vila Marlene',
    status: 'Equipe a caminho',
    reporter: 'Renata F.',
    elapsed: 'há 22 min',
  },
  {
    id: 4455,
    priority: 'Urgente',
    priorityClass: 'urgent',
    title: 'Gato ferido',
    location: 'Centro',
    status: 'Resgate',
    reporter: 'João P.',
    elapsed: 'há 3 h',
  },
  {
    id: 4440,
    priority: 'Urgente',
    priorityClass: 'urgent',
    title: 'Cães em terreno baldio',
    location: 'Jardim Matarazzo',
    status: 'Equipe acionada',
    reporter: 'Marta N.',
    elapsed: 'ontem',
  },
]

const candidates = [
  { name: 'Renata Ferreira', location: 'Vila Marlene', score: 74 },
  { name: 'João Paulo', location: 'Centro', score: 58 },
  { name: 'Marta Nunes', location: 'Jardim Matarazzo', score: 41 },
]

const checkIns = [
  { animal: 'Girassol', adopter: 'Renata F.', days: 90, status: 'Ótima' },
  { animal: 'Canela', adopter: 'João Paulo', days: 30, status: 'Alguns desafios' },
  { animal: 'Beethoven', adopter: 'Marta N.', days: 180, status: 'Não respondido' },
]

function App() {
  // A autenticação fica reservada para a próxima etapa; o protótipo abre direto.
  void OrganizationLogin
  const previewUser = {
    displayName: 'Abrigo Esperança',
    email: 'contato@abrigoesperanca.org',
  } as User

  return <OrganizationDashboard user={previewUser} onLogout={() => undefined} />
}

function OrganizationLogin() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorCode(null)

    if (!identifier.trim() || !password) {
      setErrorCode('invalid-identifier')
      return
    }

    setIsSubmitting(true)
    try {
      await signInOrganization(identifier, password)
    } catch (error) {
      if (error instanceof OrganizationAuthError) {
        setErrorCode(error.code as LoginErrorCode)
      } else {
        const firebaseCode = (error as { code?: string }).code
        if (firebaseCode === 'auth/too-many-requests') {
          setErrorCode('too-many-requests')
        } else if (firebaseCode === 'auth/user-disabled') {
          setErrorCode('disabled')
        } else if (
          firebaseCode === 'auth/invalid-credential' ||
          firebaseCode === 'auth/wrong-password' ||
          firebaseCode === 'auth/user-not-found'
        ) {
          setErrorCode('invalid-credential')
        } else {
          setErrorCode('generic')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar também é organizar o atendimento.</h1>
          <p>
            Acompanhe denúncias, atualize ocorrências e ajude cada animal a
            encontrar proteção.
          </p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de proteção animal
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <span className="brand-mark" aria-hidden="true">W</span>
            <span>WeAnimals</span>
          </div>
          <div className="login-heading">
            <span className="eyebrow">ACESSO DA ONG OU ABRIGO</span>
            <h2>Bem-vinda ao painel</h2>
            <p>Entre com os dados institucionais da sua organização.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="organization-identifier">
              CNPJ ou e-mail institucional
              <input
                id="organization-identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="00.000.000/0000-00"
                autoComplete="username"
                autoFocus
              />
            </label>
            <label htmlFor="organization-password">
              Senha
              <span className="password-field">
                <input
                  id="organization-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </span>
            </label>
            {errorCode && <LoginError code={errorCode} />}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="button-spinner" />
                  Entrando...
                </>
              ) : (
                'Entrar no painel'
              )}
            </button>
          </form>
          <button className="text-button" type="button">
            Esqueci minha senha
          </button>
          <div className="login-note">
            <span className="lock-icon" aria-hidden="true">◈</span>
            Acesso protegido e exclusivo para organizações credenciadas.
          </div>
        </div>
      </section>
    </main>
  )
}

function LoginError({ code }: { code: LoginErrorCode }) {
  const messages: Record<LoginErrorCode, string> = {
    'invalid-identifier': 'Informe o CNPJ ou e-mail e a senha para continuar.',
    'not-found': 'Não encontramos uma organização com esse CNPJ.',
    'invalid-credential': 'CNPJ/e-mail ou senha incorretos.',
    'email-not-verified':
      'Confirme o e-mail institucional antes de acessar o painel.',
    pending:
      'Seu credenciamento ainda está em análise. Aguarde a validação dos administradores.',
    'too-many-requests':
      'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    disabled: 'Este acesso foi desativado. Entre em contato com o suporte.',
    generic: 'Não foi possível entrar agora. Tente novamente.',
  }

  return (
    <div className="login-error" role="alert">
      <span aria-hidden="true">!</span>
      {messages[code]}
    </div>
  )
}

function OrganizationDashboard({
  user,
  onLogout,
}: {
  user: User
  onLogout: () => void
}) {
  const [section, setSection] = useState<DashboardSection>('home')
  const [search, setSearch] = useState('')
  const [reports, setReports] = useState(initialReports)
  const [selectedReportId, setSelectedReportId] = useState(4468)
  const organizationName = user.displayName || 'Abrigo Esperança'

  const selectedReport =
    reports.find((report) => report.id === selectedReportId) ?? reports[0]

  function updateReportStatus(status: ReportStatus) {
    setReports((current) =>
      current.map((report) =>
        report.id === selectedReport.id ? { ...report, status } : report,
      ),
    )
  }

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-logo">
          <span className="portal-logo-mark" />
          WeAnimals
        </div>

        <nav className="portal-nav" aria-label="Navegação do painel">
          <NavButton active={section === 'home'} onClick={() => setSection('home')}>
            Início
          </NavButton>
          <NavButton
            active={section === 'reports'}
            badge="3"
            onClick={() => setSection('reports')}
          >
            Denúncias
          </NavButton>
          <NavButton
            active={section === 'community'}
            onClick={() => setSection('community')}
          >
            Comunidade
          </NavButton>
          <NavButton
            active={section === 'animals'}
            badge="5"
            onClick={() => setSection('animals')}
          >
            Animais
          </NavButton>
          <NavButton
            active={section === 'checkins'}
            badge="2"
            onClick={() => setSection('checkins')}
          >
            Check-ins
          </NavButton>
          <NavButton
            active={section === 'profile'}
            onClick={() => setSection('profile')}
          >
            Perfil
          </NavButton>
        </nav>

        <div className="portal-organization">
          <strong>{organizationName}</strong>
          <span>✓ Verificada</span>
        </div>
      </aside>

      <section className="portal-main">
        <header className="portal-topbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar denúncia, animal ou candidato..."
            aria-label="Buscar no painel"
          />
          <button className="notification-button" type="button" aria-label="Notificações">
            ♧
            <span />
          </button>
        </header>

        {section === 'home' && (
          <HomePage
            reports={reports}
            onOpenReport={(id) => {
              setSelectedReportId(id)
              setSection('reports')
            }}
            onOpenCandidates={() => setSection('animals')}
            onOpenCheckIns={() => setSection('checkins')}
          />
        )}
        {section === 'reports' && (
          <ReportsPage
            reports={reports}
            selectedReport={selectedReport}
            onSelectReport={setSelectedReportId}
            onUpdateStatus={updateReportStatus}
          />
        )}
        {section === 'community' && <CommunityPage />}
        {section === 'animals' && <AnimalsPage />}
        {section === 'checkins' && <CheckInsPage />}
        {section === 'profile' && <ProfilePage onLogout={onLogout} />}
      </section>
    </main>
  )
}

function NavButton({
  active,
  badge,
  children,
  onClick,
}: {
  active: boolean
  badge?: string
  children: string
  onClick: () => void
}) {
  return (
    <button
      className={'portal-nav-button' + (active ? ' active' : '')}
      type="button"
      onClick={onClick}
    >
      {children}
      {badge && <b>{badge}</b>}
    </button>
  )
}

function PageHeading({ children }: { children: string }) {
  return <h1 className="portal-page-title">{children}</h1>
}

function HomePage({
  reports,
  onOpenReport,
  onOpenCandidates,
  onOpenCheckIns,
}: {
  reports: Report[]
  onOpenReport: (id: number) => void
  onOpenCandidates: () => void
  onOpenCheckIns: () => void
}) {
  return (
    <section className="portal-page">
      <PageHeading>Painel da ONG</PageHeading>
      <div className="verified-message">✓ Organização parceira verificada</div>

      <div className="portal-grid stats-grid">
        <StatCard value="5" label="candidaturas pendentes" />
        <StatCard value={String(reports.length)} label="denúncias ativas" />
        <StatCard value="2" label="check-ins para revisar" />
        <StatCard value="1" label="Pix a confirmar" />
      </div>

      <div className="portal-grid home-grid">
        <div className="portal-card">
          <h2>Precisa de atenção</h2>
          <div className="attention-list">
            <button
              type="button"
              className="attention-row"
              onClick={() => onOpenReport(4468)}
            >
              <span className="attention-icon urgent-icon">!</span>
              <span>
                <strong>Denúncia #4468 · muito urgente</strong>
                <small>Equipe a caminho há 22 min</small>
              </span>
              <span className="priority-badge very-urgent">Urgente</span>
            </button>
            <button type="button" className="attention-row">
              <span className="attention-icon">R$</span>
              <span>
                <strong>Doação Pix de R$ 50</strong>
                <small>Renata Ferreira · aguardando confirmação</small>
              </span>
              <span className="priority-badge in-progress">Pix</span>
            </button>
          </div>
        </div>

        <div className="portal-card">
          <h2>Candidaturas de adoção</h2>
          <button type="button" className="compact-row" onClick={onOpenCandidates}>
            <span className="attention-icon">♧</span>
            <span>
              <strong>Canela · 3 candidatos</strong>
              <small>Mais compatível: Renata F.</small>
            </span>
            <b>74%</b>
          </button>
          <h2 className="second-card-title">Check-ins pós-adoção</h2>
          <button type="button" className="compact-row" onClick={onOpenCheckIns}>
            <span className="attention-icon">◷</span>
            <span>
              <strong>Girassol · 90 dias</strong>
              <small>Respondido ontem · adaptação ótima</small>
            </span>
            <span className="priority-badge ok">Ótima</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="portal-card stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function ReportsPage({
  reports,
  selectedReport,
  onSelectReport,
  onUpdateStatus,
}: {
  reports: Report[]
  selectedReport: Report
  onSelectReport: (id: number) => void
  onUpdateStatus: (status: ReportStatus) => void
}) {
  const [filter, setFilter] = useState<'active' | 'resolved' | 'all'>('active')
  const [showDetails, setShowDetails] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const filteredReports =
    filter === 'resolved' ? [] : filter === 'all' ? reports : reports

  return (
    <section className="portal-page">
      <div className="portal-page-heading">
        <PageHeading>Denúncias</PageHeading>
        <div className="filter-chips">
          {[
            ['active', 'Ativas'],
            ['resolved', 'Resolvidas'],
            ['all', 'Todas'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={'filter-chip' + (filter === key ? ' active' : '')}
              onClick={() => setFilter(key as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-layout">
        <div className="report-list">
          {filteredReports.length ? (
            filteredReports.map((report) => (
              <button
                type="button"
                key={report.id}
                className={
                  'report-list-item' +
                  (selectedReport.id === report.id ? ' selected' : '')
                }
                onClick={() => {
                  onSelectReport(report.id)
                  setShowDetails(false)
                }}
              >
                <span className={'priority-badge ' + report.priorityClass}>
                  {report.priority}
                </span>
                <strong>
                  #{report.id} · {report.title}, {report.location}
                </strong>
                <small>
                  {report.status} <span>· {report.elapsed}</span>
                </small>
              </button>
            ))
          ) : (
            <div className="empty-panel">
              <strong>Nenhuma denúncia nesta categoria.</strong>
              <span>As novas ocorrências aparecerão aqui.</span>
            </div>
          )}
        </div>

        <ReportDetail
          report={selectedReport}
          showDetails={showDetails}
          showChat={showChat}
          onToggleDetails={() => setShowDetails((visible) => !visible)}
          onToggleChat={() => setShowChat((visible) => !visible)}
          onUpdateStatus={onUpdateStatus}
        />
      </div>
    </section>
  )
}

function ReportDetail({
  report,
  showDetails,
  showChat,
  onToggleDetails,
  onToggleChat,
  onUpdateStatus,
}: {
  report: Report
  showDetails: boolean
  showChat: boolean
  onToggleDetails: () => void
  onToggleChat: () => void
  onUpdateStatus: (status: ReportStatus) => void
}) {
  return (
    <article className="portal-card report-detail">
      <div className="detail-heading">
        <h2>Denúncia #{report.id}</h2>
        <span className={'priority-badge ' + report.priorityClass}>
          {report.priority}
        </span>
      </div>
      <div className="mono-label">Localização</div>
      <div className="reference-map">
        <span className="map-pin" />
        <button type="button" className="map-expand">
          ⤢ Expandir mapa
        </button>
      </div>
      <button type="button" className="reporter-row">
        <span className="attention-icon">R</span>
        <span>
          <strong>{report.reporter}</strong>
          <small>Membro desde mar 2025 · 6 denúncias</small>
        </span>
        <span className="reporter-score">
          <b>94%</b>
          <small>confiável</small>
        </span>
      </button>
      <div className="mono-label">Atualizar status</div>
      <div className="status-chips">
        {reportStatuses.map((status) => (
          <button
            type="button"
            key={status}
            className={'status-chip' + (report.status === status ? ' active' : '')}
            onClick={() => onUpdateStatus(status)}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="detail-actions">
        <button type="button" className="outline-button" onClick={onToggleDetails}>
          Ver detalhes da denúncia
        </button>
        <button type="button" className="brown-button" onClick={onToggleChat}>
          Falar com quem denunciou
        </button>
        <button type="button" className="outline-button">
          Traçar rota
        </button>
      </div>
      {showDetails && (
        <div className="detail-box">
          <strong>Respostas da triagem</strong>
          <p>
            Risco imediato de morte: Não · Maus-tratos ativos: Sim · Animal
            preso ou ferido: Sim · Situação de rua sem risco: Não
          </p>
          <p>Foto: foto-terreno-baldio.jpg · Rua Voluntários, 88 — Zona Norte</p>
        </div>
      )}
      {showChat && (
        <div className="report-chat">
          <p>O cão ainda está lá, alguém já foi?</p>
          <p className="mine">Equipe a caminho, chegada em 22 min.</p>
          <input placeholder="Escreva uma mensagem" />
        </div>
      )}
    </article>
  )
}

function CommunityPage() {
  return (
    <section className="portal-page">
      <div className="portal-page-heading">
        <PageHeading>Comunidade</PageHeading>
        <button type="button" className="brown-button">+ Nova publicação / campanha</button>
      </div>
      <div className="filter-chips community-filters">
        <button type="button" className="filter-chip active">Tudo</button>
        <button type="button" className="filter-chip">Campanhas</button>
        <button type="button" className="filter-chip">Posts</button>
      </div>
      <div className="portal-grid community-grid">
        <CampaignCard
          type="Castração"
          title="Mutirão de sábado"
          subtitle="Sáb, 6 set · 8h–13h · Vila Marlene"
          progress="28 de 60 vagas"
        />
        <CampaignCard
          type="Doação"
          title="Ração e cobertores"
          subtitle="Até 30 de setembro"
          progress="R$ 2.340 de R$ 5.000"
        />
        <article className="portal-card community-post">
          <span className="mono-label">Post · há 2h</span>
          <h3>Marta Nunes</h3>
          <p>
            Achei essa gatinha perto da praça, sem coleira. Alguém reconhece?
          </p>
          <small>18 curtidas · 7 comentários</small>
        </article>
      </div>
    </section>
  )
}

function CampaignCard({
  type,
  title,
  subtitle,
  progress,
}: {
  type: string
  title: string
  subtitle: string
  progress: string
}) {
  return (
    <article className="portal-card campaign-card">
      <span className="campaign-owner">Sua campanha</span>
      <span className="campaign-type">{type}</span>
      <h3>{title}</h3>
      <small>{subtitle}</small>
      <div className="progress-bar"><i /></div>
      <span className="progress-label">{progress}</span>
      <div className="campaign-actions">
        <button type="button" className="outline-button">Editar</button>
        <button type="button" className="outline-button">Ver inscritos</button>
      </div>
    </article>
  )
}

function AnimalsPage() {
  const [showForm, setShowForm] = useState(false)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const candidate = candidates[candidateIndex]

  return (
    <section className="portal-page">
      <div className="portal-page-heading">
        <PageHeading>Animais</PageHeading>
        <button
          type="button"
          className="brown-button"
          onClick={() => setShowForm((visible) => !visible)}
        >
          + Cadastrar animal
        </button>
      </div>
      {showForm && (
        <div className="portal-card animal-form">
          <h2>Cadastrar animal</h2>
          <div className="form-grid">
            <label>Nome<input defaultValue="Duquesa" /></label>
            <label>Porte<select defaultValue="Médio"><option>Pequeno</option><option>Médio</option><option>Grande</option></select></label>
            <label>Chegada ao abrigo<input type="date" defaultValue="2026-06-12" /></label>
          </div>
          <span className="mono-label">Características</span>
          <div className="status-chips">
            <button type="button" className="status-chip active">Vacinada</button>
            <button type="button" className="status-chip active">Castrada</button>
            <button type="button" className="status-chip">Dócil com crianças</button>
            <button type="button" className="status-chip">+ Adicionar</button>
          </div>
          <button type="button" className="brown-button">Publicar para adoção</button>
        </div>
      )}
      <div className="portal-grid animals-grid">
        <div className="portal-card table-card">
          <table>
            <thead><tr><th>Animal</th><th>Candidaturas</th></tr></thead>
            <tbody>
              {[
                ['Canela', 'SRD · 2 anos', 3],
                ['Girassol', 'Felino · filhote', 1],
                ['Beethoven', 'SRD · 4 anos', 0],
              ].map(([name, description, count]) => (
                <tr key={String(name)}>
                  <td><strong>{name}</strong><small>{description}</small></td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="portal-card candidate-card">
          <h2>Candidaturas · Canela</h2>
          {candidates.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={'candidate-row' + (candidateIndex === index ? ' selected' : '')}
              onClick={() => setCandidateIndex(index)}
            >
              <span className="attention-icon">{item.name.charAt(0)}</span>
              <span><strong>{item.name}</strong><small>{item.location}</small></span>
              <b>{item.score}%</b>
            </button>
          ))}
          <div className="candidate-info">
            <strong>{candidate.name}</strong> · {candidate.score}% compatível · já
            teve animais · apto com varanda · home office
          </div>
          <div className="questionnaire-row">Ver respostas completas do questionário</div>
          <textarea placeholder="Justificativa da decisão..." />
          <div className="candidate-actions">
            <button type="button" className="reject-button">Recusar</button>
            <button type="button" className="brown-button">Aprovar adoção</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function CheckInsPage() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = checkIns[selectedIndex]

  return (
    <section className="portal-page">
      <PageHeading>Check-ins pós-adoção</PageHeading>
      <div className="portal-grid checkins-grid">
        <div className="portal-card table-card">
          <table>
            <thead><tr><th>Animal / adotante</th><th>Prazo</th><th>Status</th></tr></thead>
            <tbody>
              {checkIns.map((item, index) => (
                <tr key={item.animal} className={selectedIndex === index ? 'selected-row' : ''} onClick={() => setSelectedIndex(index)}>
                  <td><strong>{item.animal}</strong><small>{item.adopter}</small></td>
                  <td>{item.days} dias</td>
                  <td><span className={'priority-badge ' + (item.status === 'Ótima' ? 'ok' : 'in-progress')}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="portal-card checkin-detail">
          <h2>{selected.animal} · {selected.adopter}</h2>
          <div className="status-chips">
            {[30, 90, 180].map((days) => <button type="button" key={days} className={'status-chip' + (selected.days === days ? ' active' : '')}>{days} dias</button>)}
          </div>
          {[
            ['Adaptação', selected.status],
            ['Rotina estabelecida?', selected.status === 'Ótima' ? 'Sim' : 'Em parte'],
            ['Problema de saúde/comportamento?', 'Não'],
            ['Leva ao veterinário?', 'Sim'],
          ].map(([label, value]) => <div className="answer-row" key={label}><small>{label}</small><strong>{value}</strong></div>)}
        </div>
      </div>
    </section>
  )
}

function ProfilePage({ onLogout }: { onLogout: () => void }) {
  return (
    <section className="portal-page">
      <PageHeading>Perfil da ONG</PageHeading>
      <div className="portal-grid profile-grid">
        <div className="portal-card">
          <h2>Dados institucionais</h2>
          <Answer label="CNPJ" value="00.000.000/0001-00" />
          <Answer label="E-mail institucional" value="contato@abrigoesperanca.org" />
          <Answer label="Chave Pix" value="doacoes@abrigoesperanca.org" />
          <Answer label="Responsável legal" value="Renata Ferreira" />
        </div>
        <div className="portal-card">
          <h2>Verificação</h2>
          <div className="verified-message">✓ Aprovada em 12/03/2025</div>
          <div className="info-box">
            Documento de registro aprovado. Alterar CNPJ, razão social ou
            documento abre uma nova análise.
          </div>
          <div className="profile-actions">
            <button type="button" className="outline-button">Alterar senha</button>
            <button type="button" className="outline-button">Reenviar documento</button>
            <button type="button" className="logout-link" onClick={onLogout}>Sair</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Answer({ label, value }: { label: string; value: string }) {
  return <div className="answer-row"><small>{label}</small><strong>{value}</strong></div>
}

export default App
