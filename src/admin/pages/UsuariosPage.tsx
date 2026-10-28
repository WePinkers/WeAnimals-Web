
import { useMemo, useState } from 'react'

type UserStatus = 'Ativo' | 'Advertido' | 'Suspenso' | 'Banido'

type ActivityType =
  | 'Comunidade'
  | 'Comentários'
  | 'Denúncias'
  | 'Achados e perdidos'

type User = {
  name: string
  score: number
  age: number
  reports: number
  community: number
  foundLost: number
  lastActivity: string
  status: UserStatus
  suspensionPeriod?: string
  justification?: string
}

type Activity = {
  type: ActivityType
  description: string
  when: string
}

const initialUsers: User[] = [
  {
    name: 'Renata Ferreira',
    score: 100,
    age: 600,
    reports: 8,
    community: 5,
    foundLost: 2,
    lastActivity: 'hoje',
    status: 'Ativo',
  },
  {
    name: 'Marta Nunes',
    score: 91,
    age: 420,
    reports: 12,
    community: 9,
    foundLost: 3,
    lastActivity: 'hoje',
    status: 'Ativo',
  },
  {
    name: 'Paulo Mendes',
    score: 88,
    age: 300,
    reports: 5,
    community: 4,
    foundLost: 0,
    lastActivity: 'ontem',
    status: 'Ativo',
  },
  {
    name: 'João Klein',
    score: 62,
    age: 250,
    reports: 7,
    community: 6,
    foundLost: 1,
    lastActivity: 'há 2 dias',
    status: 'Ativo',
  },
  {
    name: 'Rafael T.',
    score: 18,
    age: 200,
    reports: 3,
    community: 11,
    foundLost: 0,
    lastActivity: 'há 3 dias',
    status: 'Ativo',
  },
  {
    name: 'Lucas Prado',
    score: 12,
    age: 150,
    reports: 9,
    community: 14,
    foundLost: 1,
    lastActivity: 'hoje',
    status: 'Ativo',
  },
  {
    name: 'Bianca Rocha',
    score: 50,
    age: 3,
    reports: 0,
    community: 1,
    foundLost: 0,
    lastActivity: 'hoje',
    status: 'Ativo',
  },
  {
    name: 'Tiago Melo',
    score: 15,
    age: 9,
    reports: 1,
    community: 2,
    foundLost: 1,
    lastActivity: 'ontem',
    status: 'Ativo',
  },
]

const activityExamples: Record<ActivityType, string[]> = {
  Comunidade: [
    'Publicou "Filhotes para adoção, chama no zap"',
    'Publicou uma campanha de arrecadação',
    'Publicou "Alguém viu esse cão?"',
  ],
  Comentários: [
    'Comentou "Isso é mentira, ninguém foi lá"',
    'Comentou em publicação de uma ONG',
    'Comentou "Obrigado pelo resgate!"',
  ],
  Denúncias: [
    'Denunciou "Cão ferido na perna" (#4506)',
    'Denunciou "Gato preso em telhado" (#4509)',
    'Denunciou "Cães soltos na avenida" (#4490)',
  ],
  'Achados e perdidos': [
    'Anunciou cão encontrado na Av. Brasil',
    'Anunciou gata perdida na Vila Marlene',
    'Respondeu ao anúncio da Mimi',
  ],
}

const activityTimes = ['há 2 h', 'ontem', 'há 3 dias', 'há 5 dias']

const filterOptions = [
  'Todos',
  'Em atenção',
  'Novos',
  'Suspensos e banidos',
] as const

type UserFilter = (typeof filterOptions)[number]

const activityFilters = [
  'Todas',
  ...Object.keys(activityExamples),
] as const

type ActivityFilter = (typeof activityFilters)[number]

function isAttentionUser(user: User) {
  return user.score < 20 && user.age >= 30
}

function statusClass(status: UserStatus) {
  switch (status) {
    case 'Ativo':
      return 'st-mantido'
    case 'Advertido':
      return 'st-suspenso'
    case 'Suspenso':
      return 'st-suspenso'
    case 'Banido':
      return 'st-removido'
  }
}

function getActivities(user: User, filter: ActivityFilter): Activity[] {
  const counts: Record<ActivityType, number> = {
    Comunidade: user.community,
    Comentários: user.community * 2,
    Denúncias: user.reports,
    'Achados e perdidos': user.foundLost,
  }

  return (Object.keys(activityExamples) as ActivityType[])
    .filter((type) => filter === 'Todas' || type === filter)
    .flatMap((type) =>
      activityExamples[type]
        .slice(0, Math.min(3, counts[type]))
        .map((description, index) => ({
          type,
          description,
          when: activityTimes[(index + user.name.length) % 4],
        })),
    )
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [filter, setFilter] = useState<UserFilter>('Todos')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [activityFilter, setActivityFilter] =
    useState<ActivityFilter>('Todas')
  const [justification, setJustification] = useState('')
  const [suspensionPeriod, setSuspensionPeriod] = useState('7 dias')
  const [feedback, setFeedback] = useState('')

  const selected = users.find((user) => user.name === selectedUser)

  const filteredUsers = useMemo(() => {
    switch (filter) {
      case 'Em atenção':
        return users.filter(isAttentionUser)
      case 'Novos':
        return users.filter((user) => user.age < 30)
      case 'Suspensos e banidos':
        return users.filter((user) =>
          ['Suspenso', 'Banido'].includes(user.status),
        )
      default:
        return users
    }
  }, [users, filter])

  function openUser(name: string) {
    setSelectedUser(name)
    setActivityFilter('Todas')
    setJustification('')
    setFeedback('')
  }

  function applyMeasure(action: UserStatus) {
    if (!selected) return

    if (!justification.trim()) {
      setFeedback('Informe a justificativa antes de continuar.')
      return
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.name === selected.name
          ? {
              ...user,
              status: action,
              suspensionPeriod:
                action === 'Suspenso' ? suspensionPeriod : undefined,
              justification: justification.trim(),
            }
          : user,
      ),
    )

    setFeedback(
      action === 'Ativo'
        ? 'Usuário reativado nesta demonstração.'
        : `Medida "${action}" aplicada nesta demonstração.`,
    )
    setJustification('')
  }

  return (
    <>
      <div className="wa-eyebrow">COMUNIDADE</div>
      <h1>Usuários e reputação</h1>
      <p className="wa-subtitle">
        Monitore a atividade na comunidade, em denúncias e em achados e
        perdidos.
      </p>

      <div className="wa-stats">
        <div className="wa-stat">
          <span>Usuários</span>
          <strong>{users.length}</strong>
          <small>Cadastrados (amostra)</small>
        </div>

        <div className="wa-stat">
          <span>Em atenção</span>
          <strong>{users.filter(isAttentionUser).length}</strong>
          <small>Score abaixo de 20% e não novos</small>
        </div>

        <div className="wa-stat">
          <span>Ótimo score</span>
          <strong>{users.filter((user) => user.score === 100).length}</strong>
          <small>Usuários com 100%</small>
        </div>

        <div className="wa-stat">
          <span>Suspensos e banidos</span>
          <strong>
            {
              users.filter((user) =>
                ['Suspenso', 'Banido'].includes(user.status),
              ).length
            }
          </strong>
          <small>Acesso restrito</small>
        </div>
      </div>

      <div className="wa-filters">
        {filterOptions.map((option) => {
          const count =
            option === 'Todos'
              ? users.length
              : option === 'Em atenção'
                ? users.filter(isAttentionUser).length
                : option === 'Novos'
                  ? users.filter((user) => user.age < 30).length
                  : users.filter((user) =>
                      ['Suspenso', 'Banido'].includes(user.status),
                    ).length

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
                <th>Usuário</th>
                <th>Score</th>
                <th>Atividade</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.name}>
                  <td>
                    <div className="wa-who">
                      <div className="wa-avatar">
                        {user.name.charAt(0)}
                      </div>

                      <div>
                        <strong>{user.name}</strong>
                        <small
                          style={
                            isAttentionUser(user)
                              ? { color: '#a83232' }
                              : undefined
                          }
                        >
                          {isAttentionUser(user)
                            ? 'Em atenção: reputação crítica'
                            : user.age < 30
                              ? 'Usuário novo'
                              : `Cadastro há ${user.age} dias`}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div
                      className={`wa-score ${user.score < 20 ? 'low' : ''}`}
                    >
                      <span>{user.score}%</span>
                      <div>
                        <i style={{ width: `${user.score}%` }} />
                      </div>
                    </div>
                    {user.score === 100 && <small>Ótimo</small>}
                  </td>

                  <td>
                    <small>
                      Denúncias {user.reports} · Comunidade {user.community} ·
                      Achados {user.foundLost}
                    </small>
                  </td>

                  <td>
                    <span className={`wa-status-pill ${statusClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="wa-btn"
                      type="button"
                      onClick={() => openUser(user.name)}
                    >
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="wa-empty">
                    Nenhum usuário encontrado neste filtro.
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
          onClick={() => setSelectedUser(null)}
        >
          <section
            className="wa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="wa-modal-close"
              aria-label="Fechar"
              onClick={() => setSelectedUser(null)}
            >
              ×
            </button>

            <div className="wa-who">
              <div className="wa-avatar">
                {selected.name.charAt(0)}
              </div>

              <div>
                <h2 id="user-modal-title" style={{ margin: 0 }}>
                  {selected.name}
                </h2>
                <small>
                  Cadastro há {selected.age} dia(s) · última atividade{' '}
                  {selected.lastActivity}
                </small>
              </div>

              <span className={`wa-status-pill ${statusClass(selected.status)}`}>
                {selected.status}
              </span>
            </div>

            {isAttentionUser(selected) && (
              <div className="wa-moderation-warning">
                Reputação crítica: score abaixo de 20% em usuário que não é
                novo. Acompanhe as atividades abaixo.
              </div>
            )}

            <div className="wa-mini">
              <div className="wa-stat">
                <span>Score</span>
                <strong>{selected.score}%</strong>
                <small>
                  {selected.score === 100
                    ? 'Ótimo'
                    : selected.age < 30
                      ? 'Usuário novo'
                      : 'Reputação'}
                </small>
              </div>

              <div className="wa-stat">
                <span>Denúncias</span>
                <strong>{selected.reports}</strong>
                <small>Enviadas</small>
              </div>

              <div className="wa-stat">
                <span>Comunidade</span>
                <strong>{selected.community}</strong>
                <small>Publicações</small>
              </div>

              <div className="wa-stat">
                <span>Achados</span>
                <strong>{selected.foundLost}</strong>
                <small>Anúncios</small>
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">
                <strong>Atividade do usuário</strong>
                <span>Filtre por tipo</span>
              </div>

              <div className="wa-filters" style={{ marginBottom: 10 }}>
                {activityFilters.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={activityFilter === option ? 'active' : ''}
                    onClick={() => setActivityFilter(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="wa-log">
                {getActivities(selected, activityFilter).length > 0 ? (
                  getActivities(selected, activityFilter).map(
                    (activity, index) => (
                      <div className="wa-le" key={`${activity.type}-${index}`}>
                        <span className="wa-tag">{activity.type}</span>
                        <div>
                          <strong>{activity.description}</strong>
                          <small>{activity.when}</small>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <small>Nenhuma atividade neste filtro.</small>
                )}
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">
                <strong>Aplicar medida</strong>
              </div>

              <label className="wa-moderation-field">
                Justificativa <span>(obrigatória)</span>
                <textarea
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                  placeholder="Explique o motivo da medida..."
                  rows={3}
                />
              </label>

              <label className="wa-moderation-field">
                Prazo, se for suspender
                <select
                  value={suspensionPeriod}
                  onChange={(event) => setSuspensionPeriod(event.target.value)}
                >
                  <option>24 horas</option>
                  <option>7 dias</option>
                  <option>30 dias</option>
                </select>
              </label>

              {selected.justification && (
                <p className="wa-subtitle">
                  Última justificativa registrada: {selected.justification}
                  {selected.suspensionPeriod &&
                    ` · Prazo: ${selected.suspensionPeriod}`}
                </p>
              )}

              {feedback && (
                <p role="status" className="wa-subtitle">
                  {feedback}
                </p>
              )}

              <div className="wa-actions">
                <button
                  type="button"
                  className="wa-btn"
                  onClick={() => applyMeasure('Advertido')}
                >
                  Advertir
                </button>

                <button
                  type="button"
                  className="wa-btn wa-btn-warn"
                  onClick={() => applyMeasure('Suspenso')}
                >
                  Suspender
                </button>

                <button
                  type="button"
                  className="wa-btn wa-btn-danger"
                  onClick={() => applyMeasure('Banido')}
                >
                  Banir
                </button>

                {selected.status !== 'Ativo' && (
                  <button
                    type="button"
                    className="wa-btn"
                    onClick={() => applyMeasure('Ativo')}
                  >
                    Reativar
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
