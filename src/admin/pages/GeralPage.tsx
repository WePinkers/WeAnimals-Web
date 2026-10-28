
type Activity = {
  category: string
  title: string
  description: string
  time: string
  page?: string
}

const activities: Activity[] = [
  {
    category: 'Denúncia',
    title: '#4512 Cão sendo agredido no quintal',
    description: 'Rua Voluntários, 88 · Zona Norte',
    time: 'há 6 min',
    page: 'den',
  },
  {
    category: 'Denúncia',
    title: '#4511 Filhote abandonado em caixa',
    description: 'Rua Aimberê · Vila Marlene',
    time: 'há 21 min',
    page: 'den',
  },
  {
    category: 'ONG aceita',
    title: 'Abrigo Esperança foi credenciada',
    description: 'Acesso liberado para criar a conta',
    time: 'há 25 min',
    page: 'ong',
  },
  {
    category: 'ONG nova',
    title: 'Amigos do Focinho pediu credenciamento',
    description: 'Documentos aguardando análise',
    time: 'há 5 h',
    page: 'ong',
  },
  {
    category: 'Perdido',
    title: 'Mimi (gata) · Vila Marlene',
    description: 'Perdida há 2 dias, anúncio de Júlia',
    time: 'há 1 h',
  },
]

const stats = [
  {
    label: 'Denúncias feitas',
    value: '8',
    description: 'Total registrado',
  },
  {
    label: 'Atendidas',
    value: '2',
    description: 'Animais resgatados',
  },
  {
    label: 'ONGs aceitas',
    value: '3',
    description: '2 solicitações em análise',
  },
  {
    label: 'Usuários novos',
    value: '2',
    description: 'Nos últimos 30 dias',
  },
]

type GeralPageProps = {
  onNavigate?: (page: string) => void
}

export default function GeralPage({ onNavigate }: GeralPageProps) {
  return (
    <div>
      <div className="wa-eyebrow">CENTRAL DE OPERAÇÕES</div>

      <h1>Visão geral</h1>

      <p className="wa-subtitle">
        Feed do que acontece no WeAnimals. Abra a aba de cada assunto
        para ver mais detalhes e monitorar.
      </p>

      <section className="wa-stats">
        {stats.map((stat) => (
          <article className="wa-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.description}</small>
          </article>
        ))}
      </section>

      <section className="wa-feed" aria-label="Atividades recentes">
        {activities.map((activity, index) => (
          <article className="wa-ev" key={`${activity.title}-${index}`}>
            <span
              className={`wa-tag ${
                activity.category === 'Denúncia'
                  ? 't3'
                  : activity.category === 'Perdido'
                    ? 't2'
                    : ''
              }`}
            >
              {activity.category}
            </span>

            <div>
              <strong>{activity.title}</strong>
              <small>{activity.description}</small>
            </div>

            <span className="wa-when">{activity.time}</span>

            {activity.page ? (
              <button
                className="wa-btn"
                type="button"
                onClick={() => onNavigate?.(activity.page!)}
              >
                Abrir
              </button>
            ) : (
              <span />
            )}
          </article>
        ))}
      </section>
    </div>
  )
}
