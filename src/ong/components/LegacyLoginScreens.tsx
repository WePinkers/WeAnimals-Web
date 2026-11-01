import { useState } from 'react'
import type { FormEvent } from 'react'
import { sendPasswordResetEmail, type User } from 'firebase/auth'
import { auth } from '../../firebase'
import { hasAdminAccess } from '../../admin/adminAccess'
import {
  OrganizationAuthError,
  signInOrganization,
} from '../auth/organizationAuth'
import { submitOrganizationAccreditation } from '../auth/organizationAccreditation'
import type { LoginErrorCode } from '../types'

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

export function LegacyOrganizationLogin({
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
      setFormError('Informe um CNPJ válido.')
      return
    }
    if (!legalName.trim()) {
      setFormError('Informe a razão social ou o nome do abrigo.')
      return
    }
    if (!responsibleName.trim()) {
      setFormError('Informe o nome completo do responsável legal.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError('Informe um e-mail institucional válido.')
      return
    }
    if (password.length < 8) {
      setFormError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!documentName || !documentFile) {
      setFormError('Anexe o estatuto, alvará ou outro documento.')
      return
    }
    if (documentFile.size > 10 * 1024 * 1024) {
      setFormError('O documento deve ter no máximo 10 MB.')
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
      setFormError('Aceite os Termos de Uso e a Política de Privacidade.')
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
        documentName: documentFile.name,
        documentSizeBytes: documentFile.size,
        documentContentType: documentFile.type,
        pixKey,
      })
      setSubmitted(true)
    } catch (failure) {
      const rawCode = (failure as { code?: string }).code
      const code = rawCode?.startsWith('auth/') ? rawCode.slice(5) : rawCode ?? 'generic'
      const messages: Record<string, string> = {
        'email-verification-required':
          'Enviamos um link de confirmação para o e-mail institucional. Confirme o e-mail e envie para análise novamente.',
        'email-already-in-use':
          'Este e-mail institucional já está cadastrado. Acesse a conta existente ou use outro e-mail.',
        'invalid-existing-password':
          'Este e-mail já possui uma conta, mas a senha informada está incorreta.',
        'weak-password': 'A senha precisa ter pelo menos 8 caracteres.',
        'invalid-email': 'Informe um e-mail institucional válido.',
        'operation-not-allowed':
          'O login por e-mail e senha está desativado no Firebase.',
        'network-request-failed':
          'Não foi possível conectar ao Firebase. Verifique sua internet.',
        'too-many-requests':
          'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        'failed-precondition':
          'O Firestore ainda não está configurado neste projeto Firebase.',
        unavailable:
          'O Firebase está temporariamente indisponível.',
        'permission-denied':
          'O Firebase recusou o envio. Verifique as regras do Firestore.',
        generic: 'Não foi possível enviar o credenciamento. Tente novamente.',
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
                <span className="field-label">CNPJ</span>
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
                <span className="field-label">Razão social / nome do abrigo</span>
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
                <span className="field-label">Responsável legal</span>
                <input
                  id="accreditation-responsible"
                  type="text"
                  value={responsibleName}
                  onChange={(event) => setResponsibleName(event.target.value)}
                  placeholder="Nome completo do responsável"
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
                    placeholder="Mínimo 8 caracteres"
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
                <span className="field-label">Chave Pix da instituição</span>
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
                <span className="field-label">Documento de registro (estatuto ou alvará)</span>
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
                  <strong>{documentName || 'Anexar PDF ou foto'}</strong>
                  <small>Usado só para verificação da instituição</small>
                </span>
              </label>
            </div>

            <div className="legal-acceptance">
              <input
                id="accreditation-legal-acceptance"
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                Declaro que possuo autorização para representar esta instituição e
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
                  Política de Privacidade
                </button>.
              </span>
            </div>

            {formError && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                {formError}
              </div>
            )}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar para análise'}
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
      <section className="login-form-panel accreditation-form-panel">
        <div className="login-card verification-pending-card">
          <div className="verification-pending-content" role="status">
            <span className="eyebrow">HOMOLOGAÇÃO</span>
            <h2>Documentação em análise</h2>
            <p>Recebemos os dados da sua instituição.</p>
            <button type="button" className="verification-back-button" onClick={onBack}>
              Voltar para o início
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
      <section className="login-form-panel accreditation-form-panel">
        <div className="login-card login-blocked-card">
          <div className="login-blocked-content" role="status">
            <span className="eyebrow">ACESSO INSTITUCIONAL</span>
            <h2>Seu cadastro ainda está em análise</h2>
            <button type="button" className="login-blocked-resubmit" onClick={onResubmit}>
              Reenviar documentos
            </button>
            <button type="button" className="login-blocked-back" onClick={onBack}>
              Voltar para o início
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
      <section className="legal-modal" role="dialog" aria-modal="true">
        <button type="button" className="legal-modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>{isTerms ? 'Termos de Uso' : 'Política de Privacidade'}</h2>
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
    'email-not-verified': 'Confirme o e-mail institucional antes de acessar o painel.',
    pending: 'Seu credenciamento ainda está em análise.',
    'too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    disabled: 'Este acesso foi desativado.',
    generic: 'Não foi possível entrar agora. Tente novamente.',
  }

  return (
    <div className="login-error" role="alert">
      <span aria-hidden="true">!</span>
      {messages[code]}
    </div>
  )
}


