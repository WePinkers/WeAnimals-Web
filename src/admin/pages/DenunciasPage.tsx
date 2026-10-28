
import { useState } from 'react'

type ReportStatus =
  | 'Pendente'
  | 'Encaminhada'
  | 'Atendida'
  | 'Rejeitada pela ONG'
  | 'Removida'

type Report = {
  id: string
  title: string
  location: string
  reporter: string
  minutes: number
  status: ReportStatus
  ong: string
  photo: boolean
  description: string
}

const initialReports: Report[] = [
  {
    id: '#4512',
    title: 'Cão sendo agredido no quintal',
    location: 'Rua Voluntários, 88 · Zona Norte',
    reporter: 'Paulo Mendes',
    minutes: 6,
    status: 'Pendente',
    ong: '',
    photo: true,
    description:
      'Vizinho relata gritos e agressões a um cão acorrentado no quintal desde a manhã.',
  },
  {
    id: '#4511',
    title: 'Filhote abandonado em caixa',
    location: 'Rua Aimberê · Vila Marlene',
    reporter: 'Marta Nunes',
    minutes: 21,
    status: 'Encaminhada',
    ong: 'Abrigo Esperança',
    photo: true,
    description:
      'Filhote com poucas semanas deixado em uma caixa de papelão na calçada.',
  },
  {
    id: '#4509',
    title: 'Gato preso em telhado',
    location: 'Rua das Acácias, 120',
    reporter: 'Carlos Souza',
    minutes: 48,
    status: 'Rejeitada pela ONG',
    ong: 'ONG Patas Unidas',
    photo: false,
    description:
      'Gato há dois dias no telhado. A ONG informou que não tem equipe para altura.',
  },
  {
    id: '#4506',
    title: 'Cão ferido na perna',
    location: 'Av. Brasil, km 4',
    reporter: 'Renata Ferreira',
    minutes: 120,
    status: 'Atendida',
    ong: 'Abrigo Esperança',
    photo: true,
    description:
      'Cão ferido na pista. Resgatado e levado à clínica municipal.',
  },
  {
    id: '#4503',
    title: 'Cão idoso debilitado',
    location: 'Vila Marlene',
    reporter: 'João Klein',
    minutes: 180,
    status: 'Pendente',
    ong: '',
    photo: false,
    description:
      'Cão idoso muito magro, sem andar direito, na porta de um comércio.',
  },
  {
    id: '#4498',
    title: 'Gata de rua sem sinais de risco',
    location: 'Praça Central',
    reporter: 'Marta Nunes',
    minutes: 300,
    status: 'Pendente',
    ong: '',
    photo: false,
    description:
      'Gata aparentemente saudável. Possível duplicata da denúncia #4488.',
  },
  {
    id: '#4490',
    title: 'Cães soltos na avenida',
    location: 'Jardim Sul',
    reporter: 'Lucas Prado',
    minutes: 1440,
    status: 'Removida',
    ong: '',
    photo: false,
    description:
      'Texto genérico, sem endereço e sem animal identificado.',
  },
  {
    id: '#4485',
    title: 'Cão preso em terreno baldio',
    location: 'Zona Norte',
    reporter: 'Renata Ferreira',
    minutes: 2880,
    status: 'Atendida',
    ong: 'Abrigo Esperança',
    photo: true,
    description:
      'Cão preso por corrente curta. Resgatado pela equipe da ONG.',
  },
]

const statusFilters: Array<'Todas' | ReportStatus> = [
  'Todas',
  'Pendente',
  'Encaminhada',
  'Atendida',
  'Rejeitada pela ONG',
  'Removida',
]

const statusClass: Record<ReportStatus, string> = {
  Pendente: 'st-analisar',
  Encaminhada: 'st-analisar',
  Atendida: 'st-mantido',
  'Rejeitada pela ONG': 'st-suspenso',
  Removida: 'st-removido',
}

const minutesLabel = (minutes: number) => {
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 1440) return `há ${Math.round(minutes / 60)} h`
  return `há ${Math.round(minutes / 1440)} dias`
}

const approvedOngs = [
  'Abrigo Esperança',
  'ONG Patas Unidas',
  'Clínica veterinária municipal',
]

export default function DenunciasPage() {
  const [reports, setReports] = useState(initialReports)
  const [filter, setFilter] = useState<'Todas' | ReportStatus>('Todas')
  const [selected, setSelected] = useState<Report | null>(null)
  const [ong, setOng] = useState(approvedOngs[0])
  const [message, setMessage] = useState(
    'Reforçamos a importância do atendimento desta ocorrência. Por favor, confirme o recebimento e atualize o status assim que possível.',
  )
  const [removalReason, setRemovalReason] = useState(
    'Denúncia duplicada',
  )
  const [justification, setJustification] = useState('')
  const [error, setError] = useState('')

  const count = (status: ReportStatus) =>
    reports.filter((report) => report.status === status).length

  const visibleReports =
    filter === 'Todas'
      ? reports
      : reports.filter((report) => report.status === filter)

  function updateReport(id: string, changes: Partial<Report>) {
    setReports((current) =>
      current.map((report) =>
        report.id === id ? { ...report, ...changes } : report,
      ),
    )
  }

  function openDetails(report: Report) {
    setSelected(report)
    setOng(report.ong || approvedOngs[0])
    setJustification('')
    setRemovalReason('Denúncia duplicada')
    setError('')
  }

  function forwardReport() {
    if (!selected) return

    updateReport(selected.id, {
      status: 'Encaminhada',
      ong,
    })

    setSelected(null)
  }

  function removeReport() {
    if (!selected) return

    if (!justification.trim()) {
      setError('Informe a justificativa da remoção.')
      return
    }

    updateReport(selected.id, { status: 'Removida' })
    setSelected(null)
  }

  return (
    <>
      <div className="wa-eyebrow">TRIAGEM E ACOMPANHAMENTO</div>

      <h1>Denúncias</h1>

      <p className="wa-subtitle">
        Maus-tratos, abandono e outras ocorrências enviadas pelo app.
      </p>

      <section className="wa-stats">
        <article className="wa-stat">
          <span>Recebidas</span>
          <strong>{reports.length}</strong>
          <small>Total</small>
        </article>

        <article className="wa-stat">
          <span>Atendidas</span>
          <strong>{count('Atendida')}</strong>
          <small>Animais resgatados</small>
        </article>

        <article className="wa-stat">
          <span>Sem atendimento</span>
          <strong>
            {count('Pendente') + count('Rejeitada pela ONG')}
          </strong>
          <small>Pendentes ou rejeitadas pela ONG</small>
        </article>

        <article className="wa-stat">
          <span>Encaminhadas</span>
          <strong>{count('Encaminhada')}</strong>
          <small>Aguardando a ONG</small>
        </article>
      </section>

      <div className="wa-filters" style={{ marginBottom: 16 }}>
        {statusFilters.map((status) => {
          const total =
            status === 'Todas' ? reports.length : count(status)

          return (
            <button
              key={status}
              type="button"
              className={filter === status ? 'active' : ''}
              onClick={() => setFilter(status)}
            >
              {status}
              <em className="wa-count">{total}</em>
            </button>
          )
        })}
      </div>

      <section className="wa-card wa-table-card">
        <div className="wa-table-wrap">
          <table className="wa-table wa-table-wide">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Ocorrência</th>
                <th>Denunciante</th>
                <th>Tempo</th>
                <th>ONG</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {visibleReports.length > 0 ? (
                visibleReports.map((report) => (
                  <tr key={report.id}>
                    <td className="wa-mono">{report.id}</td>

                    <td>
                      <strong>{report.title}</strong>
                      <small>{report.location}</small>
                    </td>

                    <td>{report.reporter}</td>

                    <td>{minutesLabel(report.minutes)}</td>

                    <td>{report.ong || '-'}</td>

                    <td>
                      <span
                        className={`wa-status-pill ${statusClass[report.status]}`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="wa-btn"
                        onClick={() => openDetails(report)}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="wa-empty">
                    Nada por aqui.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div
          className="wa-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null)
            }
          }}
        >
          <section className="wa-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="wa-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Fechar"
            >
              ×
            </button>

            <div className="wa-eyebrow">
              PROTOCOLO {selected.id}
            </div>

            <h2>{selected.title}</h2>

            <span
              className={`wa-status-pill ${statusClass[selected.status]}`}
            >
              {selected.status}
            </span>

            <div className="wa-photo">
              {selected.photo
                ? 'Foto anexada pelo denunciante'
                : 'Sem foto anexada'}
            </div>

            <p className="wa-body-copy">{selected.description}</p>

            <dl className="wa-details">
              <dt>Local</dt>
              <dd>{selected.location}</dd>

              <dt>Denunciante</dt>
              <dd>{selected.reporter}</dd>

              <dt>Aberta há</dt>
              <dd>{minutesLabel(selected.minutes)}</dd>

              <dt>ONG</dt>
              <dd>{selected.ong || 'Nenhuma'}</dd>
            </dl>

            {(selected.status === 'Pendente' ||
              selected.status === 'Rejeitada pela ONG') && (
              <>
                <label className="wa-moderation-field">
                  Encaminhar para ONG
                  <select
                    value={ong}
                    onChange={(event) => setOng(event.target.value)}
                  >
                    {approvedOngs.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wa-moderation-field">
                  Mensagem para a ONG
                  <span>(reforce o atendimento)</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>

                <div className="wa-actions">
                  <button
                    type="button"
                    className="wa-btn wa-btn-ok"
                    onClick={forwardReport}
                  >
                    Encaminhar
                  </button>
                </div>
              </>
            )}

            {selected.status !== 'Removida' &&
              selected.status !== 'Atendida' && (
                <>
                  <label className="wa-moderation-field">
                    Remover denúncia
                    <select
                      value={removalReason}
                      onChange={(event) =>
                        setRemovalReason(event.target.value)
                      }
                    >
                      <option>Denúncia duplicada</option>
                      <option>Conteúdo duvidoso</option>
                    </select>
                  </label>

                  <label className="wa-moderation-field">
                    Justificativa <span>(obrigatória)</span>
                    <textarea
                      value={justification}
                      onChange={(event) =>
                        setJustification(event.target.value)
                      }
                      placeholder="Informe o motivo da remoção."
                    />
                  </label>

                  {error && <p role="alert">{error}</p>}

                  <div className="wa-actions">
                    <button
                      type="button"
                      className="wa-btn wa-btn-danger"
                      onClick={removeReport}
                    >
                      Remover denúncia
                    </button>
                  </div>
                </>
              )}
          </section>
        </div>
      )}
    </>
  )
}
