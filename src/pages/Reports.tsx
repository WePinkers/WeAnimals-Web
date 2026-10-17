import { useState } from 'react'
import type { Report, ReportStatus } from '../types'
import { useToast } from '../components/ToastContext'

interface ReportsProps {
  reports: Report[]
  selectedReport: Report
  onSelectReport: (id: number) => void
  onUpdateStatus: (reportId: number, status: ReportStatus) => void
  onSendMessage: (reportId: number, message: string) => void
}

const reportStatuses: ReportStatus[] = [
  'Equipe acionada',
  'Equipe a caminho',
  'Resgate',
  'Encaminhado a abrigo',
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
    if (!trimmed) return
    onSendMessage(selectedReport.id, trimmed)
    setMessageInput('')
  }

  const reporterInitial = (selectedReport.reporter.charAt(0) || 'D').toUpperCase()

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
              <span>As ocorrências correspondentes aparecerão aqui.</span>
            </div>
          )}
        </div>

        <article className="portal-card report-detail">
          <div className="detail-heading">
            <h2>Denúncia #{selectedReport.id}</h2>
            <span className={'priority-badge ' + selectedReport.priorityClass}>
              {selectedReport.priority}
            </span>
          </div>

          <div className="mono-label">Localização · {selectedReport.address}</div>
          <div
            className="reference-map"
            onClick={() => handleOpenGoogleMaps('map')}
            style={{ cursor: 'pointer' }}
          >
            <span className="map-pin" />
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
                Membro desde {selectedReport.reporterSince} ·{' '}
                {selectedReport.reporterTotalReports} denúncias
              </small>
            </span>
            <span className="reporter-score">
              <b>{selectedReport.reporterReliability}%</b>
              <small>confiável</small>
            </span>
          </div>

          <div className="mono-label" style={{ marginTop: 12 }}>
            Atualizar status (atual: {selectedReport.status})
          </div>
          <div className="status-chips">
            {reportStatuses.map((status) => (
              <button
                type="button"
                key={status}
                className={
                  'status-chip' + (selectedReport.status === status ? ' active' : '')
                }
                onClick={() => {
                  onUpdateStatus(selectedReport.id, status)
                  showToast(`Status da denúncia #${selectedReport.id}: ${status}`)
                }}
              >
                {status}
              </button>
            ))}
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
              Falar com quem denunciou ({selectedReport.chat.length})
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
                {selectedReport.chat.length === 0 ? (
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
                  selectedReport.chat.map((msg) => (
                    <p key={msg.id} className={msg.mine ? 'mine' : ''}>
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
      </div>
    </section>
  )
}