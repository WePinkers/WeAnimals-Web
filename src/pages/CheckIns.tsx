import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import type { CheckInPeriod, CheckInRecord } from '../types'
import { useToast } from '../components/ToastContext'

interface CheckInsProps {
  checkIns: CheckInRecord[]
  selectedCheckInId: string
  onSelectCheckIn: (id: string) => void
  onMarkReviewed: (id: string) => void
}

export function CheckIns({
  checkIns,
  selectedCheckInId,
  onSelectCheckIn,
  onMarkReviewed,
}: CheckInsProps) {
  const { showToast } = useToast()
  const selected =
    checkIns.find((c) => c.id === selectedCheckInId) ?? checkIns[0]

  const [activePeriod, setActivePeriod] = useState<CheckInPeriod>(
    selected?.currentDays ?? 90,
  )

  if (!selected) {
    return (
      <section className="portal-page">
        <PageHeading>Check-ins pós-adoção</PageHeading>
        <div className="box">Nenhum check-in registrado.</div>
      </section>
    )
  }

  const answers = selected.reportsByPeriod[activePeriod] ?? []

  return (
    <section className="portal-page">
      <PageHeading>Check-ins pós-adoção</PageHeading>
      <div className="portal-grid checkins-grid">
        <div className="portal-card table-card">
          <table>
            <thead>
              <tr>
                <th>Animal / adotante</th>
                <th>Prazo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((item) => (
                <tr
                  key={item.id}
                  className={selected.id === item.id ? 'selected-row' : ''}
                  onClick={() => {
                    onSelectCheckIn(item.id)
                    setActivePeriod(item.currentDays)
                  }}
                >
                  <td>
                    <strong>{item.animal}</strong>
                    <small>{item.adopter}</small>
                  </td>
                  <td>{item.currentDays} dias</td>
                  <td>
                    <span
                      className={
                        'priority-badge ' +
                        (item.status === 'Ótima' ? 'ok' : 'in-progress')
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="portal-card checkin-detail">
          <div className="head" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>
              {selected.animal} · {selected.adopter}
            </h2>
            {!selected.reviewed ? (
              <button
                type="button"
                className="btn ap"
                onClick={() => {
                  onMarkReviewed(selected.id)
                  showToast(`Check-in de ${selected.animal} marcado como revisado!`)
                }}
              >
                ✓ Marcar como revisado
              </button>
            ) : (
              <span className="pill ok">Revisado</span>
            )}
          </div>

          <div className="status-chips">
            {([30, 90, 180] as const).map((days) => (
              <button
                type="button"
                key={days}
                className={'status-chip' + (activePeriod === days ? ' active' : '')}
                onClick={() => setActivePeriod(days)}
              >
                {days} dias
              </button>
            ))}
          </div>

          {answers.map((item) => (
            <div className="answer-row" key={item.label}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}