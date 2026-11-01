import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import type { OrganizationProfile } from '../types'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase'

interface ProfileProps {
  profile: OrganizationProfile
  onUpdateProfile: (updated: OrganizationProfile) => void
  onLogout: () => void
}

export function Profile({ profile, onUpdateProfile, onLogout }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<OrganizationProfile>(profile)

  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState(profile.email)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  const [cnpjFile, setCnpjFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [bylawsFile, setBylawsFile] = useState<File | null>(null)
  const [addressFile, setAddressFile] = useState<File | null>(null)

  function handleSave() {
    if (!formData.name.trim() || !formData.email.trim() || !formData.pixKey.trim()) {
      return
    }
    onUpdateProfile(formData)
    setIsEditing(false)
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setIsSubmittingPassword(true)
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setIsPasswordModalOpen(false)
    } catch {
      // Ignora erro visual
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  function handleSendDocuments() {
    if (!cnpjFile || !idFile || !addressFile) return
    setIsDocModalOpen(false)
    setCnpjFile(null)
    setIdFile(null)
    setBylawsFile(null)
    setAddressFile(null)
  }

  return (
    <section className="portal-page">
      <div className="head">
        <PageHeading>Perfil da ONG</PageHeading>
        {!isEditing ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFormData(profile)
              setIsEditing(true)
            }}
          >
            Editar dados
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn g"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </button>
            <button type="button" className="btn ap" onClick={handleSave}>
              Salvar alterações
            </button>
          </div>
        )}
      </div>

      <div className="portal-grid profile-grid">
        <div className="portal-card">
          <h2>Dados institucionais</h2>

          {!isEditing ? (
            <>
              <Answer label="Razão Social / Nome da ONG" value={profile.name} />
              <Answer label="CNPJ" value={profile.cnpj} />
              <Answer label="E-mail institucional" value={profile.email} />
              <Answer label="Chave Pix" value={profile.pixKey} />
              <Answer label="Responsável legal" value={profile.responsibleName} />
            </>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div className="mono">Razão Social / Nome da ONG</div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <div className="mono">CNPJ</div>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: e.target.value })
                  }
                />
              </div>
              <div>
                <div className="mono">E-mail institucional</div>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <div className="mono">Chave Pix</div>
                <input
                  type="text"
                  value={formData.pixKey}
                  onChange={(e) =>
                    setFormData({ ...formData, pixKey: e.target.value })
                  }
                />
              </div>
              <div>
                <div className="mono">Responsável legal</div>
                <input
                  type="text"
                  value={formData.responsibleName}
                  onChange={(e) =>
                    setFormData({ ...formData, responsibleName: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="portal-card">
          <h2>Verificação</h2>
          <div className="verified-message">✓ Aprovada em {profile.verifiedAt}</div>
          <div className="info-box">
            Documento de registro aprovado. Alterar CNPJ, razão social ou
            documento abre uma nova análise.
          </div>
          <div className="profile-actions">
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setResetEmail(profile.email)
                setIsPasswordModalOpen(true)
              }}
            >
              Alterar senha
            </button>
            <button
              type="button"
              className="outline-button"
              onClick={() => setIsDocModalOpen(true)}
            >
              Reenviar documento
            </button>
            <button type="button" className="logout-link" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </div>

      {isPasswordModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className="portal-card"
            style={{
              width: 'min(100%, 440px)',
              background: '#fff',
              padding: '28px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Redefinir Senha</h2>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: 20 }}>
              Enviaremos um link de recuperação para o e-mail institucional cadastrado.
            </p>

            <form onSubmit={handlePasswordReset} style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 6, textTransform: 'uppercase' }}>
                  E-mail institucional
                </div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setIsPasswordModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn ap"
                  disabled={isSubmittingPassword}
                  style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {isSubmittingPassword ? 'A enviar...' : 'Enviar link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDocModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => setIsDocModalOpen(false)}
        >
          <div
            className="portal-card"
            style={{
              width: 'min(100%, 560px)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              padding: '28px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Verificação de Identidade e Legalidade</h2>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: 20 }}>
              Envie ou atualize os documentos obrigatórios para a moderação da plataforma.
            </p>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 6, textTransform: 'uppercase' }}>
                  1. CNPJ Ativo (ou CPF/documento para protetores) <span style={{ color: 'red' }}>*</span>
                </div>
                <input
                  type="file"
                  onChange={(e) => setCnpjFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                {cnpjFile && <small style={{ color: 'var(--p7)', display: 'block', marginTop: 4 }}>Selecionado: {cnpjFile.name}</small>}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 6, textTransform: 'uppercase' }}>
                  2. Documento de Identidade (RG ou CNH) e CPF do Responsável <span style={{ color: 'red' }}>*</span>
                </div>
                <input
                  type="file"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                {idFile && <small style={{ color: 'var(--p7)', display: 'block', marginTop: 4 }}>Selecionado: {idFile.name}</small>}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 6, textTransform: 'uppercase' }}>
                  3. Estatuto Social e Ata da Diretoria atual (Opcional)
                </div>
                <input
                  type="file"
                  onChange={(e) => setBylawsFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                {bylawsFile && <small style={{ color: 'var(--p7)', display: 'block', marginTop: 4 }}>Selecionado: {bylawsFile.name}</small>}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 6, textTransform: 'uppercase' }}>
                  4. Comprovante de endereço recente da sede ou base <span style={{ color: 'red' }}>*</span>
                </div>
                <input
                  type="file"
                  onChange={(e) => setAddressFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                {addressFile && <small style={{ color: 'var(--p7)', display: 'block', marginTop: 4 }}>Selecionado: {addressFile.name}</small>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setIsDocModalOpen(false)}
                style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn ap"
                onClick={handleSendDocuments}
                style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Enviar para Moderação
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Answer({ label, value }: { label: string; value: string }) {
  return (
    <div className="answer-row">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}
