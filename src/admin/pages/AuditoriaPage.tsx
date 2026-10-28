import { useState } from 'react'

export default function AuditoriaPage() {
  const [busca, setBusca] = useState('')

  return (
    <div className="wa-auditoria-page">
      <div className="wa-eyebrow">RASTREABILIDADE E SEGURANÇA</div>
      <h1>Auditoria administrativa</h1>
      <p className="wa-subtitle">
        Consulte o histórico de ações administrativas para manter a transparência e a segurança da plataforma.
      </p>

      <section className="wa-card wa-audit-intro" aria-label="Sobre a auditoria">
        <div className="wa-audit-intro-icon" aria-hidden="true">⌕</div>
        <div>
          <h2>Registro de atividades</h2>
          <p>
            As ações realizadas no painel deverão ser registradas com o administrador responsável,
            a operação executada, o item afetado e a data e hora. Os registros serão exibidos aqui
            quando o login administrativo e o armazenamento de auditoria estiverem integrados.
          </p>
        </div>
      </section>

      <section className="wa-card wa-audit-log" aria-label="Histórico de atividades">
        <div className="wa-card-title">
          <strong>Histórico de atividades</strong>
          <span>Registro real · sem dados de demonstração</span>
        </div>

        <div className="wa-audit-toolbar">
          <label className="wa-audit-search-label" htmlFor="wa-audit-search">
            Buscar no histórico
          </label>
          <input
            id="wa-audit-search"
            className="wa-audit-search"
            type="search"
            placeholder="Buscar por ação ou item afetado..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            disabled
            aria-describedby="wa-audit-search-help"
          />
          <span id="wa-audit-search-help" className="wa-audit-help">
            A busca será habilitada quando houver registros reais.
          </span>
        </div>

        <div className="wa-audit-empty" role="status">
          <div className="wa-audit-empty-icon" aria-hidden="true">◷</div>
          <h2>Nenhuma atividade registrada</h2>
          <p>
            Ainda não existem registros de auditoria disponíveis. Quando o acesso administrativo
            estiver implementado, as ações serão registradas a partir das operações reais do sistema.
          </p>
        </div>
      </section>

      <p className="wa-audit-footnote">
        Por segurança, os registros de auditoria devem ser gerados pelo sistema no servidor e não
        editados manualmente pela interface.
      </p>
    </div>
  )
}
