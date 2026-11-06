import type {
  AnimalItem,
  Candidate,
  CheckInRecord,
  Report,
} from '../types'

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
  const activeReports = reports.filter((r) => r.status !== 'Encaminhado a abrigo')
  const pendingCandidates = candidates.filter((c) => c.status === 'pendente')
  const pendingCheckIns = checkIns.filter((c) => !c.reviewed)

  const topCandidate = pendingCandidates[0] ?? candidates[0]
  const topAnimal = animals.find((a) => a.id === topCandidate?.animalId) ?? animals[0]

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
          }}
        />
        <StatCard
          value={String(activeReports.length)}
          label="denúncias ativas"
          onClick={() => {
            if (activeReports[0]) onOpenReport(activeReports[0].id)
          }}
        />
        <StatCard
          value={String(pendingCheckIns.length)}
          label="check-ins para revisar"
          onClick={() => {
            onOpenCheckIns(pendingCheckIns[0]?.id)
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
                    Denúncia #{report.protocolNumber ?? report.id} · {report.title} ({report.location})
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
          {candidates.length > 0 ? (
            <div className="home-candidate-list">
              {candidates.map((candidate) => {
                const animal = animals.find((item) => item.id === candidate.animalId)
                const photo = animal?.photos?.[0]
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className="compact-row home-candidate-row"
                    onClick={() => onOpenCandidates(candidate.animalId)}
                  >
                    {photo ? (
                      <img
                        className="home-candidate-animal-photo"
                        src={photo}
                        alt={`Foto de ${animal?.name ?? 'animal'}`}
                      />
                    ) : (
                      <span className="attention-icon">🐾</span>
                    )}
                    <span>
                      <strong>{animal?.name ?? 'Animal'}</strong>
                      <small>{candidate.name} · {candidate.pct}% compatível</small>
                    </span>
                    <b>{candidate.pct}%</b>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="box">Sem candidaturas registradas.</div>
          )}

          <h2 className="second-card-title">Check-ins pós-adoção</h2>
          {checkIns.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {checkIns.map((checkIn) => (
                <button
                  key={checkIn.id}
                  type="button"
                  className="compact-row"
                  onClick={() => onOpenCheckIns(checkIn.id)}
                >
                  {checkIn.photoUrl ? (
                    <img
                      src={checkIn.photoUrl}
                      alt={`Foto de ${checkIn.animal}`}
                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--ln)', flexShrink: 0 }}
                    />
                  ) : (
                    <span className="attention-icon">🐾</span>
                  )}
                  <span>
                    <strong>
                      {checkIn.animal} · {checkIn.currentDays} dias
                    </strong>
                    <small>
                      Adotante: {checkIn.adopter} · adaptação {checkIn.status.toLowerCase()}
                    </small>
                  </span>
                  <span
                    className={`priority-badge ${
                      checkIn.status === 'Ótima' || checkIn.status === 'Boa' ? 'ok' : 'in-progress'
                    }`}
                  >
                    {checkIn.status}
                  </span>
                </button>
              ))}
            </div>
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
