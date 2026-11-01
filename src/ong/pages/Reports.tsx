import { useState } from 'react'
import type { Report, ReportStatus } from '../types'
import { useToast } from '../components/ToastContext'

interface ReportsProps {
  reports: Report[]
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

export function Reports({
  reports,
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
          {filteredReports.length ? (
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
                Falar com quem denunciou ({selectedReport.chat?.length || 0})
              </button>
              <button
                type="button"
                className="outline-button"
                onClick={() => handleOpenGoogleMaps('route')}
              >
                Traçar rota
              </button>
            </div>

            {showDetails && selectedReport.triage && (
              <div className="detail-box">
                <strong>Respostas da triagem</strong>
                <p>
                  Risco imediato de morte: {selectedReport.triage.immediateRisk} ·
                  Maus-tratos ativos: {selectedReport.triage.activeAbuse} · Animal
                  preso ou ferido: {selectedReport.triage.trappedOrInjured} · Situação
                  de rua sem risco: {selectedReport.triage.streetNoRisk}
                </p>
                <p>
                  Foto: {selectedReport.triage.photoName} · {selectedReport.address}
                </p>
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
                      <p key={msg.id || Math.random()} className={msg.mine ? 'mine' : ''}>
                        {msg.text}
                      </p>
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