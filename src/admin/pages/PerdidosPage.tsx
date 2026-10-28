
import { useMemo, useState } from 'react'

type AnimalStatus = 'Perdido' | 'Encontrado' | 'Devolvido'

type AnimalListing = {
  id: string
  animal: string
  type: AnimalStatus
  location: string
  description: string
  responsible: string
  days: number
  status: AnimalStatus
  lastRevalidation?: string
}

type ListingFilter = 'Todos' | 'Perdidos' | 'Encontrados' | 'Encerrados'

const initialListings: AnimalListing[] = [
  {
    id: 'ACH-001',
    animal: 'Thor (cão)',
    type: 'Encontrado',
    location: 'Av. Brasil, km 4',
    description: 'Encontrado por Marcos, aguardando o tutor',
    responsible: 'Marcos',
    days: 35,
    status: 'Encontrado',
  },
  {
    id: 'ACH-002',
    animal: 'Mimi (gata)',
    type: 'Perdido',
    location: 'Vila Marlene',
    description: 'Perdida há 2 dias, anúncio de Júlia',
    responsible: 'Júlia',
    days: 2,
    status: 'Perdido',
  },
  {
    id: 'ACH-003',
    animal: 'Mel (cadela)',
    type: 'Encontrado',
    location: 'Praça Central',
    description: 'Devolvida à tutora Camila',
    responsible: 'Camila',
    days: 10,
    status: 'Devolvido',
  },
  {
    id: 'ACH-004',
    animal: 'Bob (cão)',
    type: 'Perdido',
    location: 'Jardim Sul',
    description: 'Perdido ontem, anúncio de Diego',
    responsible: 'Diego',
    days: 1,
    status: 'Perdido',
  },
]

const filters: ListingFilter[] = [
  'Todos',
  'Perdidos',
  'Encontrados',
  'Encerrados',
]

function getStatusClass(status: AnimalStatus) {
  switch (status) {
    case 'Perdido':
      return 'st-suspenso'
    case 'Encontrado':
      return 'st-analisar'
    case 'Devolvido':
      return 'st-mantido'
  }
}

function formatAge(days: number) {
  if (days === 1) return '1 dia'
  return `${days} dias`
}

export default function PerdidosPage() {
  const [listings, setListings] =
    useState<AnimalListing[]>(initialListings)
  const [filter, setFilter] = useState<ListingFilter>('Todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const selected = listings.find((item) => item.id === selectedId)

  const filteredListings = useMemo(() => {
    switch (filter) {
      case 'Perdidos':
        return listings.filter((item) => item.status === 'Perdido')
      case 'Encontrados':
        return listings.filter((item) => item.status === 'Encontrado')
      case 'Encerrados':
        return listings.filter((item) => item.status === 'Devolvido')
      default:
        return listings
    }
  }, [listings, filter])

  function updateStatus(status: AnimalStatus) {
    if (!selected) return

    setListings((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, status } : item,
      ),
    )

    setFeedback(
      status === 'Devolvido'
        ? 'Anúncio atualizado: animal voltou para casa.'
        : status === 'Encontrado'
          ? 'Anúncio atualizado: animal encontrado, aguardando o tutor.'
          : 'Situação do anúncio atualizada.',
    )
  }

  function revalidateListing() {
    if (!selected) return

    const today = new Date().toLocaleDateString('pt-BR')

    setListings((current) =>
      current.map((item) =>
        item.id === selected.id
          ? { ...item, lastRevalidation: today }
          : item,
      ),
    )

    setFeedback(
      'Revalidação registrada nesta demonstração. O envio de e-mail ainda não está conectado.',
    )
  }

  return (
    <>
      <div className="wa-eyebrow">ACOMPANHAMENTO DE ANÚNCIOS</div>
      <h1>Achados e perdidos</h1>
      <p className="wa-subtitle">
        Acompanhe animais perdidos e encontrados e mantenha os anúncios
        atualizados até a resolução do caso.
      </p>

      <div className="wa-stats">
        <div className="wa-stat">
          <span>Total de anúncios</span>
          <strong>{listings.length}</strong>
          <small>Registros de demonstração</small>
        </div>

        <div className="wa-stat">
          <span>Animais perdidos</span>
          <strong>
            {listings.filter((item) => item.status === 'Perdido').length}
          </strong>
          <small>Aguardando localização</small>
        </div>

        <div className="wa-stat">
          <span>Encontrados</span>
          <strong>
            {listings.filter((item) => item.status === 'Encontrado').length}
          </strong>
          <small>Aguardando o tutor</small>
        </div>

        <div className="wa-stat">
          <span>Encerrados</span>
          <strong>
            {listings.filter((item) => item.status === 'Devolvido').length}
          </strong>
          <small>Animal voltou para casa</small>
        </div>
      </div>

      <div className="wa-filters">
        {filters.map((option) => {
          const count =
            option === 'Todos'
              ? listings.length
              : option === 'Perdidos'
                ? listings.filter((item) => item.status === 'Perdido').length
                : option === 'Encontrados'
                  ? listings.filter((item) => item.status === 'Encontrado').length
                  : listings.filter((item) => item.status === 'Devolvido').length

          return (
            <button
              key={option}
              type="button"
              className={filter === option ? 'active' : ''}
              onClick={() => setFilter(option)}
            >
              {option} <span className="wa-count">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="wa-card wa-table-card">
        <div className="wa-table-wrap">
          <table className="wa-table wa-table-wide">
            <thead>
              <tr>
                <th>Animal / protocolo</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Responsável</th>
                <th>Tempo</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredListings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.animal}</strong>
                    <small className="wa-mono">{item.id}</small>
                  </td>

                  <td>{item.type}</td>
                  <td>{item.location}</td>
                  <td>{item.responsible}</td>
                  <td>{formatAge(item.days)}</td>

                  <td>
                    <span
                      className={`wa-status-pill ${getStatusClass(item.status)}`}
                    >
                      {item.status === 'Devolvido'
                        ? 'Animal voltou para casa'
                        : item.status === 'Encontrado'
                          ? 'Aguardando tutor'
                          : 'Perdido'}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="wa-btn"
                      onClick={() => {
                        setSelectedId(item.id)
                        setFeedback('')
                      }}
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}

              {filteredListings.length === 0 && (
                <tr>
                  <td colSpan={7} className="wa-empty">
                    Nenhum anúncio encontrado neste filtro.
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
          onClick={() => setSelectedId(null)}
        >
          <section
            className="wa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="wa-modal-close"
              aria-label="Fechar"
              onClick={() => setSelectedId(null)}
            >
              ×
            </button>

            <div className="wa-eyebrow">ANÚNCIO {selected.id}</div>
            <h2 id="listing-modal-title">{selected.animal}</h2>

            <span
              className={`wa-status-pill ${getStatusClass(selected.status)}`}
            >
              {selected.status === 'Devolvido'
                ? 'Animal voltou para casa'
                : selected.status === 'Encontrado'
                  ? 'Aguardando tutor'
                  : 'Perdido'}
            </span>

            <div className="wa-card" style={{ marginTop: 16 }}>
              <div className="wa-details">
                <strong>Tipo de anúncio</strong>
                <span>{selected.type}</span>

                <strong>Local</strong>
                <span>{selected.location}</span>

                <strong>Responsável</strong>
                <span>{selected.responsible}</span>

                <strong>Tempo registrado</strong>
                <span>{formatAge(selected.days)}</span>

                <strong>Descrição</strong>
                <span>{selected.description}</span>

                <strong>Última revalidação</strong>
                <span>{selected.lastRevalidation ?? 'Ainda não registrada'}</span>
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">
                <strong>Atualizar anúncio</strong>
              </div>

              <p className="wa-subtitle">
                Registre o resultado informado para manter a situação do
                anúncio atualizada.
              </p>

              <div className="wa-actions">
                {selected.status !== 'Encontrado' && (
                  <button
                    type="button"
                    className="wa-btn wa-btn-ok"
                    onClick={() => updateStatus('Encontrado')}
                  >
                    Animal encontrado
                  </button>
                )}

                {selected.status !== 'Devolvido' && (
                  <button
                    type="button"
                    className="wa-btn"
                    onClick={() => updateStatus('Devolvido')}
                  >
                    Voltou para casa
                  </button>
                )}

                {selected.status !== 'Perdido' && (
                  <button
                    type="button"
                    className="wa-btn"
                    onClick={() => updateStatus('Perdido')}
                  >
                    Marcar como perdido
                  </button>
                )}
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">
                <strong>Revalidar anúncio</strong>
              </div>

              <p className="wa-subtitle">
                Registre que o responsável confirmou que o anúncio continua
                válido. A integração de e-mail será feita posteriormente.
              </p>

              <button
                type="button"
                className="wa-btn"
                onClick={revalidateListing}
              >
                Registrar revalidação
              </button>
            </div>

            {feedback && (
              <p role="status" className="wa-subtitle">
                {feedback}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
