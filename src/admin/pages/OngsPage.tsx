
import { useMemo, useState } from 'react'

type OrganizationStatus = 'Credenciada' | 'Solicitação' | 'Rejeitada'
type DocumentStatus = 'Pendente' | 'Aprovado' | 'Rejeitado'
type Tab = 'Solicitações' | 'ONGs ativas'

type OrganizationDocument = {
  name: string
  status: DocumentStatus
}

type Message = {
  author: string
  text: string
}

type Organization = {
  name: string
  cnpj: string
  email: string
  status: OrganizationStatus
  documents: OrganizationDocument[]
  attended: number
  complaints: number
  lastActivity: string
  messages: Message[]
  accessReleased?: boolean
}

const initialOrganizations: Organization[] = [
  {
    name: 'Abrigo Esperança',
    cnpj: '23.456.789/0001-01',
    email: 'contato@abrigoesperanca.org',
    status: 'Credenciada',
    documents: [
      { name: 'Estatuto social', status: 'Aprovado' },
      { name: 'Comprovante de CNPJ', status: 'Aprovado' },
      { name: 'Ata de diretoria', status: 'Aprovado' },
    ],
    attended: 41,
    complaints: 1,
    lastActivity: 'Hoje, 13:20',
    messages: [
      {
        author: 'Abrigo Esperança',
        text: 'Bom dia! Atendemos a #4506 hoje cedo.',
      },
    ],
  },
  {
    name: 'ONG Patas Unidas',
    cnpj: '34.567.890/0001-12',
    email: 'oi@patasunidas.org',
    status: 'Credenciada',
    documents: [
      { name: 'Estatuto social', status: 'Aprovado' },
      { name: 'Comprovante de CNPJ', status: 'Aprovado' },
    ],
    attended: 27,
    complaints: 4,
    lastActivity: 'Hoje, 13:38',
    messages: [],
  },
  {
    name: 'Clínica veterinária municipal',
    cnpj: '45.111.222/0001-33',
    email: 'clinica@prefeitura.gov',
    status: 'Credenciada',
    documents: [
      { name: 'Ofício da prefeitura', status: 'Aprovado' },
      { name: 'Comprovante de CNPJ', status: 'Aprovado' },
    ],
    attended: 15,
    complaints: 0,
    lastActivity: '10/10/2026',
    messages: [],
    accessReleased: true,
  },
  {
    name: 'Amigos do Focinho',
    cnpj: '12.345.678/0001-90',
    email: 'contato@amigosdofocinho.org',
    status: 'Solicitação',
    documents: [
      { name: 'Estatuto social', status: 'Pendente' },
      { name: 'Comprovante de CNPJ', status: 'Pendente' },
    ],
    attended: 0,
    complaints: 0,
    lastActivity: '13/10/2026',
    messages: [],
  },
  {
    name: 'Instituto Patas do Bairro',
    cnpj: '45.678.901/0001-22',
    email: 'ola@patasdobairro.org',
    status: 'Solicitação',
    documents: [
      { name: 'Estatuto social', status: 'Pendente' },
      { name: 'Comprovante de endereço', status: 'Pendente' },
    ],
    attended: 0,
    complaints: 0,
    lastActivity: '12/10/2026',
    messages: [],
  },
]

function organizationSituation(organization: Organization) {
  if (organization.status === 'Solicitação') {
    return {
      label: 'Aguardando análise',
      className: 'st-analisar',
    }
  }

  if (organization.status === 'Rejeitada') {
    return {
      label: 'Rejeitada',
      className: 'st-removido',
    }
  }

  if (organization.complaints >= 4) {
    return {
      label: 'Atenção',
      className: 'st-suspenso',
    }
  }

  return {
    label: 'Situação ok',
    className: 'st-mantido',
  }
}

export default function OngsPage() {
  const [organizations, setOrganizations] =
    useState<Organization[]>(initialOrganizations)
  const [tab, setTab] = useState<Tab>('Solicitações')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [justification, setJustification] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [feedback, setFeedback] = useState('')

  const selected = organizations.find(
    (organization) => organization.name === selectedName,
  )

  const requests = useMemo(
    () => organizations.filter((organization) =>
      organization.status !== 'Credenciada',
    ),
    [organizations],
  )

  const activeOrganizations = useMemo(
    () => organizations.filter(
      (organization) => organization.status === 'Credenciada',
    ),
    [organizations],
  )

  const approvedDocuments = selected
    ? selected.documents.filter((document) => document.status === 'Aprovado')
        .length
    : 0

  const allDocumentsApproved =
    !!selected &&
    selected.documents.length > 0 &&
    approvedDocuments === selected.documents.length

  function openOrganization(name: string) {
    setSelectedName(name)
    setJustification('')
    setNewMessage('')
    setFeedback('')
  }

  function updateDocument(index: number, status: DocumentStatus) {
    if (!selected) return

    setOrganizations((current) =>
      current.map((organization) =>
        organization.name === selected.name
          ? {
              ...organization,
              documents: organization.documents.map((document, i) =>
                i === index ? { ...document, status } : document,
              ),
            }
          : organization,
      ),
    )

    setFeedback(
      status === 'Aprovado'
        ? 'Documento aprovado nesta demonstração.'
        : status === 'Rejeitado'
          ? 'Documento rejeitado nesta demonstração.'
          : 'Documento marcado como pendente.',
    )
  }

  function approveOrganization() {
    if (!selected) return

    if (!allDocumentsApproved) {
      setFeedback('Aprove todos os documentos antes de aprovar o credenciamento.')
      return
    }

    setOrganizations((current) =>
      current.map((organization) =>
        organization.name === selected.name
          ? {
              ...organization,
              status: 'Credenciada',
              accessReleased: true,
            }
          : organization,
      ),
    )

    setFeedback(
      'Credenciamento aprovado nesta demonstração. O envio real do e-mail de acesso ainda não está conectado.',
    )
  }

  function rejectOrganization() {
    if (!selected) return

    if (!justification.trim()) {
      setFeedback('Informe a justificativa para rejeitar o credenciamento.')
      return
    }

    setOrganizations((current) =>
      current.map((organization) =>
        organization.name === selected.name
          ? { ...organization, status: 'Rejeitada' }
          : organization,
      ),
    )

    setFeedback(
      `Credenciamento rejeitado nesta demonstração. Justificativa: ${justification.trim()}`,
    )
    setJustification('')
  }

  function sendMessage() {
    if (!selected || !newMessage.trim()) return

    const outgoingMessage = newMessage.trim()

    setOrganizations((current) =>
      current.map((organization) =>
        organization.name === selected.name
          ? {
              ...organization,
              messages: [
                ...organization.messages,
                { author: 'Administrador', text: outgoingMessage },
              ],
            }
          : organization,
      ),
    )

    setNewMessage('')
    setFeedback(
      'Mensagem adicionada à conversa demonstrativa. Ela ainda não foi enviada à ONG por um serviço real.',
    )
  }

  function simulateCall() {
    setFeedback(
      `Ligação simulada com ${selected?.name}. A chamada real depende de uma integração.`,
    )
  }

  return (
    <>
      <div className="wa-eyebrow">REDE DE PARCEIROS</div>
      <h1>ONGs</h1>
      <p className="wa-subtitle">
        Credenciamento de novas organizações e monitoramento das que já
        atuam no app.
      </p>

      <div className="wa-stats">
        <div className="wa-stat">
          <span>Solicitações</span>
          <strong>
            {organizations.filter((o) => o.status === 'Solicitação').length}
          </strong>
          <small>Aguardando análise</small>
        </div>

        <div className="wa-stat">
          <span>Credenciadas</span>
          <strong>{activeOrganizations.length}</strong>
          <small>Ativas no app</small>
        </div>

        <div className="wa-stat">
          <span>Em atenção</span>
          <strong>
            {
              activeOrganizations.filter((o) => o.complaints >= 4).length
            }
          </strong>
          <small>4 ou mais reclamações</small>
        </div>

        <div className="wa-stat">
          <span>Denúncias atendidas</span>
          <strong>
            {activeOrganizations.reduce((total, o) => total + o.attended, 0)}
          </strong>
          <small>Pela rede de ONGs</small>
        </div>
      </div>

      <div className="wa-filters">
        {(['Solicitações', 'ONGs ativas'] as Tab[]).map((option) => (
          <button
            key={option}
            type="button"
            className={tab === option ? 'active' : ''}
            onClick={() => setTab(option)}
          >
            {option}
            <span className="wa-count">
              {option === 'Solicitações'
                ? requests.length
                : activeOrganizations.length}
            </span>
          </button>
        ))}
      </div>

      <div className="wa-card wa-table-card">
        <div className="wa-table-wrap">
          <table className="wa-table wa-table-wide">
            <thead>
              {tab === 'Solicitações' ? (
                <tr>
                  <th>ONG / CNPJ</th>
                  <th>Documentos</th>
                  <th>Enviado em</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              ) : (
                <tr>
                  <th>Organização</th>
                  <th>Situação</th>
                  <th>Atendidas</th>
                  <th>Reclamações</th>
                  <th>Última atividade</th>
                  <th>Ação</th>
                </tr>
              )}
            </thead>

            <tbody>
              {(tab === 'Solicitações'
                ? requests
                : activeOrganizations
              ).map((organization) => {
                const situation = organizationSituation(organization)

                return (
                  <tr key={organization.name}>
                    <td>
                      <strong>{organization.name}</strong>
                      <small>{organization.cnpj}</small>
                    </td>

                    {tab === 'Solicitações' ? (
                      <>
                        <td>{organization.documents.length} arquivo(s)</td>
                        <td>{organization.lastActivity}</td>
                        <td>
                          <span
                            className={`wa-status-pill ${situation.className}`}
                          >
                            {situation.label}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span
                            className={`wa-status-pill ${situation.className}`}
                          >
                            {situation.label}
                          </span>
                        </td>
                        <td>{organization.attended}</td>
                        <td>{organization.complaints}</td>
                        <td>{organization.lastActivity}</td>
                      </>
                    )}

                    <td>
                      <button
                        type="button"
                        className="wa-btn"
                        onClick={() => openOrganization(organization.name)}
                      >
                        {tab === 'Solicitações' ? 'Analisar' : 'Abrir perfil'}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {(tab === 'Solicitações'
                ? requests
                : activeOrganizations
              ).length === 0 && (
                <tr>
                  <td colSpan={tab === 'Solicitações' ? 5 : 6} className="wa-empty">
                    Nenhuma organização nesta lista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div
          className="wa-modal-overlay"
          onClick={() => setSelectedName(null)}
        >
          <section
            className="wa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ong-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="wa-modal-close"
              aria-label="Fechar"
              onClick={() => setSelectedName(null)}
            >
              ×
            </button>

            <div className="wa-who">
              <div className="wa-avatar">
                {selected.name.charAt(0)}
              </div>
              <div>
                <h2 id="ong-modal-title" style={{ margin: 0 }}>
                  {selected.name}
                </h2>
                <small>
                  CNPJ {selected.cnpj} · {selected.email}
                </small>
              </div>
              <span
                className={`wa-status-pill ${organizationSituation(selected).className}`}
              >
                {organizationSituation(selected).label}
              </span>
            </div>

            <div className="wa-note">
              {selected.status === 'Solicitação'
                ? allDocumentsApproved
                  ? 'Documentação completa. Você já pode aprovar o credenciamento.'
                  : `Solicitação em análise: ${approvedDocuments} de ${selected.documents.length} documentos aprovados. Aprove todos para liberar o credenciamento.`
                : selected.status === 'Rejeitada'
                  ? 'Credenciamento rejeitado.'
                  : selected.complaints >= 4
                    ? `Atenção: ${selected.complaints} reclamações de usuários. Acompanhe o atendimento desta ONG.`
                    : 'Situação ok para permanecer no app: documentação aprovada e poucas reclamações.'}
            </div>

            <div className="wa-mini">
              <div className="wa-stat">
                <span>Denúncias atendidas</span>
                <strong>{selected.attended}</strong>
                <small>Pela ONG</small>
              </div>
              <div className="wa-stat">
                <span>Reclamações</span>
                <strong>{selected.complaints}</strong>
                <small>
                  {selected.complaints >= 4
                    ? 'Acima do limite'
                    : 'Dentro do esperado'}
                </small>
              </div>
              <div className="wa-stat">
                <span>Documentos</span>
                <strong>
                  {approvedDocuments}/{selected.documents.length}
                </strong>
                <small>Aprovados</small>
              </div>
              <div className="wa-stat">
                <span>Atividade</span>
                <strong style={{ fontSize: 13 }}>{selected.lastActivity}</strong>
                <small>Última registrada</small>
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">
                <strong>Documentos enviados</strong>
                <span>
                  {selected.status === 'Solicitação'
                    ? 'Aprove um por um'
                    : 'Documentação do cadastro'}
                </span>
              </div>

              <div className="wa-log">
                {selected.documents.map((document, index) => (
                  <div className="wa-le" key={document.name}>
                    <div>
                      <strong>{document.name}</strong>
                      <small>Enviado em {selected.lastActivity}</small>
                    </div>

                    <div className="wa-actions" style={{ marginLeft: 'auto' }}>
                      <span
                        className={`wa-status-pill ${
                          document.status === 'Aprovado'
                            ? 'st-mantido'
                            : document.status === 'Rejeitado'
                              ? 'st-removido'
                              : 'st-analisar'
                        }`}
                      >
                        {document.status}
                      </span>

                      {selected.status === 'Solicitação' && (
                        <>
                          <button
                            type="button"
                            className="wa-btn"
                            onClick={() => updateDocument(index, 'Aprovado')}
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            className="wa-btn wa-btn-danger"
                            onClick={() => updateDocument(index, 'Rejeitado')}
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selected.status === 'Solicitação' && (
              <div className="wa-card">
                <div className="wa-card-title">
                  <strong>Decisão do credenciamento</strong>
                </div>

                <label className="wa-moderation-field">
                  Justificativa
                  <span>(obrigatória apenas para rejeitar)</span>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(event) => setJustification(event.target.value)}
                    placeholder="Explique o motivo da rejeição..."
                  />
                </label>

                <div className="wa-actions">
                  <button
                    type="button"
                    className="wa-btn wa-btn-ok"
                    disabled={!allDocumentsApproved}
                    onClick={approveOrganization}
                  >
                    Aprovar credenciamento
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn-danger"
                    onClick={rejectOrganization}
                  >
                    Rejeitar credenciamento
                  </button>
                </div>
              </div>
            )}

            {selected.status !== 'Rejeitada' && (
              <div className="wa-card">
                <div className="wa-card-title">
                  <strong>Conversa ADM x ONG</strong>
                </div>

                <div className="wa-chat">
                  {selected.messages.length > 0 ? (
                    selected.messages.map((item, index) => (
                      <div className="wa-le" key={`${item.author}-${index}`}>
                        <div>
                          <strong>{item.author}</strong>
                          <small>{item.text}</small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <small>Nenhuma mensagem ainda.</small>
                  )}
                </div>

                <div className="wa-row">
                  <input
                    className="wa-in"
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    placeholder="Escrever para a ONG..."
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') sendMessage()
                    }}
                  />

                  <button
                    type="button"
                    className="wa-btn wa-btn-ok"
                    onClick={sendMessage}
                  >
                    Enviar
                  </button>

                  <button
                    type="button"
                    className="wa-btn"
                    onClick={simulateCall}
                  >
                    Ligar
                  </button>
                </div>
              </div>
            )}

            {feedback && (
              <p className="wa-subtitle" role="status">
                {feedback}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
