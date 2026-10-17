import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import type { OrganizationProfile } from '../types'
import { useToast } from '../components/ToastContext'

interface ProfileProps {
  profile: OrganizationProfile
  onUpdateProfile: (updated: OrganizationProfile) => void
  onLogout: () => void
}

export function Profile({ profile, onUpdateProfile, onLogout }: ProfileProps) {
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<OrganizationProfile>(profile)

  function handleSave() {
    if (!formData.name.trim() || !formData.email.trim() || !formData.pixKey.trim()) {
      showToast('Preencha todos os campos obrigatórios!', '⚠️')
      return
    }
    onUpdateProfile(formData)
    setIsEditing(false)
    showToast('Dados institucionais atualizados com sucesso!', '✓')
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
              onClick={() =>
                showToast(
                  `Link de redefinição enviado para ${profile.email}!`,
                  '✉️',
                )
              }
            >
              Alterar senha
            </button>
            <button
              type="button"
              className="outline-button"
              onClick={() =>
                showToast('Solicitação de reenvio de documento aberta.', '📄')
              }
            >
              Reenviar documento
            </button>
            <button type="button" className="logout-link" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </div>
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