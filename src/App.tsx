import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth'
import './App.css'
import { auth } from './firebase'
import {
  isOrganizationLoginMutationInProgress,
  OrganizationAuthError,
  signInOrganization,
} from './organizationAuth'
import {
  isOrganizationAuthMutationInProgress,
  OrganizationAccreditationError,
  submitOrganizationAccreditation,
} from './organizationAccreditation'

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

  // A autenticação fica reservada para a próxima etapa; o protótipo abre direto.
  void OrganizationLogin
  const previewUser = {
    displayName: 'Abrigo Esperança',
    email: 'contato@abrigoesperanca.org',
  } as User

  void previewUser
  return user ? (
    <OrganizationDashboard user={user} onLogout={() => signOut(auth)} />
  ) : (
    <OrganizationLogin onAuthenticated={setUser} />
  )
}

function formatOrganizationIdentifier(value: string) {
  if (/[a-zA-Z@]/.test(value)) {
    return value
  }

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

  if (showRecovery) {
    return <PasswordRecovery onBack={() => setShowRecovery(false)} />
  }

  if (showAccreditation) {
    return <OrganizationAccreditation onBack={() => setShowAccreditation(false)} />
  }

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
          <img
            className="brand-silhouette"
            src="/weanimals-entry-silhouette.png"
            alt=""
          />
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
            <img
              className="brand-silhouette"
              src="/weanimals-entry-silhouette.png"
              alt=""
            />
            <span>WeAnimals</span>
          </div>
          <div className="login-heading">
            <span className="eyebrow">ACESSO INSTITUCIONAL</span>
            <h2>Bem-vinda ao painel</h2>
            <p className="login-audience">
              Acesso para ONGs, abrigos e administradores.
            </p>
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
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
          <div className="login-divider"><span>ou</span></div>
          <p className="credential-prompt">
            Sua entidade &eacute; nova aqui?
            <button
              type="button"
              className="credential-button"
              onClick={() => setShowAccreditation(true)}
            >
              Solicitar credenciamento
            </button>
          </p>
          <div className="login-note">
            <span className="lock-icon" aria-hidden="true">◈</span>
            Acesso protegido e exclusivo para organizações credenciadas.
          </div>
        </div>
      </section>
      {isSubmitting && <LoginLoadingOverlay />}
    </main>
  )
}

function LoginLoadingOverlay() {
  return (
    <div className="login-loading-overlay" role="status" aria-live="polite">
      <div className="login-loading-content">
        <div className="login-loading-logo" aria-hidden="true">
          <img src="/weanimals-entry-silhouette.png" alt="" />
          <img className="login-loading-logo-active" src="/weanimals-entry-silhouette.png" alt="" />
        </div>
        <strong>Entrando&hellip;</strong>
      </div>
    </div>
  )
}

function PasswordRecovery({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Informe um e-mail válido.')
      return
    }

    setIsSubmitting(true)
    try {
      auth.languageCode = 'pt-BR'
      const continueUrl = new URL(
        '/password-reset-complete',
        window.location.origin,
      )
      continueUrl.searchParams.set('account', 'organization')

      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: continueUrl.toString(),
        handleCodeInApp: false,
      })
      setSent(true)
    } catch (failure) {
      const code = (failure as { code?: string }).code
      console.error('Password reset failed', failure)
      if (
        code === 'auth/unauthorized-continue-uri' ||
        code === 'auth/invalid-continue-uri'
      ) {
        setError('O endereco de recuperacao nao esta autorizado no Firebase.')
        return
      }
      if (code === 'auth/operation-not-allowed') {
        setError('A redefinicao por e-mail esta desativada no Firebase.')
        return
      }
      if (code === 'auth/network-request-failed') {
        setError('Nao foi possivel conectar ao Firebase. Verifique a internet.')
        return
      }
      setError(
        code === 'auth/user-not-found'
          ? 'Não encontramos uma conta com esse e-mail.'
          : 'Não foi possível enviar o link agora. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <img
            className="brand-silhouette"
            src="/weanimals-entry-silhouette.png"
            alt=""
          />
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar tamb&eacute;m &eacute; organizar o atendimento.</h1>
          <p>
            Acompanhe den&uacute;ncias, atualize ocorr&ecirc;ncias e ajude cada animal a
            encontrar prote&ccedil;&atilde;o.
          </p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de prote&ccedil;&atilde;o animal
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <img
              className="brand-silhouette"
              src="/weanimals-entry-silhouette.png"
              alt=""
            />
            <span>WeAnimals</span>
          </div>
          <button type="button" className="back-login-button" onClick={onBack}>
            &larr; Voltar para o login
          </button>

          {!sent ? (
            <>
              <div className="login-heading">
                <span className="eyebrow">RECUPERA&Ccedil;&Atilde;O DE ACESSO</span>
                <h2>Redefinir senha</h2>
                <p>
                  Informe o e-mail institucional cadastrado para receber o link
                  de redefini&ccedil;&atilde;o.
                </p>
              </div>
              <form className="login-form" onSubmit={handleRecovery}>
                <label htmlFor="recovery-email">
                  E-mail institucional
                  <input
                    id="recovery-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="contato@suaong.org"
                    autoComplete="email"
                    autoFocus
                  />
                </label>
                {error && (
                  <div className="login-error" role="alert">
                    <span aria-hidden="true">!</span>
                    {error}
                  </div>
                )}
                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="button-spinner" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="recovery-success">
              <span className="recovery-success-icon" aria-hidden="true">&#10003;</span>
              <span className="eyebrow">LINK ENVIADO</span>
              <h2>Verifique seu e-mail</h2>
              <p>
                Enviamos as instru&ccedil;&otilde;es para <strong>{email}</strong>.
              </p>
              <button type="button" className="primary-button" onClick={onBack}>
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </section>
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
  const [documentName, setDocumentName] = useState('')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openLegalDocument, setOpenLegalDocument] = useState<
    'terms' | 'privacy' | null
  >(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setSubmitted(false)

    if (cnpj.replace(/\D/g, '').length !== 14) {
      setFormError('Informe um CNPJ v\u00e1lido.')
      return
    }
    if (!legalName.trim()) {
      setFormError('Informe a razÃ£o social ou o nome do abrigo.')
      return
    }
    if (!responsibleName.trim()) {
      setFormError('Informe o nome completo do responsavel legal.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError('Informe um e-mail institucional vÃ¡lido.')
      return
    }
    if (password.length < 8) {
      setFormError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!documentName) {
      setFormError('Anexe o estatuto, alvarÃ¡ ou outro documento.')
      return
    }
    if (!documentFile) {
      setFormError('Selecione um documento para continuar.')
      return
    }
    if (documentFile.size > 10 * 1024 * 1024) {
      setFormError('O documento deve ter no maximo 10 MB.')
      return
    }
    if (
      !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
        documentFile.type,
      )
    ) {
      setFormError('Escolha um PDF ou uma imagem JPG, PNG ou WEBP.')
      return
    }
    if (!pixKey.trim()) {
      setFormError('Informe a chave Pix oficial.')
      return
    }
    if (!accepted) {
      setFormError('Aceite os Termos de Uso e a PolÃ­tica de Privacidade.')
      return
    }

    setIsSubmitting(true)
    try {
      await submitOrganizationAccreditation({
        cnpj,
        legalName,
        institutionalEmail: email,
        password,
        documentName: documentFile.name,
        documentSizeBytes: documentFile.size,
        documentContentType: documentFile.type,
        pixKey,
      })
      setSubmitted(true)
    } catch (failure) {
      const code =
        failure instanceof OrganizationAccreditationError
          ? failure.code
          : 'generic'
      const messages: Record<string, string> = {
        'email-verification-required':
          'Enviamos um link de confirmacao para o e-mail institucional. Confirme o e-mail e envie para analise novamente.',
        'email-already-in-use':
          'Este e-mail institucional ja esta cadastrado. Acesse a conta existente ou use outro e-mail.',
        'invalid-existing-password':
          'Este e-mail ja possui uma conta, mas a senha informada esta incorreta.',
        'weak-password': 'A senha precisa ter pelo menos 8 caracteres.',
        'invalid-email': 'Informe um e-mail institucional valido.',
        'operation-not-allowed':
          'O login por e-mail e senha esta desativado no Firebase. Ative o provedor E-mail/senha em Authentication > Sign-in providers.',
        'network-request-failed':
          'Nao foi possivel conectar ao Firebase. Verifique sua internet e tente novamente.',
        'too-many-requests':
          'Muitas tentativas para este e-mail. Aguarde alguns minutos e tente novamente.',
        'failed-precondition':
          'O Firestore ainda nao esta configurado neste projeto Firebase.',
        unavailable:
          'O Firebase esta temporariamente indisponivel. Tente novamente em instantes.',
        'permission-denied':
          'O Firebase recusou o envio. Verifique as regras do Firestore.',
        generic: 'Nao foi possivel enviar o credenciamento. Tente novamente.',
      }
      setFormError(messages[code] ?? messages.generic)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return <OrganizationVerificationPending onBack={onBack} />
  }

  return (
    <main className="login-page accreditation-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <img
            className="brand-silhouette"
            src="/weanimals-entry-silhouette.png"
            alt=""
          />
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar tamb&eacute;m &eacute; organizar o atendimento.</h1>
          <p>
            Acompanhe den&uacute;ncias, atualize ocorr&ecirc;ncias e ajude cada animal a
            encontrar prote&ccedil;&atilde;o.
          </p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de prote&ccedil;&atilde;o animal
        </div>
      </section>

      <section className="login-form-panel accreditation-form-panel">
        <div className="login-card accreditation-card">
          <div className="mobile-brand brand-lockup">
            <img
              className="brand-silhouette"
              src="/weanimals-entry-silhouette.png"
              alt=""
            />
            <span>WeAnimals</span>
          </div>
          <button type="button" className="back-login-button" onClick={onBack}>
            &larr; Voltar para o login
          </button>
          <div className="login-heading accreditation-heading">
            <span className="eyebrow">CREDENCIAMENTO INSTITUCIONAL</span>
            <h2>Solicitar credenciamento</h2>
            <p>
              Envie os dados da sua ONG ou abrigo para a equipe WeAnimals analisar.
            </p>
          </div>

          <form className="login-form accreditation-form" onSubmit={handleSubmit}>
            <div className="accreditation-fields">
              <label className="accreditation-field" htmlFor="accreditation-cnpj">
                <span className="field-label">CNPJ ou e-mail institucional</span>
                <input
                  id="accreditation-cnpj"
                  type="text"
                  inputMode="numeric"
                  value={cnpj}
                  onChange={(event) =>
                    setCnpj(
                      formatOrganizationIdentifier(
                        event.target.value.replace(/\D/g, ''),
                      ),
                    )
                  }
                  placeholder="00.000.000/0000-00"
                  autoComplete="organization"
                />
              </label>
              <label className="accreditation-field" htmlFor="accreditation-name">
                <span className="field-label">Raz&atilde;o social / nome do abrigo</span>
                <input
                  id="accreditation-name"
                  type="text"
                  value={legalName}
                  onChange={(event) => setLegalName(event.target.value)}
                  placeholder="Nome oficial da entidade"
                  autoComplete="organization"
                />
              </label>
              <label className="accreditation-field accreditation-field-full" htmlFor="accreditation-responsible">
                <span className="field-label">Respons&aacute;vel legal</span>
                <input
                  id="accreditation-responsible"
                  type="text"
                  value={responsibleName}
                  onChange={(event) => setResponsibleName(event.target.value)}
                  placeholder="Nome completo do respons&aacute;vel"
                  autoComplete="name"
                />
              </label>
              <label className="accreditation-field" htmlFor="accreditation-email">
                <span className="field-label">E-mail institucional</span>
                <input
                  id="accreditation-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="contato@suaong.org"
                  autoComplete="email"
                />
              </label>
              <label className="accreditation-field" htmlFor="accreditation-password">
                <span className="field-label">Senha de acesso</span>
                <span className="password-field">
                  <input
                    id="accreditation-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={'M\u00ednimo 8 caracteres'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <PasswordVisibilityIcon hidden={!showPassword} />
                  </button>
                </span>
              </label>
              <label className="accreditation-field accreditation-field-full" htmlFor="accreditation-pix">
                <span className="field-label">Chave Pix da institui&ccedil;&atilde;o</span>
                <input
                  id="accreditation-pix"
                  type="text"
                  value={pixKey}
                  onChange={(event) => setPixKey(event.target.value)}
                  placeholder="Chave vinculada ao CNPJ"
                  autoComplete="off"
                />
              </label>
              <label className="accreditation-field accreditation-field-full" htmlFor="accreditation-document">
                <span className="field-label">Documento de registro (estatuto ou alvar&aacute;)</span>
                <span className="document-upload">
                  <input
                    id="accreditation-document"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setDocumentFile(file)
                      setDocumentName(file?.name ?? '')
                    }}
                  />
                  <svg
                    className="document-upload-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 3.5h8l4 4v13H6z" />
                    <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
                  </svg>
                  <strong>{documentName || 'Anexar PDF ou foto'}</strong>
                  <small>Usado s&oacute; para verifica&ccedil;&atilde;o da institui&ccedil;&atilde;o</small>
                </span>
              </label>
              <p className="accreditation-helper accreditation-helper-card accreditation-field-full">
                Voc&ecirc; usar&aacute; esse e-mail e senha para entrar assim que o cadastro for
                aprovado.
              </p>
            </div>

            <div className="legal-acceptance">
              <input
                id="accreditation-legal-acceptance"
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                aria-label="Aceitar Termos de Uso e Política de Privacidade"
              />
              <span>
                Declaro que possuo autoriza&ccedil;&atilde;o para representar esta institui&ccedil;&atilde;o e
                aceito os{' '}
                <button
                  type="button"
                  className="legal-link"
                  onClick={() => setOpenLegalDocument('terms')}
                >
                  Termos de Uso
                </button>{' '}
                e a{' '}
                <button
                  type="button"
                  className="legal-link"
                  onClick={() => setOpenLegalDocument('privacy')}
                >
                  Pol&iacute;tica de Privacidade
                </button>, incluindo a se&ccedil;&atilde;o de credenciamento institucional.
              </span>
            </div>

            {formError && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                {formError}
              </div>
            )}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="button-spinner" />
                  Enviando...
                </>
              ) : (
                'Enviar para an\u00e1lise'
              )}
            </button>
          </form>
        </div>
      </section>
      {openLegalDocument && (
        <LegalDocumentModal
          documentType={openLegalDocument}
          onClose={() => setOpenLegalDocument(null)}
        />
      )}
    </main>
  )
}

function OrganizationVerificationPending({ onBack }: { onBack: () => void }) {
  return (
    <main className="login-page accreditation-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <img
            className="brand-silhouette"
            src="/weanimals-entry-silhouette.png"
            alt=""
          />
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar tamb&eacute;m &eacute; organizar o atendimento.</h1>
          <p>
            Acompanhe den&uacute;ncias, atualize ocorr&ecirc;ncias e ajude cada animal a
            encontrar prote&ccedil;&atilde;o.
          </p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de prote&ccedil;&atilde;o animal
        </div>
      </section>

      <section className="login-form-panel accreditation-form-panel">
        <div className="login-card verification-pending-card">
          <div className="mobile-brand brand-lockup">
            <img
              className="brand-silhouette"
              src="/weanimals-entry-silhouette.png"
              alt=""
            />
            <span>WeAnimals</span>
          </div>
          <div className="verification-pending-content" role="status">
            <span className="verification-badge" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 19 6v5c0 4.4-2.7 8-7 10-4.3-2-7-5.6-7-10V6l7-3Z" />
                <path d="m8.8 12 2.1 2.1 4.4-4.5" />
              </svg>
            </span>
            <span className="eyebrow">HOMOLOGA&Ccedil;&Atilde;O</span>
            <h2>Documenta&ccedil;&atilde;o em an&aacute;lise</h2>
            <p>
              Recebemos os dados da sua institui&ccedil;&atilde;o. Nossa equipe far&aacute; a
              valida&ccedil;&atilde;o manual do CNPJ e dos documentos enviados para manter a
              rede segura.
            </p>
            <div className="verification-info">
              <span className="verification-info-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5v5l3.2 2" />
                </svg>
              </span>
              <span>
                <strong>Prazo de resposta: 48h &uacute;teis</strong>
                <small>
                  Voc&ecirc; receber&aacute; um e-mail com as instru&ccedil;&otilde;es para o primeiro acesso
                  ao painel de ONGs.
                </small>
              </span>
            </div>
            <button type="button" className="verification-back-button" onClick={onBack}>
              Voltar para o in&iacute;cio
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function OrganizationLoginBlocked({
  onResubmit,
  onBack,
}: {
  onResubmit: () => void
  onBack: () => void
}) {
  return (
    <main className="login-page accreditation-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <img
            className="brand-silhouette"
            src="/weanimals-entry-silhouette.png"
            alt=""
          />
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar tamb&eacute;m &eacute; organizar o atendimento.</h1>
          <p>
            Acompanhe den&uacute;ncias, atualize ocorr&ecirc;ncias e ajude cada animal a
            encontrar prote&ccedil;&atilde;o.
          </p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de prote&ccedil;&atilde;o animal
        </div>
      </section>

      <section className="login-form-panel accreditation-form-panel">
        <div className="login-card login-blocked-card">
          <button type="button" className="blocked-header-button" onClick={onBack}>
            &larr; Acesso institucional
          </button>
          <div className="login-blocked-content" role="status">
            <span className="login-blocked-lock" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 10V7.5C7 4.46 9.24 2 12 2s5 2.46 5 5.5V10" />
                <path d="M5 10h14c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-7c0-1.1.9-2 2-2Z" />
                <circle cx="12" cy="14.7" r="1.5" />
              </svg>
            </span>
            <span className="eyebrow">ACESSO INSTITUCIONAL</span>
            <h2>Seu cadastro ainda est&aacute; em an&aacute;lise</h2>
            <p>
              A senha est&aacute; certa &mdash; mas o acesso ao painel s&oacute; ser&aacute; liberado
              depois que a equipe do WeAnimals confirmar o CNPJ e os documentos da
              institui&ccedil;&atilde;o. Isso n&atilde;o &eacute; um erro de login.
            </p>
            <div className="login-blocked-info">
              <span className="login-blocked-clock" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5v5l3.2 2" />
                </svg>
              </span>
              <span>
                <strong>Solicita&ccedil;&atilde;o enviada para an&aacute;lise</strong>
                <small>
                  O prazo estimado de resposta &eacute; de at&eacute; 48h &uacute;teis. Voc&ecirc; receber&aacute;
                  um e-mail quando a equipe finalizar a confer&ecirc;ncia.
                </small>
              </span>
            </div>
            <button type="button" className="login-blocked-resubmit" onClick={onResubmit}>
              Reenviar documentos
            </button>
            <button type="button" className="login-blocked-back" onClick={onBack}>
              Voltar para o in&iacute;cio
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function LegalDocumentModal({
  documentType,
  onClose,
}: {
  documentType: 'terms' | 'privacy'
  onClose: () => void
}) {
  const isTerms = documentType === 'terms'

  return (
    <div className="legal-modal-backdrop" role="presentation">
      <section
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <button
          type="button"
          className="legal-modal-close"
          onClick={onClose}
          aria-label="Fechar documento"
        >
          &times;
        </button>
        <span className="eyebrow">DOCUMENTO INSTITUCIONAL</span>
        <h2 id="legal-modal-title">
          {isTerms ? 'Termos de Uso' : 'Pol&iacute;tica de Privacidade'}
        </h2>
        <p className="legal-modal-date">&Uacute;ltima atualiza&ccedil;&atilde;o: 4 de outubro de 2026</p>

        {isTerms ? (
          <div className="legal-document-content">
            <h3>1. Sobre o WeAnimals</h3>
            <p>
              O WeAnimals conecta cidad&atilde;os, tutores, ONGs e abrigos em a&ccedil;&otilde;es de
              prote&ccedil;&atilde;o e bem-estar animal.
            </p>
            <h3>2. Uso respons&aacute;vel</h3>
            <p>
              Voc&ecirc; se compromete a fornecer informa&ccedil;&otilde;es verdadeiras, proteger seus
              dados de acesso e n&atilde;o publicar conte&uacute;do falso, ofensivo ou ilegal.
            </p>
            <h3>3. Credenciamento institucional</h3>
            <p>
              Ao solicitar o credenciamento, o representante declara que possui
              autoriza&ccedil;&atilde;o para representar a institui&ccedil;&atilde;o e que os dados, documentos
              e chave Pix enviados s&atilde;o verdadeiros e atualizados. O pedido ficar&aacute;
              pendente at&eacute; a an&aacute;lise da equipe do WeAnimals.
            </p>
            <h3>4. Den&uacute;ncias e documentos</h3>
            <p>
              As informa&ccedil;&otilde;es e arquivos enviados devem ser compat&iacute;veis com a
              situa&ccedil;&atilde;o relatada e usados apenas para as finalidades informadas.
            </p>
            <h3>5. Contas e seguran&ccedil;a</h3>
            <p>
              Cada pessoa ou institui&ccedil;&atilde;o deve utilizar seu pr&oacute;prio acesso e manter a
              senha protegida. Fraudes, abusos ou viola&ccedil;&otilde;es podem levar ao bloqueio
              da conta.
            </p>
            <h3>6. Altera&ccedil;&otilde;es e contato</h3>
            <p>
              Estes termos podem ser atualizados quando o produto evoluir ou houver
              mudan&ccedil;a legal. Em caso de d&uacute;vida, entre em contato com a equipe do
              WeAnimals.
            </p>
          </div>
        ) : (
          <div className="legal-document-content">
            <h3>1. Quais dados s&atilde;o utilizados</h3>
            <p>
              Podemos utilizar CNPJ, raz&atilde;o social, respons&aacute;vel legal, e-mail
              institucional, dados de autentica&ccedil;&atilde;o, documentos enviados e chave Pix.
            </p>
            <h3>2. Para que usamos os dados</h3>
            <p>
              Os dados s&atilde;o usados para verificar a institui&ccedil;&atilde;o, analisar o pedido
              de credenciamento, proteger a conta e permitir o atendimento das
              den&uacute;ncias e demais funcionalidades do painel.
            </p>
            <h3>3. Documentos e anexos</h3>
            <p>
              Os documentos podem ser visualizados pela equipe respons&aacute;vel pela
              an&aacute;lise e armazenados pelo tempo necess&aacute;rio para o processo, a
              seguran&ccedil;a da plataforma e o cumprimento de obriga&ccedil;&otilde;es legais.
            </p>
            <h3>4. Compartilhamento e seguran&ccedil;a</h3>
            <p>
              N&atilde;o vendemos dados pessoais. Compartilhamos somente o necess&aacute;rio
              com a equipe administrativa e prestadores que apoiam a opera&ccedil;&atilde;o do
              WeAnimals, sempre respeitando a finalidade informada.
            </p>
            <h3>5. Seus direitos</h3>
            <p>
              Voc&ecirc; pode solicitar informa&ccedil;&otilde;es, corre&ccedil;&atilde;o de dados ou esclarecimentos
              pelos canais de contato da equipe. Podemos pedir confirma&ccedil;&atilde;o de
              identidade para proteger a conta.
            </p>
            <h3>6. Altera&ccedil;&otilde;es e contato</h3>
            <p>
              Esta pol&iacute;tica pode ser atualizada quando o aplicativo evoluir ou houver
              mudan&ccedil;a legal. A vers&atilde;o mais recente ficar&aacute; dispon&iacute;vel nesta tela.
            </p>
          </div>
        )}
        <button type="button" className="primary-button legal-modal-button" onClick={onClose}>
          Entendi
        </button>
      </section>
    </div>
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
