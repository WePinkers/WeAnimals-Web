import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import type { CheckInPeriod, CheckInRecord } from '../types'

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
  const selected =
    checkIns.find((c) => c.id === selectedCheckInId) ?? checkIns[0]

  const [activePeriod, setActivePeriod] = useState<CheckInPeriod>(
    selected?.currentDays ?? 90,
  )

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  if (!checkIns || checkIns.length === 0) {
    return (
      <section className="portal-page">
        <PageHeading>Check-ins pós-adoção</PageHeading>
        <div className="portal-card" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          Nenhum check-in pós-adoção registrado no momento.
        </div>
      </section>
    )
  }

  const answers = selected?.reportsByPeriod[activePeriod] ?? []

  return (
    <section className="portal-page">
      <div className="head" style={{ marginBottom: 16 }}>
        <div>
          <PageHeading>Check-ins pós-adoção</PageHeading>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Monitorize o bem-estar dos animais adotados através dos relatórios periódicos enviados pelos tutores.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="pill ok" style={{ padding: '6px 12px', fontSize: '12px' }}>
            {checkIns.filter(c => !c.reviewed).length} pendentes de revisão
          </span>
        </div>
      </div>

      <div className="portal-grid checkins-grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: '20px' }}>
        <div className="portal-card table-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ln)', background: '#f8fafc' }}>
            <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>Adoções em Acompanhamento</strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fdfdfd', borderBottom: '1px solid var(--ln)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>Animal / Adotante</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>Prazo</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>Status</th>
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
                  style={{
                    cursor: 'pointer',
                    background: selected.id === item.id ? '#f1f5f9' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>{item.animal}</strong>
                    <small style={{ color: '#64748b', fontSize: '12px' }}>{item.adopter}</small>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>{item.currentDays} dias</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: item.status === 'Ótima' ? '#dcfce7' : '#fef9c3',
                        color: item.status === 'Ótima' ? '#166534' : '#854d0e',
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="portal-card checkin-detail" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
          <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--ln)', paddingBottom: '16px', margin: 0 }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                Relatório do Tutor
              </span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#1e293b' }}>
                {selected.animal} <span style={{ fontWeight: 400, color: '#64748b' }}>· {selected.adopter}</span>
              </h2>
            </div>
            {!selected.reviewed ? (
              <button
                type="button"
                className="btn ap"
                onClick={() => onMarkReviewed(selected.id)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                ✓ Marcar como revisado
              </button>
            ) : (
              <span className="pill ok" style={{ padding: '6px 14px', fontSize: '12px' }}>
                ✓ Revisado pela ONG
              </span>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
              Período de Acompanhamento
            </div>
            <div className="status-chips" style={{ display: 'flex', gap: '8px' }}>
              {([30, 90, 180] as const).map((days) => (
                <button
                  type="button"
                  key={days}
                  className={'status-chip' + (activePeriod === days ? ' active' : '')}
                  onClick={() => setActivePeriod(days)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: activePeriod === days ? '2px solid var(--p7, #2d5a3c)' : '1px solid var(--ln)',
                    background: activePeriod === days ? 'var(--p7, #2d5a3c)' : '#fff',
                    color: activePeriod === days ? '#fff' : '#334155',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  {days} dias
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Respostas do Questionário ({activePeriod} dias)
            </div>

            {answers.length === 0 ? (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Nenhum relatório submetido para este período ainda.
              </div>
            ) : (
              answers.map((item) => (
                <div
                  key={item.label}
                  className="answer-row"
                  style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    border: '1px solid var(--ln)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <small style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>{item.label}</small>
                  <strong style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{item.value}</strong>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--ln)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Status geral: <strong style={{ color: '#166534' }}>{selected.status}</strong>
            </span>
            <button
              type="button"
              className="outline-button"
              onClick={() => setIsHistoryModalOpen(true)}
              style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}
            >
              Ver histórico completo
            </button>
          </div>
        </div>
      </div>

      {isHistoryModalOpen && (
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
          onClick={() => setIsHistoryModalOpen(false)}
        >
          <div
            className="portal-card"
            style={{
              width: 'min(100%, 600px)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#fff',
              padding: '28px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Histórico Geral de Acompanhamento</span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#1e293b' }}>{selected.animal} · Tutor: {selected.adopter}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px', marginTop: '16px' }}>
              {Object.entries(selected.reportsByPeriod).map(([periodKey, periodReports]) => (
                <div key={periodKey} style={{ border: '1px solid var(--ln)', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--ln)', paddingBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--p7, #2d5a3c)' }}>Acompanhamento de {periodKey} dias</strong>
                    <span className="pill ok" style={{ fontSize: '11px' }}>Concluído</span>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(periodReports as Array<{ label: string; value: string }>).map((rep, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>{rep.label}:</span>
                        <strong style={{ color: '#1e293b' }}>{rep.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}