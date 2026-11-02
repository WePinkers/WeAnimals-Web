import { useEffect, useState } from 'react'
import type { Report, ReportStatus } from '../types'
import { useToast } from '../components/ToastContext'

interface ReportsProps {
  reports: Report[]
  reportsError?: string | null
  selectedReport: Report
  onSelectReport: (id: any) => void
  onUpdateStatus: (reportId: any, status: ReportStatus) => void
  onSendMessage: (reportId: any, message: string) => void
}

const statusMap: { label: string; value: ReportStatus }[] = [
  { label: 'Equipe acionada', value: 'Equipe acionada' },
  { label: 'Equipe a caminho', value: 'Equipe a caminho' },
  { label: 'Resgate', value: 'Resgate' },
  { label: 'Encaminhado a abrigo', value: 'Encaminhado a abrigo' },
]

const triageQuestions = [
  ['immediateDanger', 'Há risco imediato de morte?'],
  ['activeAbuse', 'Há maus-tratos ativos?'],
  ['injuredOrImmobilized', 'O animal está preso, ferido ou imobilizado?'],
  ['streetSituation', 'É uma situação de rua sem risco iminente?'],
] as const

function answerLabel(value: unknown) {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return 'Não respondido'
}

function animalLabel(animalType?: string) {
  if (animalType === 'cat') return 'Gato'
  if (animalType === 'dog') return 'Cão'
  return 'Outro animal'
}

function urgencyLabel(urgency?: string) {
  if (urgency === 'high' || urgency === 'Alta') return 'Alta'
  if (urgency === 'low' || urgency === 'Baixa') return 'Baixa'
  return 'Média'
}

function classificationInfo(value?: string) {
  switch (value) {
    case 'very_urgent':
      return {
        label: 'Muito urgente',
        response: 'atendimento em até 15 minutos',
        description: 'Maus-tratos ativos e animal ferido detectados.',
      }
    case 'urgent':
      return {
        label: 'Urgente',
        response: 'atendimento em até 1 hora',
        description: 'Há sinais relevantes de risco para avaliação prioritária.',
      }
    case 'priority':
      return {
        label: 'Prioridade',
        response: 'atendimento ainda hoje',
        description: 'O caso precisa de atendimento, sem risco imediato identificado.',
      }
    case 'low':
      return {
        label: 'Baixa urgência',
        response: 'atendimento conforme disponibilidade',
        description: 'Caso registrado para acompanhamento e encaminhamento adequado.',
      }
    default:
      return null
  }
}

function formatReportDate(value: unknown) {
  if (!value) return 'Data não informada'
  try {
    const date = typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date)
    if (Number.isNaN(date.getTime())) return 'Data não informada'
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return 'Data não informada'
  }
}

export function Reports({
  reports,
  reportsError,
  selectedReport,
  onSelectReport,
  onUpdateStatus,
  onSendMessage,
}: ReportsProps) {
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'active' | 'resolved' | 'all'>('active')
  const [showDetails, setShowDetails] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const photoData = selectedReport?.photoData as { toBase64?: () => string } | undefined
    const externalPhotoUrl = selectedReport?.photoUrl

    try {
      const base64 = photoData?.toBase64?.()
      const nextUrl = base64
        ? `data:image/jpeg;base64,${base64}`
        : externalPhotoUrl || null
      if (!cancelled) setPhotoPreviewUrl(nextUrl)
    } catch {
      if (!cancelled) setPhotoPreviewUrl(externalPhotoUrl || null)
    }

    return () => {
      cancelled = true
    }
  }, [selectedReport])

  const filteredReports = reports.filter((report) => {
    if (filter === 'active') return report.status !== 'Encaminhado a abrigo'
    if (filter === 'resolved') return report.status === 'Encaminhado a abrigo'
    return true
  })

  function handleOpenGoogleMaps(mode: 'map' | 'route') {
    const query = selectedReport.coordinates
      ? `${selectedReport.coordinates.lat},${selectedReport.coordinates.lng}`
      : encodeURIComponent(`${selectedReport.address}, São Paulo - SP`)

    const url =
      mode === 'route'
        ? `https://www.google.com/maps/dir/?api=1&destination=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`

    window.open(url, '_blank', 'noopener,noreferrer')
    showToast(
      mode === 'route'
        ? `Traçando rota para ${selectedReport.location}...`
        : 'Mapa aberto em nova guia!',
      '🗺️',
    )
  }

  function handleSend() {
    const trimmed = messageInput.trim()
    if (!trimmed || !selectedReport) return
    onSendMessage(selectedReport.id, trimmed)
    setMessageInput('')
  }

  const reporterInitial = (selectedReport?.reporter?.charAt(0) || 'D').toUpperCase()

  const lat = selectedReport?.coordinates?.lat || -23.5505
  const lng = selectedReport?.coordinates?.lng || -46.6333

  // Função auxiliar para exibir o número de forma amigável (ex: protocolNumber ou o índice + 1 formatado com 2 dígitos)
  const getDisplayNumber = (reportId: any, index?: number) => {
    const reportObj = reports.find(r => r.id === reportId)
    if (reportObj && (reportObj as any).protocolNumber) {
      return (reportObj as any).protocolNumber
    }
    // Se não tiver protocolo numérico, usa o índice da lista (ex: 01, 02...) ou os últimos dígitos numéricos
    const numericStr = String(reportId).replace(/\D/g, '')
    if (numericStr.length >= 2) {
      return numericStr.slice(-4) // Pega os últimos números se houver
    }
    return index !== undefined ? String(index + 1).padStart(2, '0') : '01'
  }

  const currentDisplayNumber = getDisplayNumber(selectedReport?.id)

  return (
    <section className="portal-page">
      <div className="portal-page-heading">
        <h1 className="portal-page-title">Denúncias</h1>
        <div className="filter-chips">
          {(
            [
              ['active', 'Ativas'],
              ['resolved', 'Resolvidas'],
              ['all', 'Todas'],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={'filter-chip' + (filter === key ? ' active' : '')}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-layout">
        <div className="report-list">
          {reportsError ? (
            <div className="empty-panel">
              <strong>{reportsError}</strong>
              <span>Confirme se a conta da ONG está aprovada no Firebase.</span>
            </div>
          ) : filteredReports.length ? (
            filteredReports.map((report, index) => {
              const displayNumber = (report as any).protocolNumber || String(index + 1).padStart(2, '0')
              return (
                <button
                  type="button"
                  key={report.id || index}
                  className={
                    'report-list-item' +
                    (selectedReport?.id === report.id ? ' selected' : '')
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
                    #{displayNumber} · {report.title}, {report.location}
                  </strong>
                  <small>
                    {report.status} <span>· {report.elapsed}</span>
                  </small>
                </button>
              )
            })
          ) : (
            <div className="empty-panel">
              <strong>Nenhuma denúncia nesta categoria.</strong>
              <span>As ocorrências correspondentes aparecerão aqui.</span>
            </div>
          )}
        </div>

        {selectedReport ? (
          <article className="portal-card report-detail">
            <div className="detail-heading">
              <h2>Denúncia #{currentDisplayNumber}</h2>
              <span className={'priority-badge ' + selectedReport.priorityClass}>
                {selectedReport.priority}
              </span>
            </div>

            <div className="mono-label">Localização · {selectedReport.address}</div>
            
            {/* MAPA REAL MANTENDO O VISUAL ORIGINAL (.reference-map) */}
            <div
              className="reference-map"
              onClick={() => handleOpenGoogleMaps('map')}
              style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            >
              <iframe
                title={`Mapa da ocorrência ${selectedReport.id}`}
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
              />
              <button
                type="button"
                className="map-expand"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenGoogleMaps('map')
                }}
              >
                ⤢ Expandir mapa
              </button>
            </div>

            <div className="reporter-row" style={{ cursor: 'default' }}>
              <span className="attention-icon">{reporterInitial}</span>
              <span>
                <strong>{selectedReport.reporter}</strong>
                <small>
                  Membro desde {selectedReport.reporterSince || 'recentemente'} ·{' '}
                  {selectedReport.reporterTotalReports || 0} denúncias
                </small>
              </span>
              <span className="reporter-score">
                <b>{selectedReport.reporterReliability || 100}%</b>
                <small>confiável</small>
              </span>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: '9px 12px',
                borderRadius: 8,
                background: selectedReport.assignedOrganizationName ? '#edf6f0' : '#f8fafc',
                border: '1px solid var(--ln)',
                color: 'var(--i6)',
                fontSize: 12,
              }}
            >
              {selectedReport.assignedOrganizationName ? (
                <>
                  Denúncia atribuída a <strong>{selectedReport.assignedOrganizationName}</strong>.
                </>
              ) : (
                'Esta denúncia ainda não foi atribuída a uma ONG ou abrigo.'
              )}
            </div>

            <div className="mono-label" style={{ marginTop: 12 }}>
              Atualizar status (atual: {selectedReport.status})
            </div>
            <div className="status-chips">
              {statusMap.map(({ label, value }) => {
                const isActive = selectedReport.status === value
                return (
                  <button
                    type="button"
                    key={value}
                    className={'status-chip' + (isActive ? ' active' : '')}
                    onClick={() => {
                      onUpdateStatus(selectedReport.id, value)
                      showToast(`Status atualizado para: ${label}`)
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="detail-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setShowDetails((visible) => !visible)}
              >
                {showDetails ? 'Ocultar detalhes' : 'Ver detalhes da denúncia'}
              </button>
              <button
                type="button"
                className="brown-button"
                onClick={() => setShowChat((visible) => !visible)}
              >
                Falar com quem denunciou ({selectedReport.teamMessageCount || 0})
              </button>
              <button
                type="button"
                className="outline-button"
                onClick={() => handleOpenGoogleMaps('route')}
              >
                Traçar rota
              </button>
            </div>

            {showDetails && (
              <div
                className="detail-box"
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'grid',
                  gap: '16px',
                }}
              >
                <div>
                  <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>
                    Informações da denúncia
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                    <InfoItem label="Animal" value={animalLabel(selectedReport.animalType)} />
                    <InfoItem label="Urgência informada" value={urgencyLabel(selectedReport.urgency)} />
                    <InfoItem label="Enviada em" value={formatReportDate(selectedReport.createdAt)} />
                  </div>
                </div>

                <div>
                  <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>
                    Foto enviada
                  </strong>
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Foto enviada na denúncia"
                      style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                    />
                  ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                      {selectedReport.hasPhoto
                        ? selectedReport.photoFileName || 'Foto enviada'
                        : 'Nenhuma foto enviada'}
                    </p>
                  )}
                </div>

                <div>
                  <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>
                    Descrição da ocorrência
                  </strong>
                  <p style={{ margin: 0, color: '#334155', fontSize: '13.5px', lineHeight: 1.5 }}>
                    {selectedReport.description || 'Nenhuma descrição detalhada informada.'}
                  </p>
                </div>

                <div>
                  <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>
                    Localização informada
                  </strong>
                  <p style={{ margin: 0, color: '#334155', fontSize: '13.5px', lineHeight: 1.5 }}>
                    {selectedReport.address || 'Endereço não informado'}
                  </p>
                  {selectedReport.coordinates && (
                    <small style={{ display: 'block', marginTop: 4, color: '#64748b' }}>
                      GPS: {selectedReport.coordinates.lat.toFixed(6)}, {selectedReport.coordinates.lng.toFixed(6)}
                    </small>
                  )}
                </div>

                <div>
                  <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>
                    Respostas da triagem
                  </strong>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {triageQuestions.map(([key, question]) => (
                      <div
                        key={key}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 13 }}
                      >
                        <span>{question}</span>
                        <b style={{ color: selectedReport.triageAnswers?.[key] === true ? '#b45309' : '#334155', whiteSpace: 'nowrap' }}>
                          {answerLabel(selectedReport.triageAnswers?.[key])}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>

                {classificationInfo(selectedReport.triageClassification) && (
                  <div style={{ padding: '12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
                    <strong style={{ display: 'block', color: '#9a3412', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.08em' }}>
                      Classificação calculada
                    </strong>
                    <b style={{ display: 'block', marginTop: 4, color: '#1e293b' }}>
                      {classificationInfo(selectedReport.triageClassification)?.label}
                    </b>
                    <span style={{ display: 'block', marginTop: 2, color: '#475569', fontSize: 13 }}>
                      {classificationInfo(selectedReport.triageClassification)?.response}
                    </span>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12.5 }}>
                      {classificationInfo(selectedReport.triageClassification)?.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {showChat && (
              <div className="report-chat">
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  {!selectedReport.chat || selectedReport.chat.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'var(--i6)',
                        fontSize: 12,
                        margin: '10px 0',
                      }}
                    >
                      Sem mensagens ainda. Envie a primeira mensagem abaixo.
                    </div>
                  ) : (
                    selectedReport.chat.map((msg: any) => (
                      <div key={msg.id} style={{ display: 'grid', gap: 2 }}>
                        <small style={{ color: 'var(--i6)', fontSize: 10 }}>
                          {msg.senderName || (msg.mine ? 'Sua equipe' : 'Denunciante')} · {msg.timestamp || ''}
                        </small>
                        <p className={msg.mine ? 'mine' : ''}>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ margin: 0, flex: 1 }}
                    placeholder="Escreva uma mensagem para o denunciante..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend()
                    }}
                  />
                  <button type="button" className="btn" onClick={handleSend}>
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </article>
        ) : (
          <div className="portal-card report-detail" style={{ display: 'grid', placeItems: 'center', color: '#64748b' }}>
            Selecione uma denúncia ao lado.
          </div>
        )}
      </div>
    </section>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 7 }}>
      <small style={{ display: 'block', color: '#64748b', fontSize: 11 }}>{label}</small>
      <b style={{ display: 'block', marginTop: 2, color: '#334155', fontSize: 12.5 }}>{value}</b>
    </div>
  )
}
