import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth'
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  arrayUnion 
} from 'firebase/firestore'
import './ong/app.css'
import AdminApp from './admin/AdminApp'
import { auth, db } from './firebase'
import {
  isOrganizationLoginMutationInProgress,
  OrganizationAuthError,
  signInOrganization,
} from './ong/auth/organizationAuth'
import {
  isOrganizationAuthMutationInProgress,
  submitOrganizationAccreditation,
} from './ong/auth/organizationAccreditation'
import { hasAdminAccess } from './admin/adminAccess'

import { DashboardLayout } from './ong/layouts/DashboardLayout'
import { Home } from './ong/pages/Home'
import { Reports } from './ong/pages/Reports'
import { Community } from './ong/pages/Community'
import { Animals } from './ong/pages/Animals'
import { CheckIns } from './ong/pages/CheckIns'
import { Profile } from './ong/pages/Profile'
import type {
  LoginErrorCode,
  DashboardSection,
  ReportStatus,
  Report,
  AppNotification,
  AnimalItem,
  Candidate,
  CandidateStatus,
  CommunityPost,
  CheckInRecord,
  OrganizationProfile,
} from './ong/types'

const initialReports: Report[] = [
  {
    id: 4468,
    priority: 'Muito urgente',
    priorityClass: 'very-urgent',
    title: 'Cão idoso',
    location: 'Vila Marlene',
    address: 'Rua Voluntários, 88 — Vila Marlene',
    coordinates: { lat: -23.6687, lng: -46.5322 },
    status: 'Equipe a caminho',
    reporter: 'Renata F.',
    reporterSince: 'mar 2025',
    reporterTotalReports: 6,
    reporterReliability: 94,
    elapsed: 'há 22 min',
    triage: {
      immediateRisk: 'Não',
      activeAbuse: 'Sim',
      trappedOrInjured: 'Sim',
      streetNoRisk: 'Não',
      photoName: 'foto-cao-vila-marlene.jpg',
    },
    chat: [
      { id: 'm1', text: 'O cão ainda está lá, alguém já foi?', mine: false, timestamp: '14:10' },
      { id: 'm2', text: 'Equipe a caminho, chegada em 22 min.', mine: true, timestamp: '14:12' },
    ],
  },
]

const initialAnimals: AnimalItem[] = [
  {
    id: 'ani-1',
    name: 'Canela',
    description: 'SRD · 2 anos',
    size: 'Médio',
    arrivalDate: '2026-04-10',
    traits: ['Vacinada', 'Castrada', 'Dócil'],
    requirements: ['Maior de 18 anos', 'Visita prévia'],
    photos: [],
  },
]

const initialCandidates: Candidate[] = [
  {
    id: 'cand-1',
    animalId: 'ani-1',
    name: 'Renata Ferreira',
    pct: 74,
    location: 'Vila Marlene',
    summary: 'já teve animais · apto com varanda · home office',
    status: 'pendente',
    answers: [
      { question: 'Rotina', answer: 'Home office integral' },
      { question: 'Espaço', answer: 'Apartamento com varanda telada' },
      { question: 'Já teve animais?', answer: 'Sim, cães adultos' },
    ],
  },
]

const initialPosts: CommunityPost[] = [
  {
    id: 'post-1',
    author: 'Abrigo Esperança',
    isOwn: true,
    type: 'Campanha',
    categoryLabel: 'Castração',
    title: 'Mutirão de sábado',
    description: 'Sáb, 6 set · 8h–13h · Vila Marlene',
    progressText: '28 de 60 vagas',
    progressPct: 47,
    subscribers: [],
  },
]

const initialCheckIns: CheckInRecord[] = [
  {
    id: 'chk-1',
    animal: 'Girassol',
    adopter: 'Renata F.',
    currentDays: 90,
    status: 'Ótima',
    reviewed: false,
    reportsByPeriod: {
      30: [{ label: 'Adaptação (30d)', value: 'Boa' }],
      90: [{ label: 'Adaptação (90d)', value: 'Ótima' }],
      180: [{ label: 'Status (180d)', value: 'Ainda dentro do prazo' }],
    },
  },
]

function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminRoute />
  }

  return <OrganizationPortalApp />
}

function AdminRoute() {
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true

    return onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser || nextUser.isAnonymous) {
        if (active) {
          setAllowed(false)
          setCheckingAccess(false)
        }
        return
      }

      void hasAdminAccess(nextUser).then((hasAccess) => {
        if (!active) return

        setAllowed(hasAccess)
        setCheckingAccess(false)
      })
    })
  }, [])

  if (checkingAccess) {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="loading-spinner" />
        <p>Validando acesso administrativo...</p>
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="admin-access-denied">
        <div className="admin-access-card">
          <span className="admin-access-lock" aria-hidden="true">⌑</span>
          <span className="eyebrow">ACESSO RESTRITO</span>
          <h1>Painel administrativo</h1>
          <p>
            Entre com um e-mail de administrador autorizado para acessar esta área.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.assign('/')}
          >
            Voltar para o login
          </button>
        </div>
      </main>
    )
  }

  return <AdminApp />
}

function OrganizationPortalApp() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (
        isOrganizationAuthMutationInProgress() ||
        isOrganizationLoginMutationInProgress()
      ) {
        return
      }

      if (!nextUser || nextUser.isAnonymous) {
        if (active) {
          setUser(null)
          setCheckingSession(false)
        }
        return
      }

      void hasAdminAccess(nextUser).then((isAdmin) => {
        if (!active) return

        if (isAdmin) {
          window.location.replace('/admin')
          return
        }

        setUser(nextUser)
        setCheckingSession(false)
      })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (checkingSession) {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="loading-spinner" />
        <p>Carregando seu acesso...</p>
      </main>
    )
  }

  return user ? (
    <OrganizationDashboard user={user} onLogout={() => signOut(auth)} />
  ) : (
    <OrganizationLogin onAuthenticated={setUser} />
  )
}

function formatOrganizationIdentifier(value: string) {
  if (/[a-zA-Z@]/.test(value)) return value
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return digits.slice(0, 2) + '.' + digits.slice(2)
  if (digits.length <= 8) {
    return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5)
  }
  if (digits.length <= 12) {
    return (
      digits.slice(0, 2) +
      '.' +
      digits.slice(2, 5) +
      '.' +
      digits.slice(5, 8) +
      '/' +
      digits.slice(8)
    )
  }
  return (
    digits.slice(0, 2) +
    '.' +
    digits.slice(2, 5) +
    '.' +
    digits.slice(5, 8) +
    '/' +
    digits.slice(8, 12) +
    '-' +
    digits.slice(12)
  )
}

function PasswordVisibilityIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.7" />
      {hidden && <path d="m3 3 18 18" />}
    </svg>
  )
}

function OrganizationLogin({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => void
}) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberConnected, setRememberConnected] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showAccreditation, setShowAccreditation] = useState(false)
  const [showPending, setShowPending] = useState(false)
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
      const authenticatedUser = await signInOrganization(
        identifier,
        password,
        rememberConnected,
      )

      if (await hasAdminAccess(authenticatedUser)) {
        window.location.assign('/admin')
        return
      }

      onAuthenticated(authenticatedUser)
    } catch (error) {
      if (error instanceof OrganizationAuthError) {
        if (error.code === 'pending') {
          setShowPending(true)
          return
        }
        setErrorCode(error.code as LoginErrorCode)
      } else {
        setErrorCode('generic')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showRecovery) return <PasswordRecovery onBack={() => setShowRecovery(false)} />
  if (showAccreditation) return <OrganizationAccreditation onBack={() => setShowAccreditation(false)} />
  if (showPending) {
    return (
      <OrganizationLoginBlocked
        onResubmit={() => {
          setShowPending(false)
          setShowAccreditation(true)
        }}
        onBack={() => setShowPending(false)}
      />
    )
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <img className="brand-silhouette" src="/weanimals-entry-silhouette.png" alt="" />
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar também é organizar o atendimento.</h1>
          <p>Acompanhe denúncias, atualize ocorrências e ajude cada animal a encontrar proteção.</p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de proteção animal
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-heading">
            <span className="eyebrow">ACESSO INSTITUCIONAL</span>
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
                onChange={(event) =>
                  setIdentifier(formatOrganizationIdentifier(event.target.value))
                }
                placeholder="00.000.000/0000-00 ou e-mail"
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
                >
                  <PasswordVisibilityIcon hidden={!showPassword} />
                </button>
              </span>
            </label>
            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberConnected}
                  onChange={(event) => setRememberConnected(event.target.checked)}
                />
                <span>Manter conectado</span>
              </label>
              <button
                type="button"
                className="forgot-button"
                onClick={() => setShowRecovery(true)}
              >
                Esqueci minha senha
              </button>
            </div>
            {errorCode && <LoginError code={errorCode} />}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar no painel'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--i6)' }}>Ainda não tem cadastro? </span>
              <button
                type="button"
                className="forgot-button"
                onClick={() => setShowAccreditation(true)}
                style={{ display: 'inline', marginLeft: '4px' }}
              >
                Solicitar credenciamento
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

function PasswordRecovery({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRecovery(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setIsSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page" style={{ display: 'grid', placeItems: 'center', padding: '20px' }}>
      <div className="login-card" style={{ background: '#fff', padding: '40px', borderRadius: '16px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Voltar para o login
        </button>

        {!sent ? (
          <form className="login-form" onSubmit={handleRecovery} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '6px', fontWeight: 700 }}>Redefinir senha</h2>
              <p style={{ fontSize: '13.5px', color: '#64748b' }}>Digite seu e-mail institucional cadastrado para receber o link de recuperação.</p>
            </div>
            <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
              E-mail institucional
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@ong.org"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
                required
                autoFocus
              />
            </label>
            <button className="primary-button" type="submit" disabled={isSubmitting} style={{ padding: '12px', marginTop: '8px' }}>
              {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h2 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '12px' }}>E-mail enviado!</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Caso o e-mail informado esteja cadastrado, enviamos as instruções para a redefinição da sua senha.
            </p>
            <button className="primary-button" onClick={onBack} style={{ width: '100%' }}>Voltar para o login</button>
          </div>
        )}
      </div>
    </main>
  )
}

function OrganizationAccreditation({ onBack }: { onBack: () => void }) {
  const [cnpj, setCnpj] = useState('')
  const [legalName, setLegalName] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pixKey, setPixKey] = useState('')
  
  const [cnpjFile, setCnpjFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [bylawsFile, setBylawsFile] = useState<File | null>(null)
  const [addressFile, setAddressFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    if (!cnpjFile || !idFile || !addressFile) {
      setErrorMessage('Por favor, envie todos os documentos obrigatórios.')
      return
    }
    setIsSubmitting(true)
    try {
      await submitOrganizationAccreditation({
        cnpj,
        legalName,
        responsibleName,
        institutionalEmail: email,
        password,
        documentName: cnpjFile.name,
        documentSizeBytes: cnpjFile.size,
        documentContentType: cnpjFile.type,
        pixKey,
      })
      setSubmitted(true)
    } catch (error: any) {
      console.error(error)
      setErrorMessage(`Erro no credenciamento: ${error.message || error}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="login-page" style={{ display: 'grid', placeItems: 'center', padding: '20px' }}>
        <div className="login-card" style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '480px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '12px' }}>Credenciamento enviado com sucesso!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            Os seus dados e documentos foram enviados para análise da moderação. Você já pode entrar no painel com acesso restrito enquanto aguarda a aprovação.
          </p>
          <button className="primary-button" onClick={onBack} style={{ width: '100%' }}>Ir para o login</button>
        </div>
      </main>
    )
  }

  return (
    <main className="login-page" style={{ padding: '40px 20px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="login-card" style={{ background: '#fff', padding: '36px', borderRadius: '16px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', margin: 'auto' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Voltar para o login
        </button>

        <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '6px', fontWeight: 700 }}>Solicitar credenciamento</h2>
        <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px' }}>
          Preencha os dados institucionais e envie os documentos obrigatórios para validação da ONG.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            CNPJ ou Registro
            <input
              type="text"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={e => setCnpj(formatOrganizationIdentifier(e.target.value))}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Razão Social / Nome da ONG
            <input
              type="text"
              placeholder="Ex: Abrigo Esperança"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Nome do Responsável Legal
            <input
              type="text"
              placeholder="Ex: Ana Maria Souza"
              value={responsibleName}
              onChange={e => setResponsibleName(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            E-mail institucional
            <input
              type="email"
              placeholder="contato@ong.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Senha de acesso
            <input
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Chave Pix para doações
            <input
              type="text"
              placeholder="CNPJ, e-mail ou chave aleatória"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            1. CNPJ Ativo ou Comprovante de Registro <span style={{ color: '#ef4444' }}>*</span>
            <input
              type="file"
              onChange={e => setCnpjFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {cnpjFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {cnpjFile.name}</small>}
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            2. Documento de Identidade e CPF do Responsável <span style={{ color: '#ef4444' }}>*</span>
            <input
              type="file"
              onChange={e => setIdFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {idFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {idFile.name}</small>}
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            3. Estatuto Social / Ata da Diretoria (Opcional)
            <input
              type="file"
              onChange={e => setBylawsFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            {bylawsFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {bylawsFile.name}</small>}
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            4. Comprovante de Endereço Recente da Sede <span style={{ color: '#ef4444' }}>*</span>
            <input
              type="file"
              onChange={e => setAddressFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {addressFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {addressFile.name}</small>}
          </label>

          {errorMessage && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
              {errorMessage}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={isSubmitting} style={{ marginTop: '12px', padding: '12px' }}>
            {isSubmitting ? 'Enviando credenciamento...' : 'Enviar para Moderação'}
          </button>
        </form>
      </div>
    </main>
  )
}

function OrganizationLoginBlocked({ onResubmit, onBack }: { onResubmit: () => void; onBack: () => void }) {
  return <div style={{ padding: 40 }}>Bloqueado. <button onClick={onResubmit}>Reenviar</button> <button onClick={onBack}>Voltar</button></div>
}

function LoginError({ code }: { code: LoginErrorCode }) {
  let friendlyMessage = `Erro ao entrar (${code})`
  if (code === 'not-found' || code === 'invalid-credential') {
    friendlyMessage = 'E-mail, CNPJ ou senha incorretos. Verifique os dados inseridos.'
  } else if (code === 'invalid-identifier') {
    friendlyMessage = 'Por favor, informe um CNPJ ou e-mail válido.'
  } else if (code === 'too-many-requests') {
    friendlyMessage = 'Muitas tentativas incorretas. Tente novamente mais tarde.'
  } else if (code === 'disabled') {
    friendlyMessage = 'Esta conta foi desativada temporariamente.'
  }

  return (
    <div className="login-error" style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>
      {friendlyMessage}
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
  const [searchQuery, setSearchQuery] = useState('')

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('weanimals_reports')
    return saved ? JSON.parse(saved) : initialReports
  })
  const [selectedReportId, setSelectedReportId] = useState<any>(() => reports[0]?.id ?? 4468)

  const [animals, setAnimals] = useState<AnimalItem[]>(() => {
    const saved = localStorage.getItem('weanimals_animals')
    return saved ? JSON.parse(saved) : initialAnimals
  })
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(() => animals[0]?.id ?? 'ani-1')

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('weanimals_candidates')
    return saved ? JSON.parse(saved) : initialCandidates
  })

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    const saved = localStorage.getItem('weanimals_posts')
    return saved ? JSON.parse(saved) : initialPosts
  })

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(() => {
    const saved = localStorage.getItem('weanimals_checkins')
    return saved ? JSON.parse(saved) : initialCheckIns
  })
  const [selectedCheckInId, setSelectedCheckInId] = useState<string>(() => checkIns[0]?.id ?? 'chk-1')

  const [profile, setProfile] = useState<OrganizationProfile & { isVerified?: boolean }>(() => {
    const saved = localStorage.getItem('weanimals_profile')
    return saved
      ? JSON.parse(saved)
      : {
          name: user.displayName || 'Abrigo Esperança',
          cnpj: '00.000.000/0001-00',
          email: user.email || 'contato@abrigoesperanca.org',
          pixKey: user.email || 'doacoes@abrigoesperanca.org',
          responsibleName: 'Responsável (Pendente)',
          verifiedAt: '12/03/2025',
          isVerified: true,
        }
  })

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'n1',
      type: 'urgent',
      title: 'Sistema Ativo',
      message: 'Persistência local e notificações ativadas.',
      timeAgo: 'Agora',
      read: false,
      targetSection: 'home',
    },
  ])

  useEffect(() => {
    const unsubscribeReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      if (!snapshot.empty) {
        const realReports = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data()
          
          let panelPriority = 'Normal'
          let panelPriorityClass = 'normal'
          
          if (data.urgency === 'Alta' || data.urgency === 'high') {
            panelPriority = 'Muito urgente'
            panelPriorityClass = 'very-urgent'
          } else if (data.urgency === 'Média' || data.urgency === 'medium') {
            panelPriority = 'Urgente'
            panelPriorityClass = 'urgent'
          }

          const animal = data.animalType === 'dog' ? 'Cão' : data.animalType === 'cat' ? 'Gato' : data.animalType || 'Animal'
          const title = data.title || `${animal} em perigo`

          return {
            ...data,
            // Garante ID único combinando protocolo e id do doc do Firebase
            id: docSnap.id || data.id || data.protocolNumber || `rep-${index}`,
            title: title,
            priority: panelPriority,
            priorityClass: panelPriorityClass,
            status: data.status || 'novo',
            reporter: data.userName || data.reporter || 'Cidadão Anônimo',
            description: data.description || 'Sem descrição detalhada.',
            location: data.locationLabel || data.location || 'Localização via GPS',
            address: data.address || 'Endereço não informado',
            coordinates: { 
              lat: data.latitude || -23.5505,
              lng: data.longitude || -46.6333 
            },
            elapsed: data.elapsed || 'Recente',
            chat: data.chat || []
          }
        }) as any
        setReports(realReports)
      } else {
        setReports([])
      }
    })

    const unsubscribeAnimals = onSnapshot(collection(db, 'animals'), (snapshot) => {
      if (!snapshot.empty) {
        const realAnimals = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as AnimalItem[]
        setAnimals(realAnimals)
      }
    })

    const unsubscribeCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      if (!snapshot.empty) {
        const realCandidates = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as Candidate[]
        setCandidates(realCandidates)
      }
    })

    const unsubscribePosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      if (!snapshot.empty) {
        const realPosts = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as CommunityPost[]
        setPosts(realPosts)
      }
    })

    const unsubscribeCheckIns = onSnapshot(collection(db, 'checkins'), (snapshot) => {
      if (!snapshot.empty) {
        const realCheckIns = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as CheckInRecord[]
        setCheckIns(realCheckIns)
      }
    })

    const unsubscribeOrg = onSnapshot(doc(db, 'organizations', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const orgData = docSnap.data()
        setProfile((prev) => ({
          ...prev,
          name: orgData.name ?? prev.name,
          cnpj: orgData.cnpj ?? prev.cnpj,
          email: orgData.email ?? prev.email,
          pixKey: orgData.pixKey ?? prev.pixKey,
          responsibleName: orgData.responsibleName ?? prev.responsibleName,
          isVerified: orgData.isVerified ?? prev.isVerified,
        }))
      }
    })

    return () => {
      unsubscribeReports()
      unsubscribeAnimals()
      unsubscribeCandidates()
      unsubscribePosts()
      unsubscribeCheckIns()
      unsubscribeOrg()
    }
  }, [user.uid])

  useEffect(() => {
    localStorage.setItem('weanimals_reports', JSON.stringify(reports))
  }, [reports])

  useEffect(() => {
    localStorage.setItem('weanimals_animals', JSON.stringify(animals))
  }, [animals])

  useEffect(() => {
    localStorage.setItem('weanimals_candidates', JSON.stringify(candidates))
  }, [candidates])

  useEffect(() => {
    localStorage.setItem('weanimals_posts', JSON.stringify(posts))
  }, [posts])

  useEffect(() => {
    localStorage.setItem('weanimals_checkins', JSON.stringify(checkIns))
  }, [checkIns])

  useEffect(() => {
    localStorage.setItem('weanimals_profile', JSON.stringify(profile))
  }, [profile])

  function handleLogout() {
    localStorage.removeItem('weanimals_profile')
    localStorage.removeItem('weanimals_reports')
    localStorage.removeItem('weanimals_animals')
    localStorage.removeItem('weanimals_candidates')
    localStorage.removeItem('weanimals_posts')
    localStorage.removeItem('weanimals_checkins')
    onLogout()
  }

  function pushNotification(title: string, message: string, targetSection: DashboardSection, type: AppNotification['type'] = 'info') {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      timeAgo: 'Agora',
      read: false,
      targetSection,
    }
    setNotifications((prev) => [newNotif, ...prev])
  }

  async function handleUpdateReportStatus(reportId: any, status: ReportStatus) {
    let updatedReport: Report | undefined

    setReports((current) =>
      current.map((report) => {
        if (report.id === reportId) {
          updatedReport = { ...report, status, elapsed: 'atualizado agora' }
          return updatedReport
        }
        return report
      }),
    )
    pushNotification('Denúncia Atualizada', `O status da denúncia mudou para "${status}".`, 'reports', 'urgent')

    try {
      const reportRef = doc(db, 'reports', String(reportId))
      if (updatedReport) {
        await setDoc(reportRef, updatedReport, { merge: true })
      } else {
        await setDoc(reportRef, { status, elapsed: 'atualizado agora' }, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao atualizar status da denúncia no Firebase:', error)
    }
  }

  async function handleSendReportMessage(reportId: any, text: string) {
    const novaMensagem = {
      id: `msg-${Date.now()}`,
      text,
      mine: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    let updatedReport: Report | undefined

    setReports((current) =>
      current.map((report) => {
        if (report.id === reportId) {
          updatedReport = {
            ...report,
            chat: [...(report.chat || []), novaMensagem],
          }
          return updatedReport
        }
        return report
      }),
    )

    try {
      const reportRef = doc(db, 'reports', String(reportId))
      if (updatedReport) {
        await setDoc(reportRef, updatedReport, { merge: true })
      } else {
        await updateDoc(reportRef, { chat: arrayUnion(novaMensagem) })
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem para o Firebase:', error)
    }
  }

  async function handleAddAnimal(newAnimal: Omit<AnimalItem, 'id'>) {
    const tempId = `ani-${Date.now()}`
    const animalWithId: AnimalItem = { id: tempId, ...newAnimal }

    setAnimals((prev) => [animalWithId, ...prev])
    setSelectedAnimalId(tempId)
    pushNotification('Novo Animal', `${newAnimal.name} foi cadastrado para adoção.`, 'animals', 'adoption')

    try {
      await setDoc(doc(db, 'animals', tempId), animalWithId)
    } catch (error) {
      console.error('Erro ao adicionar animal no Firebase:', error)
    }
  }

  async function handleUpdateCandidateStatus(candidateId: string, status: CandidateStatus, justificationText?: string) {
    let updatedCandidate: Candidate | undefined
    let generatedCheckIn: CheckInRecord | undefined

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          updatedCandidate = {
            ...c,
            status,
            ...(justificationText ? { justification: justificationText } : {}),
          }
          if (status === 'aprovado') {
            const animalObj = animals.find((a) => a.id === c.animalId)
            generatedCheckIn = {
              id: `chk-${Date.now()}`,
              animal: animalObj ? animalObj.name : 'Pet',
              adopter: c.name,
              currentDays: 30,
              status: 'Ótima',
              reviewed: false,
              reportsByPeriod: {
                30: [{ label: 'Adaptação inicial (30d)', value: 'Adoção recém-aprovada' }],
                90: [{ label: 'Status (90d)', value: 'Aguardando prazo' }],
                180: [{ label: 'Status (180d)', value: 'Aguardando prazo' }],
              },
            }
          }
          return updatedCandidate
        }
        return c
      }),
    )

    if (generatedCheckIn) {
      const checkInToSave = generatedCheckIn
      setCheckIns((chkPrev) => [checkInToSave, ...chkPrev])
      pushNotification('Adoção Aprovada!', `Check-in de 30 dias gerado para ${checkInToSave.adopter}.`, 'checkins', 'checkin')
    }

    try {
      if (updatedCandidate) {
        await setDoc(doc(db, 'candidates', candidateId), updatedCandidate, { merge: true })
      }
      if (generatedCheckIn) {
        await setDoc(doc(db, 'checkins', generatedCheckIn.id), generatedCheckIn)
      }
    } catch (error) {
      console.error('Erro ao atualizar candidato no Firebase:', error)
    }
  }

  async function handleSaveCommunityPost(postData: any) {
    if (postData.id) {
      let updatedPost: CommunityPost | undefined
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postData.id) {
            updatedPost = {
              ...p,
              title: postData.title,
              type: postData.type,
              categoryLabel: postData.categoryLabel,
              description: postData.description,
              progressText: postData.progressText,
            }
            return updatedPost
          }
          return p
        }),
      )
      try {
        if (updatedPost) {
          await setDoc(doc(db, 'posts', postData.id), updatedPost, { merge: true })
        }
      } catch (error) {
        console.error('Erro ao editar post no Firebase:', error)
      }
    } else {
      const newPost: CommunityPost = {
        id: `post-${Date.now()}`,
        author: profile.name,
        isOwn: true,
        type: postData.type,
        categoryLabel: postData.categoryLabel,
        title: postData.title,
        description: postData.description,
        progressText: postData.progressText,
        progressPct: 10,
        subscribers: [],
        likes: 0,
        commentsList: [],
        elapsed: 'agora',
      }
      setPosts((prev) => [newPost, ...prev])
      pushNotification('Nova Campanha', `"${postData.title}" foi publicada na comunidade.`, 'community', 'info')

      try {
        await setDoc(doc(db, 'posts', newPost.id), newPost)
      } catch (error) {
        console.error('Erro ao criar post no Firebase:', error)
      }
    }
  }

  async function handleDeleteCommunityPost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    try {
      await deleteDoc(doc(db, 'posts', id))
    } catch (error) {
      console.error('Erro ao excluir post no Firebase:', error)
    }
  }

  async function handleLikeCommunityPost(id: string) {
    let updatedPost: CommunityPost | undefined
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedPost = { ...p, likes: (p.likes ?? 0) + 1 }
          return updatedPost
        }
        return p
      }),
    )
    try {
      if (updatedPost) {
        await setDoc(doc(db, 'posts', id), updatedPost, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao curtir post no Firebase:', error)
    }
  }

  async function handleAddPostComment(postId: string, text: string) {
    const newComment = {
      id: `c-${Date.now()}`,
      author: profile.name,
      text,
      timeAgo: 'agora',
    }
    let updatedPost: CommunityPost | undefined

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          updatedPost = {
            ...p,
            commentsList: [...(p.commentsList ?? []), newComment],
          }
          return updatedPost
        }
        return p
      }),
    )

    try {
      if (updatedPost) {
        await setDoc(doc(db, 'posts', postId), updatedPost, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao comentar post no Firebase:', error)
    }
  }

  async function handleAddCampaignSubscriber(postId: string, subscriber: { name: string; contact: string; detail: string }) {
    const newSub = {
      id: `sub-${Date.now()}`,
      name: subscriber.name,
      contact: subscriber.contact,
      detail: subscriber.detail,
      status: 'Confirmado',
    }
    let updatedPost: CommunityPost | undefined

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          updatedPost = {
            ...p,
            subscribers: [...(p.subscribers ?? []), newSub],
          }
          return updatedPost
        }
        return p
      }),
    )

    try {
      if (updatedPost) {
        await setDoc(doc(db, 'posts', postId), updatedPost, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao adicionar inscrito no Firebase:', error)
    }
  }

  async function handleMarkCheckInReviewed(id: string) {
    let updatedCheckIn: CheckInRecord | undefined
    setCheckIns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedCheckIn = { ...c, reviewed: true }
          return updatedCheckIn
        }
        return c
      }),
    )
    try {
      if (updatedCheckIn) {
        await setDoc(doc(db, 'checkins', id), updatedCheckIn, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao revisar check-in no Firebase:', error)
    }
  }

  const selectedReport =
    reports.find((r) => r.id === selectedReportId) ?? reports[0]

  const badges = {
    reports: reports.filter((r) => r.status !== 'Encaminhado a abrigo').length,
    animals: candidates.filter((c) => c.status === 'pendente').length,
    checkins: checkIns.filter((c) => !c.reviewed).length,
  }

  function handleMarkNotificationsAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <DashboardLayout
      user={user}
      organizationName={profile.name}
      organizationEmail={profile.email}
      isVerified={profile.isVerified ?? true}
      currentSection={section}
      notifications={notifications}
      badges={badges}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNavigate={setSection}
      onLogout={handleLogout}
      onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
    >
      {section === 'home' && (
        <Home
          reports={reports}
          animals={animals}
          candidates={candidates}
          checkIns={checkIns}
          onOpenReport={(id) => {
            setSelectedReportId(id)
            setSection('reports')
          }}
          onOpenCandidates={(animalId) => {
            if (animalId) setSelectedAnimalId(animalId)
            setSection('animals')
          }}
          onOpenCheckIns={(checkInId) => {
            if (checkInId) setSelectedCheckInId(checkInId)
            setSection('checkins')
          }}
        />
      )}
      {section === 'reports' && (
        <Reports
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReportId}
          onUpdateStatus={handleUpdateReportStatus}
          onSendMessage={handleSendReportMessage}
        />
      )}
      {section === 'community' && (
        <Community
          posts={posts}
          onSavePost={handleSaveCommunityPost}
          onDeletePost={handleDeleteCommunityPost}
          onLikePost={handleLikeCommunityPost}
          onAddComment={handleAddPostComment}
          onAddSubscriber={handleAddCampaignSubscriber}
        />
      )}
      {section === 'animals' && (
        <Animals
          animals={animals}
          candidates={candidates}
          selectedAnimalId={selectedAnimalId}
          onSelectAnimal={setSelectedAnimalId}
          onAddAnimal={handleAddAnimal}
          onUpdateCandidateStatus={handleUpdateCandidateStatus}
        />
      )}
      {section === 'checkins' && (
        <CheckIns
          checkIns={checkIns}
          selectedCheckInId={selectedCheckInId}
          onSelectCheckIn={setSelectedCheckInId}
          onMarkReviewed={handleMarkCheckInReviewed}
        />
      )}
      {section === 'profile' && (
        <Profile
          profile={profile}
          onUpdateProfile={async (updated) => {
            setProfile(updated)
            pushNotification('Perfil Atualizado', 'Os dados institucionais foram salvos no sistema.', 'profile', 'info')
            
            try {
              await setDoc(doc(db, 'organizations', user.uid), {
                name: updated.name,
                cnpj: updated.cnpj,
                email: updated.email,
                pixKey: updated.pixKey,
                responsibleName: updated.responsibleName
              }, { merge: true })
            } catch (error) {
              console.error('Erro ao atualizar perfil no Firebase:', error)
            }
          }}
          onLogout={handleLogout}
        />
      )}
    </DashboardLayout>
  )
}

export default App
