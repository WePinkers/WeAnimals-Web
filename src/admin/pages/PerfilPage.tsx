
import { useState, type ChangeEvent } from 'react'
import { useToast } from '../components/ToastContext'
import { useAdminProfile } from '../components/AdminProfileContext'
import '../app.css'

type Preferencia = {
  id: string
  titulo: string
  descricao: string
  ativa: boolean
}

export default function PerfilPage({
  onLogout,
}: {
  onLogout: () => void
}) {
  const { notify } = useToast()

  const {
    nome,
    setNome,
    foto,
    setFoto,
    disponibilidade,
    setDisponibilidade,
  } = useAdminProfile()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [preferencias, setPreferencias] = useState<Preferencia[]>([
    {
      id: 'denuncias',
      titulo: 'Notificações de denúncias',
      descricao: 'Receber aviso quando uma nova denúncia chegar.',
      ativa: true,
    },
    {
      id: 'ongs',
      titulo: 'Atualizações de ONGs',
      descricao: 'Avisos sobre solicitações e alterações cadastrais.',
      ativa: true,
    },
    {
      id: 'resumo',
      titulo: 'Resumo de atividades',
      descricao: 'Receber um resumo das ações administrativas.',
      ativa: false,
    },
  ])

  function selecionarFoto(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) return

    if (!arquivo.type.startsWith('image/')) {
      notify('Selecione um arquivo de imagem válido.', 'error')
      event.target.value = ''
      return
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      notify('A imagem deve ter no máximo 2 MB.', 'error')
      event.target.value = ''
      return
    }

    const leitor = new FileReader()

    leitor.onload = () => {
      if (typeof leitor.result === 'string') {
        setFoto(leitor.result)
        notify('Foto de perfil atualizada.', 'success')
      }
    }

    leitor.onerror = () => {
      notify('Não foi possível carregar essa imagem.', 'error')
    }

    leitor.readAsDataURL(arquivo)
    event.target.value = ''
  }

  function removerFoto() {
    setFoto(null)
    notify('Foto de perfil removida.', 'info')
  }

  function salvarPerfil() {
    const nomeLimpo = nome.trim()

    if (!nomeLimpo) {
      notify('Digite um nome para o perfil.', 'error')
      return
    }

    setNome(nomeLimpo)

    notify(
      'Perfil atualizado no painel. As alterações ainda não são permanentes.',
      'info',
    )
  }

  function alternarPreferencia(id: string) {
    setPreferencias((atuais) =>
      atuais.map((item) =>
        item.id === id ? { ...item, ativa: !item.ativa } : item,
      ),
    )
  }

  function salvarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      notify('Preencha os três campos de senha.', 'error')
      return
    }

    if (novaSenha.length < 8) {
      notify('A nova senha deve ter pelo menos 8 caracteres.', 'error')
      return
    }

    if (novaSenha !== confirmarSenha) {
      notify('A confirmação não corresponde à nova senha.', 'error')
      return
    }

    notify(
      'Os campos foram validados. A alteração de senha ainda não está conectada à autenticação.',
      'info',
    )
  }

  function sairDaConta() {
    onLogout()
  }

  const inicial = nome.trim().charAt(0).toUpperCase() || 'A'

  return (
    <main className="perfil-page">
      <header className="perfil-heading">
        <div>
          <span className="perfil-eyebrow">MINHA CONTA</span>
          <h1>{nome || 'Administrador'}</h1>
          <p>
            Gerencie seu perfil, suas preferências e a segurança da sua conta.
          </p>
        </div>
      </header>

      <section className="perfil-grid-principal">
        <article className="perfil-card">
          <h2>Meu perfil</h2>

          <div className="perfil-identidade">
            <div className="perfil-avatar-grande">
              {foto ? (
                <img src={foto} alt="Foto de perfil" />
              ) : (
                <span>{inicial}</span>
              )}
            </div>

            <div className="perfil-foto-acoes">
              <strong>Foto de perfil</strong>
              <p>Escolha uma imagem de até 2 MB.</p>

              <label className="perfil-botao perfil-botao-principal perfil-upload">
                Escolher foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={selecionarFoto}
                  aria-label="Escolher foto de perfil"
                />
              </label>

              {foto && (
                <button
                  type="button"
                  className="perfil-botao perfil-botao-secundario"
                  onClick={removerFoto}
                >
                  Remover foto
                </button>
              )}
            </div>
          </div>

          <label className="perfil-label" htmlFor="perfil-nome">
            Nome de exibição
          </label>

          <input
            id="perfil-nome"
            className="perfil-input"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={80}
          />

          <p className="perfil-ajuda">
            O nome e a foto serão usados para identificar você no painel.
          </p>

          <button
            type="button"
            className="perfil-botao perfil-botao-principal"
            onClick={salvarPerfil}
          >
            Salvar perfil
          </button>
        </article>

        <article className="perfil-card">
          <h2>Disponibilidade</h2>
          <p className="perfil-descricao">
            Indique sua disponibilidade para a equipe administrativa.
          </p>

          <div
            className="perfil-disponibilidade"
            role="group"
            aria-label="Disponibilidade"
          >
            {(['Online', 'Ausente', 'Indisponível'] as const).map(
              (status) => (
                <button
                  type="button"
                  key={status}
                  className={`perfil-status ${
                    disponibilidade === status ? 'ativo' : ''
                  }`}
                  aria-pressed={disponibilidade === status}
                  onClick={() => setDisponibilidade(status)}
                >
                  {status}
                </button>
              ),
            )}
          </div>

          <div className="perfil-status-atual">
            <span
              className={`perfil-status-ponto ${
                disponibilidade === 'Online'
                  ? 'ponto-online'
                  : disponibilidade === 'Ausente'
                    ? 'ponto-ausente'
                    : 'ponto-indisponivel'
              }`}
            />

            <span>
              Você está marcado como <strong>{disponibilidade}</strong>.
            </span>
          </div>

          <div className="perfil-separador" />

          <h2>Alterar senha</h2>

          <form
            className="perfil-form-senha"
            onSubmit={(event) => {
              event.preventDefault()
              salvarSenha()
            }}
          >
            <label className="perfil-somente-leitor" htmlFor="senha-atual">
              Senha atual
            </label>
            <input
              id="senha-atual"
              className="perfil-input"
              type="password"
              autoComplete="current-password"
              placeholder="Senha atual"
              value={senhaAtual}
              onChange={(event) => setSenhaAtual(event.target.value)}
            />

            <label className="perfil-somente-leitor" htmlFor="senha-nova">
              Nova senha
            </label>
            <input
              id="senha-nova"
              className="perfil-input"
              type="password"
              autoComplete="new-password"
              placeholder="Nova senha (mínimo 8 caracteres)"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
            />

            <label
              className="perfil-somente-leitor"
              htmlFor="senha-confirmacao"
            >
              Confirmar nova senha
            </label>
            <input
              id="senha-confirmacao"
              className="perfil-input"
              type="password"
              autoComplete="new-password"
              placeholder="Confirmar nova senha"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
            />

            <button
              type="submit"
              className="perfil-botao perfil-botao-principal"
            >
              Salvar senha
            </button>
          </form>

          <button
            type="button"
            className="perfil-botao perfil-botao-perigo"
            onClick={sairDaConta}
          >
            Sair da conta
          </button>
        </article>
      </section>

      <section className="perfil-grid-inferior">
        <article className="perfil-card">
          <h2>Preferências do painel</h2>
          <p className="perfil-descricao">
            Escolha quais avisos você deseja receber.
          </p>

          <div className="perfil-preferencias">
            {preferencias.map((preferencia) => (
              <div
                className="perfil-preferencia"
                key={preferencia.id}
              >
                <div
                  className="perfil-preferencia-icone"
                  aria-hidden="true"
                >
                  {preferencia.id === 'denuncias'
                    ? '♧'
                    : preferencia.id === 'ongs'
                      ? '♙'
                      : '▤'}
                </div>

                <div className="perfil-preferencia-texto">
                  <strong>{preferencia.titulo}</strong>
                  <p>{preferencia.descricao}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={preferencia.ativa}
                  aria-label={preferencia.titulo}
                  className={`perfil-switch ${
                    preferencia.ativa ? 'ligado' : ''
                  }`}
                  onClick={() => alternarPreferencia(preferencia.id)}
                >
                  <span />
                </button>
              </div>
            ))}
          </div>

          <p className="perfil-ajuda">
            Por enquanto, essas preferências são mantidas apenas nesta tela.
          </p>
        </article>

        <article className="perfil-card">
          <h2>Segurança da conta</h2>

          <div className="perfil-seguranca-item">
            <span className="perfil-seguranca-icone" aria-hidden="true">
              ◈
            </span>

            <div>
              <strong>Sessão atual</strong>
              <p>Dispositivo em uso neste momento.</p>
            </div>
          </div>

          <div className="perfil-seguranca-aviso">
            <strong>Proteja sua conta</strong>
            <p>
              Não compartilhe sua senha. Encerre a sessão ao utilizar um
              dispositivo compartilhado.
            </p>
          </div>

          <button
            type="button"
            className="perfil-botao perfil-botao-secundario"
            onClick={sairDaConta}
          >
            Sair da conta
          </button>
        </article>
      </section>

      <section className="perfil-card perfil-atividades">
        <div>
          <h2>Minhas atividades recentes</h2>
          <p className="perfil-descricao">
            Consulte as ações administrativas realizadas pela sua conta.
          </p>
        </div>

        <div className="perfil-estado-vazio">
          <span className="perfil-relogio" aria-hidden="true">
            ◷
          </span>
          <strong>Suas ações administrativas aparecerão aqui.</strong>
          <p>Ainda não há atividades para exibir nesta tela.</p>
        </div>
      </section>
    </main>
  )
}
