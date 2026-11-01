import type {
  AnimalItem,
  Candidate,
  CheckInRecord,
  Report,
} from '../types'
import { useToast } from '../components/ToastContext'

interface HomeProps {
  reports: Report[]
  animals: AnimalItem[]
  candidates: Candidate[]
  checkIns: CheckInRecord[]
  onOpenReport: (id: number) => void
  onOpenCandidates: (animalId?: string) => void
  onOpenCheckIns: (checkInId?: string) => void
}

export function Home({
  reports,
  animals,
  candidates,
  checkIns,
  onOpenReport,
  onOpenCandidates,
  onOpenCheckIns,
}: HomeProps) {
  const { showToast } = useToast()

  const activeReports = reports.filter((r) => r.status !== 'Encaminhado a abrigo')
  const pendingCandidates = candidates.filter((c) => c.status === 'pendente')
  const pendingCheckIns = checkIns.filter((c) => !c.reviewed)

  const topCandidate = pendingCandidates[0] ?? candidates[0]
  const topAnimal = animals.find((a) => a.id === topCandidate?.animalId) ?? animals[0]
  const latestCheckIn = checkIns[0]

  return (
    <section className="portal-page">
      <h1 className="portal-page-title">Painel da ONG</h1>
      <div className="verified-message">✓ Organização parceira verificada</div>

      <div className="portal-grid g3" style={{ marginBottom: 24 }}>
        <StatCard
          value={String(pendingCandidates.length)}
          label="candidaturas pendentes"
          onClick={() => {
            onOpenCandidates(topAnimal?.id)
            showToast('Abrindo candidaturas...', '🐾')
          }}
        />
        <StatCard
          value={String(activeReports.length)}
          label="denúncias ativas"
          onClick={() => {
            if (activeReports[0]) onOpenReport(activeReports[0].id)
            showToast('Abrindo denúncias...', '🚨')
          }}
        />
        <StatCard
          value={String(pendingCheckIns.length)}
          label="check-ins para revisar"
          onClick={() => {
            onOpenCheckIns(pendingCheckIns[0]?.id)
            showToast('Abrindo check-ins...', '◷')
          }}
        />
      </div>

      <div className="portal-grid home-grid">
        <div className="portal-card">
          <h2>Precisa de atenção</h2>
          <div className="attention-list">
            {activeReports.map((report) => (
              <button
                key={report.id}
                type="button"
                className="attention-row"
                onClick={() => onOpenReport(report.id)}
              >
                <span className="attention-icon urgent-icon">!</span>
                <span>
                  <strong>
                    Denúncia #{report.id} · {report.title} ({report.location})
                  </strong>
                  <small>
                    {report.status} · {report.elapsed}
                  </small>
                </span>
                <span className={`priority-badge ${report.priorityClass}`}>
                  {report.priority}
                </span>
              </button>
            ))}

            {activeReports.length === 0 && (
              <div className="box">Nenhuma ocorrência urgente pendente no momento.</div>
            )}
          </div>
        </div>

        <div className="portal-card">
          <h2>Candidaturas de adoção</h2>
          {topAnimal && topCandidate ? (
            <button
              type="button"
              className="compact-row"
              onClick={() => onOpenCandidates(topAnimal.id)}
            >
              <span className="attention-icon">🐾</span>
              <span>
                <strong>
                  {topAnimal.name} ·{' '}
                  {candidates.filter((c) => c.animalId === topAnimal.id).length} candidatos
                </strong>
                <small>Mais compatível: {topCandidate.name}</small>
              </span>
              <b>{topCandidate.pct}%</b>
            </button>
          ) : (
            <div className="box">Sem candidaturas registradas.</div>
          )}

          <h2 className="second-card-title">Check-ins pós-adoção</h2>
          {latestCheckIn ? (
            <button
              type="button"
              className="compact-row"
              onClick={() => onOpenCheckIns(latestCheckIn.id)}
            >
              <span className="attention-icon">◷</span>
              <span>
                <strong>
                  {latestCheckIn.animal} · {latestCheckIn.currentDays} dias
                </strong>
                <small>
                  Adotante: {latestCheckIn.adopter} · adaptação {latestCheckIn.status.toLowerCase()}
                </small>
              </span>
              <span
                className={`priority-badge ${
                  latestCheckIn.status === 'Ótima' ? 'ok' : 'in-progress'
                }`}
              >
                {latestCheckIn.status}
              </span>
            </button>
          ) : (
            <div className="box">Sem check-ins no momento.</div>
          )}
        </div>
      </div>
    </section>
  )
}

function StatCard({
  value,
  label,
  onClick,
}: {
  value: string
  label: string
  onClick?: () => void
}) {
  return (
    <div
      className="portal-card stat-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.()
      }}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}