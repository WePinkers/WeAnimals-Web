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
  addDoc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion 
} from 'firebase/firestore'
import './App.css'
import { auth, db } from './firebase'
import {
  isOrganizationLoginMutationInProgress,
  OrganizationAuthError,
  signInOrganization,
} from './organizationAuth'
import {
  isOrganizationAuthMutationInProgress,
  submitOrganizationAccreditation,
} from './organizationAccreditation'

import { DashboardLayout } from './layouts/DashboardLayout'
import { Home } from './pages/Home'
import { Reports } from './pages/Reports'
import { Community } from './pages/Community'
import { Animals } from './pages/Animals'
import { CheckIns } from './pages/CheckIns'
import { Profile } from './pages/Profile'
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
} from './types'

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
  {
    id: 4455,
    priority: 'Urgente',
    priorityClass: 'urgent',
    title: 'Gato ferido',
    location: 'Centro',
    address: 'Av. XV de Novembro, 210 — Centro',
    coordinates: { lat: -23.5505, lng: -46.6333 },
    status: 'Resgate',
    reporter: 'João P.',
    reporterSince: 'jan 2026',
    reporterTotalReports: 3,
    reporterReliability: 89,
    elapsed: 'há 3 h',
    triage: {
      immediateRisk: 'Sim',
      activeAbuse: 'Não',
      trappedOrInjured: 'Sim',
      streetNoRisk: 'Não',
      photoName: 'foto-gato-centro.jpg',
    },
    chat: [],
  },
  {
    id: 4440,
    priority: 'Urgente',
    priorityClass: 'urgent',
    title: 'Cães em terreno baldio',
    location: 'Jardim Matarazzo',
    address: 'Rua das Palmeiras, 412 — Jardim Matarazzo',
    coordinates: { lat: -23.4981, lng: -46.4758 },
    status: 'Equipe acionada',
    reporter: 'Marta N.',
    reporterSince: 'nov 2024',
    reporterTotalReports: 9,
    reporterReliability: 97,
    elapsed: 'ontem',
    triage: {
      immediateRisk: 'Não',
      activeAbuse: 'Sim',
      trappedOrInjured: 'Não',
      streetNoRisk: 'Não',
      photoName: 'foto-terreno-baldio.jpg',
    },
    chat: [],
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
  {
    id: 'ani-2',
    name: 'Girassol',
    description: 'Felino · filhote',
    size: 'Pequeno',
    arrivalDate: '2026-06-01',
    traits: ['Vacinada'],
    requirements: ['Maior de 18 anos', 'Apartamento telado'],
    photos: [],
  },
  {
    id: 'ani-3',
    name: 'Beethoven',
    description: 'SRD · 4 anos',
    size: 'Grande',
    arrivalDate: '2026-02-19',
    traits: ['Vacinada', 'Castrada'],
    requirements: ['Maior de 18 anos', 'Quintal murado'],
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
  {
    id: 'cand-2',
    animalId: 'ani-1',
    name: 'João Paulo',
    pct: 58,
    location: 'Centro',
    summary: 'primeiro pet · apartamento compacto · híbrido',
    status: 'pendente',
    answers: [
      { question: 'Rotina', answer: 'Trabalho híbrido (3x presencial)' },
      { question: 'Espaço', answer: 'Apartamento sem varanda' },
      { question: 'Já teve animais?', answer: 'Não' },
    ],
  },
  {
    id: 'cand-3',
    animalId: 'ani-1',
    name: 'Marta Nunes',
    pct: 41,
    location: 'Jardim Matarazzo',
    summary: 'casa com quintal · ausente 8h/dia',
    status: 'pendente',
    answers: [
      { question: 'Rotina', answer: 'Presencial 8h por dia' },
      { question: 'Espaço', answer: 'Casa com quintal amplo' },
      { question: 'Já teve animais?', answer: 'Sim' },
    ],
  },
  {
    id: 'cand-4',
    animalId: 'ani-2',
    name: 'Lucas Andrade',
    pct: 82,
    location: 'Centro',
    summary: 'apto 100% telado · home office · já tem 1 gato dócil',
    status: 'pendente',
    answers: [
      { question: 'Rotina', answer: 'Home office' },
      { question: 'Espaço', answer: 'Apartamento telado' },
      { question: 'Já teve animais?', answer: 'Sim, 1 gato castrado' },
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
    subscribers: [
      {
        id: 'sub-1',
        name: 'Renata Ferreira',
        contact: '(11) 99812-3344',
        detail: '1 cão (porte médio) · Horário 08h30',
        status: 'Confirmado',
      },
    ],
  },
  {
    id: 'post-2',
    author: 'Abrigo Esperança',
    isOwn: true,
    type: 'Campanha',
    categoryLabel: 'Doação',
    title: 'Ração e cobertores',
    description: 'Até 30 de setembro',
    progressText: 'R$ 2.340 de R$ 5.000',
    progressPct: 47,
    subscribers: [],
  },
  {
    id: 'post-3',
    author: 'Marta Nunes',
    isOwn: false,
    type: 'Post',
    categoryLabel: 'Post',
    title: 'Marta Nunes',
    description: 'Achei essa gatinha perto da praça, sem coleira. Alguém reconhece?',
    likes: 18,
    elapsed: 'há 2h',
    commentsList: [
      {
        id: 'c-1',
        author: 'Renata Ferreira',
        text: 'Vi um cartaz parecido perto da padaria central!',
        timeAgo: 'há 1h',
      },
    ],
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
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      if (
        isOrganizationAuthMutationInProgress() ||
        isOrganizationLoginMutationInProgress()
      ) {
        return
      }
      setUser(nextUser?.isAnonymous ? null : nextUser)
      setCheckingSession(false)
    })
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

  async function handleRecovery(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch {
      setSent(true)
    }
  }

  return (
    <main className="login-page">
      <section className="login-form-panel" style={{ margin: 'auto' }}>
        <div className="login-card">
          <button type="button" className="back-login-button" onClick={onBack}>
            &larr; Voltar para o login
          </button>
          {!sent ? (
            <form className="login-form" onSubmit={handleRecovery}>
              <h2>Redefinir senha</h2>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail institucional"
              />
              <button className="primary-button" type="submit">Enviar link</button>
            </form>
          ) : (
            <div>Verifique seu e-mail para redefinir a senha.</div>
          )}
        </div>
      </section>
    </main>
  )
}

function OrganizationAccreditation({ onBack }: { onBack: () => void }) {
  const [cnpj, setCnpj] = useState('')
  const [legalName, setLegalName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pixKey, setPixKey] = useState('')
  
  const [cnpjFile, setCnpjFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [bylawsFile, setBylawsFile] = useState<File | null>(null)
  const [addressFile, setAddressFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!cnpjFile || !idFile || !addressFile) return
    try {
      await submitOrganizationAccreditation({
        cnpj,
        legalName,
        institutionalEmail: email,
        password,
        documentName: cnpjFile.name,
        documentSizeBytes: cnpjFile.size,
        documentContentType: cnpjFile.type,
        pixKey,
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <main className="login-page" style={{ display: 'grid', placeItems: 'center', padding: '20px' }}>
        <div className="login-card" style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '480px', width: '100%' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '12px' }}>Credenciamento enviado!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Os seus documentos foram enviados para análise da moderação. Entraremos em contato em breve.
          </p>
          <button className="primary-button" onClick={onBack} style={{ width: '100%' }}>Voltar para o login</button>
        </div>
      </main>
    )
  }

  return (
    <main className="login-page" style={{ padding: '40px 20px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div className="login-card" style={{ background: '#fff', padding: '36px', borderRadius: '16px', maxWidth: '640px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '13px' }}
        >
          &larr; Voltar para o login
        </button>

        <h2 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '6px' }}>Solicitar credenciamento</h2>
        <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px' }}>
          Preencha os dados institucionais e envie os documentos obrigatórios para validação da ONG.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>CNPJ ou Registro</div>
            <input
              type="text"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={e => setCnpj(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>Razão Social / Nome da ONG</div>
            <input
              type="text"
              placeholder="Ex: Abrigo Esperança"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>E-mail institucional</div>
            <input
              type="email"
              placeholder="contato@ong.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>Senha de acesso</div>
            <input
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>Chave Pix para doações</div>
            <input
              type="text"
              placeholder="CNPJ, e-mail ou chave aleatória"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>
              1. CNPJ Ativo ou Comprovante de Registro <span style={{ color: 'red' }}>*</span>
            </div>
            <input
              type="file"
              onChange={e => setCnpjFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {cnpjFile && <small style={{ color: '#166534', display: 'block', marginTop: '4px' }}>Selecionado: {cnpjFile.name}</small>}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>
              2. Documento de Identidade e CPF do Responsável <span style={{ color: 'red' }}>*</span>
            </div>
            <input
              type="file"
              onChange={e => setIdFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {idFile && <small style={{ color: '#166534', display: 'block', marginTop: '4px' }}>Selecionado: {idFile.name}</small>}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>
              3. Estatuto Social / Ata da Diretoria (Opcional)
            </div>
            <input
              type="file"
              onChange={e => setBylawsFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            {bylawsFile && <small style={{ color: '#166534', display: 'block', marginTop: '4px' }}>Selecionado: {bylawsFile.name}</small>}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px', textTransform: 'uppercase' }}>
              4. Comprovante de Endereço Recente da Sede <span style={{ color: 'red' }}>*</span>
            </div>
            <input
              type="file"
              onChange={e => setAddressFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {addressFile && <small style={{ color: '#166534', display: 'block', marginTop: '4px' }}>Selecionado: {addressFile.name}</small>}
          </div>

          <button className="primary-button" type="submit" style={{ marginTop: '12px' }}>
            Enviar para Moderação
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
  return <div className="login-error">Erro ao entrar ({code})</div>
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
  const [selectedReportId, setSelectedReportId] = useState<number>(() => reports[0]?.id ?? 4468)

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
          responsibleName: 'Renata Ferreira',
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
        const realReports = snapshot.docs.map(doc => ({
          id: Number(doc.id) || doc.data().id,
          ...doc.data()
        })) as Report[]
        setReports(realReports)
      }
    })

    const unsubscribeAnimals = onSnapshot(collection(db, 'animals'), (snapshot) => {
      if (!snapshot.empty) {
        const realAnimals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AnimalItem[]
        setAnimals(realAnimals)
      }
    })

    const unsubscribeCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      if (!snapshot.empty) {
        const realCandidates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Candidate[]
        setCandidates(realCandidates)
      }
    })

    const unsubscribePosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      if (!snapshot.empty) {
        const realPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CommunityPost[]
        setPosts(realPosts)
      }
    })

    const unsubscribeCheckIns = onSnapshot(collection(db, 'checkins'), (snapshot) => {
      if (!snapshot.empty) {
        const realCheckIns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CheckInRecord[]
        setCheckIns(realCheckIns)
      }
    })

    return () => {
      unsubscribeReports()
      unsubscribeAnimals()
      unsubscribeCandidates()
      unsubscribePosts()
      unsubscribeCheckIns()
    }
  }, [])

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

  // --- FUNÇÕES DE ESCRITA NO FIRESTORE ---

  async function handleUpdateReportStatus(reportId: number, status: ReportStatus) {
    try {
      const reportRef = doc(db, 'reports', String(reportId))
      await updateDoc(reportRef, { status, elapsed: 'atualizado agora' })
      pushNotification('Denúncia Atualizada', `O status da denúncia #${reportId} mudou para "${status}".`, 'reports', 'urgent')
    } catch (error) {
      console.error('Erro ao atualizar status da denúncia:', error)
    }
  }

  async function handleSendReportMessage(reportId: number, text: string) {
    try {
      const reportRef = doc(db, 'reports', String(reportId))
      const novaMensagem = {
        id: `msg-${Date.now()}`,
        text,
        mine: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      await updateDoc(reportRef, {
        chat: arrayUnion(novaMensagem)
      })
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  async function handleAddAnimal(newAnimal: Omit<AnimalItem, 'id'>) {
    try {
      await addDoc(collection(db, 'animals'), newAnimal)
      pushNotification('Novo Animal', `${newAnimal.name} foi cadastrado para adoção.`, 'animals', 'adoption')
    } catch (error) {
      console.error('Erro ao adicionar animal:', error)
    }
  }

  async function handleUpdateCandidateStatus(candidateId: string, status: CandidateStatus, justificationText?: string) {
    try {
      const candidateRef = doc(db, 'candidates', candidateId)
      const updateData: any = { status }
      if (justificationText) updateData.justification = justificationText

      await updateDoc(candidateRef, updateData)

      if (status === 'aprovado') {
        const c = candidates.find((cand) => cand.id === candidateId)
        if (c) {
          const animalObj = animals.find((a) => a.id === c.animalId)
          await addDoc(collection(db, 'checkins'), {
            animal: animalObj ? animalObj.name : 'Pet',
            adopter: c.name,
            currentDays: 30,
            status: 'Ótima',
            reviewed: false,
            reportsByPeriod: {
              30: [{ label: 'Adaptação inicial (30d)', value: 'Adoção recém-aprovada' }],
              90: [{ label: 'Status (90d)', value: 'Aguardando prazo' }],
              180: [{ label: 'Status (180d)', value: 'Aguardando prazo' }],
            }
          })
          pushNotification('Adoção Aprovada!', `Check-in de 30 dias gerado para ${c.name}.`, 'checkins', 'checkin')
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar candidato:', error)
    }
  }

  async function handleSaveCommunityPost(postData: any) {
    try {
      if (postData.id) {
        const postRef = doc(db, 'posts', postData.id)
        await updateDoc(postRef, {
          title: postData.title,
          type: postData.type,
          categoryLabel: postData.categoryLabel,
          description: postData.description,
          progressText: postData.progressText,
        })
      } else {
        const newPost = {
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
        await addDoc(collection(db, 'posts'), newPost)
        pushNotification('Nova Campanha', `"${postData.title}" foi publicada na comunidade.`, 'community', 'info')
      }
    } catch (error) {
      console.error('Erro ao salvar post:', error)
    }
  }

  async function handleDeleteCommunityPost(id: string) {
    try {
      await deleteDoc(doc(db, 'posts', id))
    } catch (error) {
      console.error('Erro ao excluir post:', error)
    }
  }

  async function handleLikeCommunityPost(id: string) {
    try {
      const postRef = doc(db, 'posts', id)
      const post = posts.find((p) => p.id === id)
      if (post) {
        await updateDoc(postRef, { likes: (post.likes ?? 0) + 1 })
      }
    } catch (error) {
      console.error('Erro ao curtir post:', error)
    }
  }

  async function handleAddPostComment(postId: string, text: string) {
    try {
      const postRef = doc(db, 'posts', postId)
      await updateDoc(postRef, {
        commentsList: arrayUnion({
          id: `c-${Date.now()}`,
          author: profile.name,
          text,
          timeAgo: 'agora',
        })
      })
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
    }
  }

  async function handleAddCampaignSubscriber(postId: string, subscriber: { name: string; contact: string; detail: string }) {
    try {
      const postRef = doc(db, 'posts', postId)
      await updateDoc(postRef, {
        subscribers: arrayUnion({
          id: `sub-${Date.now()}`,
          name: subscriber.name,
          contact: subscriber.contact,
          detail: subscriber.detail,
          status: 'Confirmado',
        })
      })
    } catch (error) {
      console.error('Erro ao adicionar inscrito:', error)
    }
  }

  async function handleMarkCheckInReviewed(id: string) {
    try {
      const checkinRef = doc(db, 'checkins', id)
      await updateDoc(checkinRef, { reviewed: true })
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error)
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
      onLogout={onLogout}
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
          onUpdateProfile={(updated) => {
            setProfile(updated)
            pushNotification('Perfil Atualizado', 'Os dados institucionais foram salvos.', 'profile', 'info')
          }}
          onLogout={onLogout}
        />
      )}
    </DashboardLayout>
  )
}

export default App