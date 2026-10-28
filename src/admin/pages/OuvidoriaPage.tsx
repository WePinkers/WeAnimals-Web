import { useMemo, useState } from 'react'

type Status = 'pendente' | 'suspenso' | 'removido' | 'mantido'

type Aba = 'fila' | 'historico'

type Manifestacao = {

  id: string

  requester: string

  title: string

  author: string

  category: string

  reason: string

  reports: number

  priority: 'Alta' | 'Média' | 'Baixa'

  received: string

  description: string

  details: string

  status: Status

  decision?: {

    at: string

    admin: string

    measure: string

    justification: string

  }

}

const GROUPS = [

  {

    name: 'Denúncias',

    types: [

      'Denúncia de usuário',

      'Denúncia contra ONG',

      'Denúncia falsa',

    ],

  },

  {

    name: 'Golpes e fraudes',

    types: ['Campanha suspeita', 'Suposto golpe'],

  },

  {

    name: 'Conteúdo',

    types: ['Comunidade', 'Achados e perdidos'],

  },

  {

    name: 'Atendimento',

    types: ['Problema técnico', 'Contestação', 'Solicitação'],

  },

]

const HISTORY_FILTERS = ['Todas', 'Suspenso', 'Removido', 'Mantido']

const INITIAL_CASES: Manifestacao[] = [

  {

    id: 'WA-2026-000123',

    requester: 'Marta Nunes',

    title: 'Vendo filhotes de pit bull, chama no zap',

    author: 'Rafael T.',

    category: 'Comunidade',

    reason: 'Venda de animais',

    reports: 4,

    priority: 'Alta',

    received: '14/10/2026',

    description:

      'Publicação oferecendo filhotes e direcionando o contato para WhatsApp.',

    details:

      'Confira o conteúdo integral e as regras aplicáveis antes de decidir.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000124',

    requester: 'Renata Ferreira',

    title: 'Isso é mentira, ninguém foi lá',

    author: 'Lucas Prado',

    category: 'Comunidade',

    reason: 'Possível conteúdo ofensivo',

    reports: 1,

    priority: 'Baixa',

    received: '14/10/2026',

    description: 'Comentário denunciado por possível conteúdo ofensivo.',

    details:

      'Considere o contexto da conversa para avaliar se houve violação.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000125',

    requester: 'Paulo Mendes',

    title: 'Pedem dinheiro para devolver cachorro encontrado',

    author: 'Perfil: Ajuda Animal SP',

    category: 'Achados e perdidos',

    reason: 'Suposto golpe / pedido de dinheiro',

    reports: 3,

    priority: 'Alta',

    received: '13/10/2026',

    description:

      'Relato de que o perfil estaria exigindo pagamento para entregar um cachorro encontrado.',

    details:

      'Revise mensagens, comprovantes e demais evidências anexadas. A denúncia, sozinha, não comprova a infração.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000126',

    requester: 'ONG Patas Unidas',

    title: 'Denúncia possivelmente falsa contra uma ONG',

    author: 'Marina S.',

    category: 'Denúncia falsa',

    reason: 'Suspeita de denúncia de má-fé',

    reports: 2,

    priority: 'Alta',

    received: '13/10/2026',

    description:

      'Uma ONG contestou a denúncia e apresentou informações divergentes.',

    details:

      'Compare a denúncia original com as evidências disponíveis e registre os fundamentos da decisão.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000127',

    requester: 'João Klein',

    title: 'Cobrança para liberar animal supostamente encontrado',

    author: 'Perfil: Resgate Pet',

    category: 'Suposto golpe',

    reason: 'Possível extorsão',

    reports: 2,

    priority: 'Média',

    received: '15/10/2026',

    description:

      'Usuário relata pedido de transferência em dinheiro antes de informar o local de entrega do animal.',

    details:

      'Confira o histórico de mensagens e não conclua pela culpa sem evidências suficientes.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000128',

    requester: 'Abrigo Esperança',

    title: 'Discordância sobre denúncia recebida',

    author: 'Denunciante: Renata Ferreira',

    category: 'Contestação',

    reason: 'Discordância sobre denúncia',

    reports: 1,

    priority: 'Alta',

    received: '13/10/2026',

    description:

      'A ONG contesta o registro de não atendimento associado à sua conta.',

    details:

      'Compare o registro da denúncia com o histórico de atendimento da ONG antes de responder.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000129',

    requester: 'Usuário: Diego R.',

    title: 'ONG atribuída não compareceu ao atendimento',

    author: 'ONG Patas Unidas',

    category: 'Denúncia contra ONG',

    reason: 'Descumprimento de atendimento',

    reports: 1,

    priority: 'Alta',

    received: '13/10/2026',

    description:

      'O usuário afirma que a ONG atribuída à ocorrência não foi ao local.',

    details:

      'Verifique o histórico de atualizações da ocorrência e ouça a ONG antes de decidir.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000130',

    requester: 'ONG Patas Unidas',

    title: 'Não consegue atualizar status de atendimento',

    author: '-',

    category: 'Problema técnico',

    reason: 'Falha ao atualizar status',

    reports: 1,

    priority: 'Média',

    received: '13/10/2026',

    description:

      'A ONG informa erro ao alterar o status de uma ocorrência em atendimento.',

    details: 'Reproduza o problema e registre a resposta enviada à ONG.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000131',

    requester: 'Projeto Patinhas',

    title: 'Mensagens ofensivas enviadas à equipe',

    author: 'Lucas Prado',

    category: 'Denúncia de usuário',

    reason: 'Mensagens ofensivas',

    reports: 1,

    priority: 'Média',

    received: '12/10/2026',

    description:

      'A organização relata mensagens ofensivas recebidas de um usuário.',

    details:

      'Confira as mensagens anexadas e o histórico de conduta do usuário.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000132',

    requester: 'Amigos do Focinho',

    title: 'Correção de dados do perfil institucional',

    author: '-',

    category: 'Solicitação',

    reason: 'Atualização cadastral',

    reports: 1,

    priority: 'Baixa',

    received: '11/10/2026',

    description: 'A ONG pede a correção de dados do perfil institucional.',

    details:

      'Confirme os dados com a documentação enviada antes de atualizar.',

    status: 'pendente',

  },

  {

    id: 'WA-2026-000133',

    requester: 'Usuária: Marina S.',

    title: 'Campanha de arrecadação com dados bancários inconsistentes',

    author: 'Perfil: Patinhas do Bem',

    category: 'Campanha suspeita',

    reason: 'Possível campanha falsa de arrecadação',

    reports: 5,

    priority: 'Alta',

    received: '12/10/2026',

    description:

      'Campanha pedia doações para uma conta em nome de terceiros, sem vínculo com a ONG citada.',

    details:

      'Verifique se o titular da conta tem relação com a organização divulgada.',

    status: 'removido',

    decision: {

      at: '13/10/2026, 14:58',

      admin: 'Carla Mendes',

      measure: 'Conteúdo removido e advertência ao autor',

      justification:

        'A conta informada pertence a uma pessoa sem vínculo com a ONG. O texto viola a regra de campanhas de arrecadação. Primeira ocorrência do perfil, por isso a medida foi advertência.',

    },

  },

  {

    id: 'WA-2026-000134',

    requester: 'Carlos Souza',

    title: 'Perfil exige depósito antes de informar o local do animal',

    author: 'Perfil: Achei Seu Pet',

    category: 'Suposto golpe',

    reason: 'Possível extorsão',

    reports: 6,

    priority: 'Alta',

    received: '11/10/2026',

    description:

      'Três usuários relataram o mesmo pedido de transferência antes de qualquer contato presencial.',

    details:

      'Compare os relatos com o histórico de mensagens anexado.',

    status: 'suspenso',

    decision: {

      at: '12/10/2026, 16:20',

      admin: 'Ana Ribeiro',

      measure: 'Conteúdo removido e conta suspensa por 30 dias',

      justification:

        'Os prints enviados por três usuários mostram o mesmo pedido de pagamento em datas diferentes. Há reincidência comprovada, o que justifica a suspensão da conta.',

    },

  },

]

const STATUS_LABEL: Record<Status, string> = {

  pendente: 'Aguardando análise',

  suspenso: 'Suspenso',

  removido: 'Removido',

  mantido: 'Mantido',

}

const NON_PUNITIVE = ['Problema técnico', 'Solicitação']

function normalize(value: string) {

  return value

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLowerCase()

}

function getGroup(value: string) {
  return GROUPS.find(
    (group) =>
      group.name === value ||
      group.types.includes(value)
  )
}

function dateOrder(date: string) {

  const [day, month, year] = date.split('/')

  return `${year}${month}${day}`

}

function formatPriority(priority: string) {

  return `wa-priority wa-priority-${normalize(priority)}`

}

export default function OuvidoriaPage() {

  const [cases, setCases] = useState<Manifestacao[]>(INITIAL_CASES)

  const [tab, setTab] = useState<Aba>('fila')

  const [group, setGroup] = useState('Todas')

  const [subCategory, setSubCategory] = useState('Todos')

  const [historyFilter, setHistoryFilter] = useState('Todas')

  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<Manifestacao | null>(null)

  const [measure, setMeasure] = useState('advertir')

  const [suspension, setSuspension] = useState('7 dias')

  const [justification, setJustification] = useState('')

  const [feedback, setFeedback] = useState('')

  const pending = cases.filter((item) => item.status === 'pendente')

  const visibleCases = useMemo(() => {
    const query = normalize(search.trim())

    return cases
      .filter((item) => {
        // A fila mostra somente manifestações ainda não analisadas.
        if (tab === 'fila') {
          if (item.status !== 'pendente') return false

          if (group !== 'Todas') {
            const selectedGroup = GROUPS.find((entry) => entry.name === group)
            if (!selectedGroup || !selectedGroup.types.includes(item.category)) return false
          }

          // O segundo filtro restringe a lista ao tipo escolhido dentro do grupo.
          if (subCategory !== 'Todos' && item.category !== subCategory) return false

          return true
        }

        // O histórico mostra somente manifestações que já receberam decisão.
        if (!item.decision) return false

        if (historyFilter !== 'Todas') {
          const statusByLabel: Record<string, Status> = {
            Suspenso: 'suspenso',
            Removido: 'removido',
            Mantido: 'mantido',
          }
          if (item.status !== statusByLabel[historyFilter]) return false
        }

        return true
      })
      .filter((item) => {
        if (!query) return true
        const searchableText = normalize(
          `${item.id} ${item.title} ${item.author} ${item.requester} ${item.category} ${item.reason} ${item.description}`,
        )
        return searchableText.includes(query)
      })
      .sort((a, b) => {
        if (tab === 'fila') {
          const priorityOrder: Record<Manifestacao['priority'], number> = {
            Alta: 0,
            Média: 1,
            Baixa: 2,
          }
          const priorityDifference = priorityOrder[a.priority] - priorityOrder[b.priority]
          if (priorityDifference !== 0) return priorityDifference
          return dateOrder(b.received).localeCompare(dateOrder(a.received))
        }

        return (b.decision?.at ?? '').localeCompare(a.decision?.at ?? '')
      })
  }, [cases, group, subCategory, tab, historyFilter, search])

  function selectGroup(value: string) {

    setGroup(value)

    setSubCategory('Todos')

  }

  function openAnalysis(item: Manifestacao) {

    setSelected(item)

    setMeasure(NON_PUNITIVE.includes(item.category) ? 'manter' : 'advertir')

    setSuspension('7 dias')

    setJustification('')

    setFeedback('')

  }

  function submitAnalysis() {

    if (!selected) return

    const text = justification.trim()

    if (!text) {

      setFeedback('Informe a justificativa antes de enviar a análise.')

      return

    }

    const punitive = !NON_PUNITIVE.includes(selected.category)

    const measures: Record<string, {

      status: Status

      measure: string

    }> = {

      advertir: {

        status: 'removido',

        measure: 'Conteúdo removido e advertência ao autor',

      },

      suspender: {

        status: 'suspenso',

        measure: `Conteúdo removido e conta suspensa por ${suspension.toLowerCase()}`,

      },

      manter: {

        status: 'mantido',

        measure: punitive

          ? 'Publicação mantida, sem punição'

          : 'Resposta registrada e caso encerrado',

      },

    }

    const result = measures[measure] ?? {

      status: 'mantido',

      measure: 'Resposta registrada e caso encerrado',

    }

    setCases((current) =>

      current.map((item) =>

        item.id === selected.id

          ? {

              ...item,

              status: result.status,

              decision: {

                at: new Date().toLocaleString('pt-BR'),

                admin: 'Administrador atual',

                measure: result.measure,

                justification: text,

              },

            }

          : item,

      ),

    )

    setSelected(null)

    setTab('historico')

    setHistoryFilter('Todas')

    setFeedback('')

  }

  function statusClass(status: Status) {

    return `wa-status-pill wa-status-${status}`

  }

  return (

    <main className="wa-ouvidoria">

      <div className="wa-page-head">
        <div>
          <div className="wa-eyebrow">CANAL INSTITUCIONAL</div>
          <h1>Ouvidoria e denúncias</h1>
          <p className="wa-subtitle">
            Manifestações de usuários e organizações: denúncias, problemas técnicos,
            contestações e solicitações.
          </p>
        </div>
        <div className="wa-tabs" role="group" aria-label="Seções da ouvidoria">
          <button className={tab === 'fila' ? 'active' : ''} onClick={() => setTab('fila')} aria-pressed={tab === 'fila'}>
            Fila de denúncias
          </button>
          <button className={tab === 'historico' ? 'active' : ''} onClick={() => setTab('historico')} aria-pressed={tab === 'historico'}>
            Histórico de análises
          </button>
        </div>
      </div>

      {tab === 'fila' ? (

        <>

          <section className="wa-stats">

            <article className="wa-stat">

              <span>Casos na fila</span>

              <strong>{pending.length}</strong>

              <small>Aguardando análise</small>

            </article>

            <article className="wa-stat">

              <span>Comunidade</span>

              <strong>

                {pending.filter((item) => item.category === 'Comunidade').length}

              </strong>

              <small>Publicações e comentários</small>

            </article>

            <article className="wa-stat">

              <span>Achados e perdidos</span>

              <strong>

                {

                  pending.filter(

                    (item) =>

                      item.category === 'Achados e perdidos' ||

                      item.category === 'Suposto golpe',

                  ).length

                }

              </strong>

              <small>Inclui suspeitas de cobrança</small>

            </article>

            <article className="wa-stat">

              <span>Denúncias falsas</span>

              <strong>

                {pending.filter((item) => item.category === 'Denúncia falsa').length}

              </strong>

              <small>Exige análise de evidências</small>

            </article>

          </section>

          <section className="wa-ouvidoria-filters">
            <div className="wa-toolbar">
              <div className="wa-filters" aria-label="Filtrar por categoria">
                <button
                  type="button"
                  className={group === 'Todas' ? 'active' : ''}
                  aria-pressed={group === 'Todas'}
                  onClick={() => selectGroup('Todas')}
                >
                  Todas <em className="wa-count">{pending.length}</em>
                </button>

                {GROUPS.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    className={group === item.name ? 'active' : ''}
                    aria-pressed={group === item.name}
                    onClick={() => selectGroup(item.name)}
                  >
                    {item.name}
                    <em className="wa-count">
                      {pending.filter((c) => item.types.includes(c.category)).length}
                    </em>
                  </button>
                ))}
              </div>

              <input
                className="wa-search"
                type="search"
                aria-label="Buscar caso ou autor"
                placeholder="Buscar caso ou autor…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {group !== 'Todas' && (
              <div className="wa-subfilters" aria-label="Filtrar por tipo" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
                <span className="wa-subfilters-label">Tipo</span>

                <button
                  type="button"
                  className={subCategory === 'Todos' ? 'active' : ''}
                  aria-pressed={subCategory === 'Todos'}
                  onClick={() => setSubCategory('Todos')}
                >
                  Todos
                  <em className="wa-count">
                    {pending.filter((item) => (getGroup(group)?.types ?? []).includes(item.category)).length}
                  </em>
                </button>

                {(getGroup(group)?.types ?? []).map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={subCategory === type ? 'active' : ''}
                    aria-pressed={subCategory === type}
                    onClick={() => setSubCategory(type)}
                  >
                    {type}
                    <em className="wa-count">
                      {pending.filter((item) => item.category === type).length}
                    </em>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="wa-card wa-table-card">

            <div className="wa-card-title">

              <strong>Manifestações recebidas</strong>

              <span>Registros ilustrativos</span>

            </div>

            <p className="wa-card-help">

              A coluna Status mostra a situação do caso e a coluna Ação abre a

              análise ou o motivo da decisão.

            </p>

            <div className="wa-table-wrap">

              <table className="wa-table wa-table-wide">

                <thead>

                  <tr>

                    <th>Protocolo</th>

                    <th>Solicitante</th>

                    <th>Conteúdo / caso</th>

                    <th>Autor / perfil</th>

                    <th>Categoria e motivo</th>

                    <th>Data</th>

                    <th>Prioridade</th>

                    <th>Status</th>

                    <th>Ação</th>

                  </tr>

                </thead>

                <tbody>

                  {visibleCases.map((item) => (

                    <tr key={item.id}>

                      <td className="wa-mono">{item.id}</td>

                      <td>{item.requester}</td>

                      <td>

                        <strong>{item.title}</strong>

                        <small>{item.description}</small>

                      </td>

                      <td>{item.author}</td>

                      <td>

                        <span className="wa-pill">{item.category}</span>

                        <small>{item.reason}</small>

                      </td>

                      <td className="wa-mono">{item.received}</td>

                      <td>

                        <span className={formatPriority(item.priority)}>

                          {item.priority}

                        </span>

                      </td>

                      <td>

                        <span className={statusClass(item.status)}>

                          {STATUS_LABEL[item.status]}

                        </span>

                      </td>

                      <td>

                        {item.status === 'pendente' ? (

                          <button

                            className="wa-btn"

                            onClick={() => openAnalysis(item)}

                          >

                            Analisar

                          </button>

                        ) : (

                          <button

                            className="wa-btn"

                            onClick={() => setSelected(item)}

                          >

                            Ver motivo

                          </button>

                        )}

                      </td>

                    </tr>

                  ))}

                  {visibleCases.length === 0 && (

                    <tr>

                      <td colSpan={9} className="wa-empty">

                        {search.trim()

                          ? 'Nenhum caso encontrado para esta busca.'

                          : 'Não há casos neste filtro.'}

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

          <div className="wa-note">

            Em casos de suposto golpe ou denúncia falsa, a denúncia não deve ser

            tratada como prova. A decisão precisa considerar as evidências e ser

            registrada.

          </div>

          <div className="wa-panel-grid">

            <section className="wa-card">

              <div className="wa-card-title">

                <strong>Categorias das manifestações</strong>

                <span>Todas as manifestações</span>

              </div>

              {GROUPS.flatMap((item) => item.types).map((type) => (

                <div className="wa-legend" key={type}>

                  <span>{type}</span>

                  <strong>

                    {pending.filter((item) => item.category === type).length}

                  </strong>

                </div>

              ))}

            </section>

            <section className="wa-card">

              <div className="wa-card-title">

                <strong>Fluxo administrativo</strong>

              </div>

              <div className="wa-flow-stats">

                <div>

                  <span>Respondidas (30 dias)</span>

                  <strong>18</strong>

                  <small>Retorno administrativo</small>

                </div>

                <div>

                  <span>Tempo médio de resposta</span>

                  <strong>1,4 dia</strong>

                  <small>Últimos 30 dias</small>

                </div>

              </div>

              <p className="wa-body-copy">

                Cada manifestação deve ter protocolo, responsável pela análise,

                histórico de atualizações e resposta registrada. Toda decisão

                fica guardada no histórico de análises.

              </p>

            </section>

          </div>

        </>

      ) : (

        <section className="wa-card wa-table-card">

          <div className="wa-card-title">

            <strong>Histórico de análises</strong>

            <span>

              {visibleCases.filter((item) => item.decision).length} registro(s)

            </span>

          </div>

          <p className="wa-card-help">

            Cada análise enviada aparece aqui, da mais recente para a mais

            antiga. Use Ver motivo para ler a justificativa oficial.

          </p>

          <div className="wa-toolbar wa-history-toolbar">
            <div className="wa-filters wa-history-filters">
              {HISTORY_FILTERS.map((filter) => (
                <button key={filter} className={historyFilter === filter ? 'active' : ''} onClick={() => setHistoryFilter(filter)}>
                  {filter}
                </button>
              ))}
            </div>
            <input className="wa-search" type="search" aria-label="Buscar caso ou autor" placeholder="Buscar caso ou autor…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <div className="wa-table-wrap">

            <table className="wa-table">

              <thead>

                <tr>

                  <th>Data e hora</th>

                  <th>Caso</th>

                  <th>Autor / perfil</th>

                  <th>Decisão</th>

                  <th>Medida aplicada</th>

                  <th>Administrador</th>

                  <th>Ação</th>

                </tr>

              </thead>

              <tbody>

                {visibleCases

                  .filter((item) => item.decision)

                  .map((item) => (

                    <tr key={item.id}>

                      <td className="wa-mono">{item.decision?.at}</td>

                      <td>

                        <strong>{item.title}</strong>

                        <small>{item.id}</small>

                      </td>

                      <td>{item.author}</td>

                      <td>

                        <span className={statusClass(item.status)}>

                          {STATUS_LABEL[item.status]}

                        </span>

                      </td>

                      <td>{item.decision?.measure}</td>

                      <td>{item.decision?.admin}</td>

                      <td>

                        <button

                          className="wa-btn"

                          onClick={() => setSelected(item)}

                        >

                          Ver motivo

                        </button>

                      </td>

                    </tr>

                  ))}

                {visibleCases.filter((item) => item.decision).length === 0 && (

                  <tr>

                    <td colSpan={7} className="wa-empty">

                      {search.trim()

                        ? 'Nenhum caso encontrado para esta busca.'

                        : 'Nenhuma análise com esta decisão ainda.'}

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

      )}

      {selected && (

        <div

          className="wa-modal-overlay"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) setSelected(null)

          }}

        >

          <section className="wa-modal wa-ouvidoria-modal">

            <button

              className="wa-modal-close"

              onClick={() => setSelected(null)}

              aria-label="Fechar"

            >

              ×

            </button>

            {selected.status === 'pendente' ? (

              <>

                <div className="wa-eyebrow">DECISÃO DA OUVIDORIA</div>

                <h2>Analisar manifestação</h2>

                <p className="wa-body-copy">

                  Revise a manifestação original antes de escolher uma medida.

                </p>

              </>

            ) : (

              <>

                <div className="wa-eyebrow">REGISTRO DA OUVIDORIA</div>

                <h2>

                  {selected.status === 'suspenso'

                    ? 'Por que foi suspenso'

                    : selected.status === 'removido'

                      ? 'Por que foi removido'

                      : 'Por que foi mantido'}

                </h2>

                <span className={statusClass(selected.status)}>

                  {STATUS_LABEL[selected.status]}

                </span>

              </>

            )}

            <div className="wa-moderation-original">

              <div className="wa-moderation-original-head">

                <strong>{selected.title}</strong>

                <span className="wa-pill">{selected.category}</span>

              </div>

              <p>{selected.description}</p>

              <dl className="wa-details">

                <dt>Protocolo</dt>

                <dd>{selected.id}</dd>

                <dt>Solicitante</dt>

                <dd>{selected.requester}</dd>

                <dt>Autor / perfil</dt>

                <dd>{selected.author}</dd>

                <dt>Motivo</dt>

                <dd>{selected.reason}</dd>

                <dt>Recebida em</dt>

                <dd>{selected.received}</dd>

                <dt>Prioridade</dt>

                <dd>{selected.priority}</dd>

                <dt>Reportes</dt>

                <dd>{selected.reports}</dd>

              </dl>

              <div className="wa-note">{selected.details}</div>

            </div>

            {selected.status === 'pendente' ? (

              <>

                {!NON_PUNITIVE.includes(selected.category) && (

                  <div className="wa-moderation-warning">

                    <strong>Atenção:</strong> uma denúncia, por si só, não

                    comprova fraude ou má conduta. Verifique as evidências e o

                    contexto antes de aplicar punições.

                  </div>

                )}

                <div className="wa-moderation-options">

                  {!NON_PUNITIVE.includes(selected.category) ? (

                    <>

                      <label className={measure === 'advertir' ? 'selected' : ''}>

                        <input

                          type="radio"

                          name="measure"

                          value="advertir"

                          checked={measure === 'advertir'}

                          onChange={() => setMeasure('advertir')}

                        />

                        <span>

                          <strong>Remover conteúdo + advertir</strong>

                          <small>

                            Enviar aviso oficial ao usuário ou à ONG, explicar

                            a regra violada e aplicar redução de score somente

                            conforme as regras de reputação da plataforma.

                          </small>

                        </span>

                      </label>

                      <label className={measure === 'suspender' ? 'selected' : ''}>

                        <input

                          type="radio"

                          name="measure"

                          value="suspender"

                          checked={measure === 'suspender'}

                          onChange={() => setMeasure('suspender')}

                        />

                        <span>

                          <strong className="wa-moderation-danger">

                            Remover conteúdo + suspender conta

                          </strong>

                          <small>

                            Para casos graves ou reincidência comprovada. A

                            notificação informa o motivo e a duração da

                            suspensão.

                          </small>

                        </span>

                      </label>

                      <label className={measure === 'manter' ? 'selected' : ''}>

                        <input

                          type="radio"

                          name="measure"

                          value="manter"

                          checked={measure === 'manter'}

                          onChange={() => setMeasure('manter')}

                        />

                        <span>

                          <strong className="wa-moderation-keep">

                            Manter publicação

                          </strong>

                          <small>

                            Para denúncias irrelevantes ou sem violação

                            comprovada. O conteúdo continua publicado, o caso

                            é encerrado e nenhuma punição é aplicada.

                          </small>

                        </span>

                      </label>

                    </>

                  ) : (

                    <label className="selected">

                      <input

                        type="radio"

                        name="measure"

                        value="manter"

                        checked

                        readOnly

                      />

                      <span>

                        <strong className="wa-moderation-keep">

                          Responder e encerrar

                        </strong>

                        <small>

                          Registre a resposta ao solicitante e encerre o caso.

                          Nenhuma punição é aplicada neste tipo de manifestação.

                        </small>

                      </span>

                    </label>

                  )}

                </div>

                {measure === 'suspender' && (

                  <label className="wa-moderation-field">

                    Prazo da suspensão

                    <select

                      value={suspension}

                      onChange={(event) => setSuspension(event.target.value)}

                    >

                      <option>24 horas</option>

                      <option>7 dias</option>

                      <option>30 dias</option>

                      <option>Indefinida, requer revisão</option>

                    </select>

                  </label>

                )}

                <label className="wa-moderation-field">

                  {NON_PUNITIVE.includes(selected.category)

                    ? 'Resposta registrada'

                    : 'Justificativa oficial'}{' '}

                  <span>(obrigatória)</span>

                  <textarea

                    value={justification}

                    onChange={(event) => setJustification(event.target.value)}

                    placeholder={

                      measure === 'suspender'

                        ? 'Descreva a regra violada, a reincidência e as evidências que sustentam a suspensão.'

                        : measure === 'advertir'

                          ? 'Descreva a regra violada e as evidências que sustentam a decisão.'

                          : NON_PUNITIVE.includes(selected.category)

                            ? 'Descreva a resposta enviada ao solicitante.'

                            : 'Explique por que a denúncia não procede ou é irrelevante.'

                    }

                  />

                </label>

                {feedback && <p className="wa-form-feedback">{feedback}</p>}

                <div className="wa-note">

                  A decisão será registrada no histórico de análises desta

                  página. Notificações reais, score e suspensão ainda exigem

                  integração com o backend.

                </div>

                <div className="wa-actions wa-modal-actions">

                  <button className="wa-btn" onClick={() => setSelected(null)}>

                    Cancelar

                  </button>

                  <button className="wa-btn wa-btn-ok" onClick={submitAnalysis}>

                    Enviar análise

                  </button>

                </div>

              </>

            ) : (

              <div className="wa-decision">

                <h3>Decisão registrada</h3>

                <dl className="wa-details">

                  <dt>Decisão</dt>

                  <dd>{STATUS_LABEL[selected.status]}</dd>

                  <dt>Medida aplicada</dt>

                  <dd>{selected.decision?.measure}</dd>

                  <dt>Administrador</dt>

                  <dd>{selected.decision?.admin}</dd>

                  <dt>Data e hora</dt>

                  <dd>{selected.decision?.at}</dd>

                </dl>

                <div className="wa-justification">

                  <strong>Justificativa oficial</strong>

                  <p>{selected.decision?.justification}</p>

                </div>

                <div className="wa-actions wa-modal-actions">

                  <button className="wa-btn" onClick={() => setSelected(null)}>

                    Fechar

                  </button>

                </div>

              </div>

            )}

          </section>

        </div>

      )}

    </main>

  )

}
