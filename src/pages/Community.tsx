import { useState } from 'react'
import type { CommunityPost } from '../types'
import { useToast } from '../components/ToastContext'

interface CommunityProps {
  posts: CommunityPost[]
  onSavePost: (postData: {
    id?: string
    title: string
    type: 'Campanha' | 'Post'
    categoryLabel: string
    description: string
    progressText?: string
  }) => void
  onDeletePost: (id: string) => void
  onLikePost: (id: string) => void
  onAddComment: (postId: string, text: string) => void
  onAddSubscriber: (
    postId: string,
    subscriber: { name: string; contact: string; detail: string },
  ) => void
}

export function Community({
  posts,
  onSavePost,
  onDeletePost,
  onLikePost,
  onAddComment,
  onAddSubscriber,
}: CommunityProps) {
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'Campanha' | 'Post'>('all')

  // Estado do modal de Criar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [postType, setPostType] = useState<'Campanha' | 'Post'>('Campanha')
  const [categoryLabel, setCategoryLabel] = useState('Castração')
  const [description, setDescription] = useState('')
  const [progressText, setProgressText] = useState('')

  // Estado do modal de Inscritos da Campanha
  const [subscribersModalPostId, setSubscribersModalPostId] = useState<string | null>(null)
  const [subName, setSubName] = useState('')
  const [subContact, setSubContact] = useState('')
  const [subDetail, setSubDetail] = useState('')

  // Estado do modal de Comentários do Post
  const [commentsModalPostId, setCommentsModalPostId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')

  const filteredPosts = posts.filter((p) =>
    filter === 'all' ? true : p.type === filter,
  )

  const activeSubscribersPost = posts.find((p) => p.id === subscribersModalPostId)
  const activeCommentsPost = posts.find((p) => p.id === commentsModalPostId)

  function openNewModal() {
    setEditingId(undefined)
    setTitle('')
    setPostType('Campanha')
    setCategoryLabel('Castração')
    setDescription('')
    setProgressText('0 de 50 vagas')
    setIsModalOpen(true)
  }

  function openEditModal(post: CommunityPost) {
    setEditingId(post.id)
    setTitle(post.title)
    setPostType(post.type)
    setCategoryLabel(post.categoryLabel)
    setDescription(post.description)
    setProgressText(post.progressText ?? '')
    setIsModalOpen(true)
  }

  function handleSave() {
    if (!title.trim() || !description.trim()) {
      showToast('Preencha o título e a descrição!', '⚠️')
      return
    }
    onSavePost({
      id: editingId,
      title: title.trim(),
      type: postType,
      categoryLabel: categoryLabel.trim() || postType,
      description: description.trim(),
      progressText:
        postType === 'Campanha'
          ? progressText.trim() || 'Recém iniciada'
          : undefined,
    })
    setIsModalOpen(false)
    showToast(
      editingId ? 'Publicação atualizada com sucesso!' : 'Nova publicação criada!',
      '📢',
    )
  }

  function handleSendComment() {
    if (!activeCommentsPost || !newCommentText.trim()) return
    onAddComment(activeCommentsPost.id, newCommentText.trim())
    setNewCommentText('')
    showToast('Comentário publicado!', '💬')
  }

  function handleCreateSubscriber() {
    if (!activeSubscribersPost || !subName.trim()) {
      showToast('Informe o nome do inscrito!', '⚠️')
      return
    }
    onAddSubscriber(activeSubscribersPost.id, {
      name: subName.trim(),
      contact: subContact.trim() || 'Sem telefone',
      detail: subDetail.trim() || 'Inscrição confirmada',
    })
    setSubName('')
    setSubContact('')
    setSubDetail('')
    showToast('Inscrito adicionado à campanha!', '✓')
  }

  return (
    <section className="portal-page">
      <div className="portal-page-heading">
        <h1 className="portal-page-title">Comunidade</h1>
        <button type="button" className="brown-button" onClick={openNewModal}>
          + Nova publicação / campanha
        </button>
      </div>

      <div className="filter-chips community-filters">
        {(
          [
            ['all', 'Tudo'],
            ['Campanha', 'Campanhas'],
            ['Post', 'Posts'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`filter-chip ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="portal-grid community-grid">
        {filteredPosts.map((post) => {
          const commentsCount = post.commentsList?.length ?? 0
          const subscribersCount = post.subscribers?.length ?? 0

          return post.type === 'Campanha' ? (
            <article key={post.id} className="portal-card campaign-card">
              {post.isOwn && <span className="campaign-owner">Sua campanha</span>}
              <span className="campaign-type">{post.categoryLabel}</span>
              <h3>{post.title}</h3>
              <small>{post.description}</small>
              <div className="progress-bar">
                <i style={{ width: `${post.progressPct ?? 45}%` }} />
              </div>
              <span className="progress-label">
                {post.progressText} · {subscribersCount} inscritos na lista
              </span>
              <div className="campaign-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => openEditModal(post)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setSubscribersModalPostId(post.id)}
                >
                  Ver inscritos ({subscribersCount})
                </button>
                <button
                  type="button"
                  className="reject-button"
                  onClick={() => {
                    onDeletePost(post.id)
                    showToast('Campanha excluída.', '🗑️')
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ) : (
            <article
              key={post.id}
              className="portal-card community-post"
              style={{ cursor: 'pointer' }}
              onClick={() => setCommentsModalPostId(post.id)}
            >
              <span className="mono-label">Post · {post.elapsed ?? 'agora'}</span>
              <h3>{post.author}</h3>
              <p>{post.description}</p>
              <small>
                {post.likes ?? 0} curtidas · {commentsCount} comentários
              </small>
              <div
                className="campaign-actions"
                style={{ marginTop: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => onLikePost(post.id)}
                >
                  ♥ Curtir ({post.likes ?? 0})
                </button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setCommentsModalPostId(post.id)}
                >
                  💬 Comentários ({commentsCount})
                </button>
                {post.isOwn && (
                  <>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => openEditModal(post)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="reject-button"
                      onClick={() => {
                        onDeletePost(post.id)
                        showToast('Post excluído.', '🗑️')
                      }}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {/* MODAL 1: LISTA DE INSCRITOS DA CAMPANHA */}
      {activeSubscribersPost && (
        <div
          className="legal-modal-backdrop"
          onClick={() => setSubscribersModalPostId(null)}
        >
          <div
            className="portal-card"
            style={{
              width: 'min(100%, 560px)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="head" style={{ marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>
                Inscritos · {activeSubscribersPost.title}
              </h2>
              <span className="pill ok">{activeSubscribersPost.progressText}</span>
            </div>
            <small style={{ color: 'var(--i6)', display: 'block', marginBottom: 16 }}>
              {activeSubscribersPost.description}
            </small>

            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              {(activeSubscribersPost.subscribers ?? []).length === 0 ? (
                <div className="box">Nenhum inscrito registrado até o momento.</div>
              ) : (
                (activeSubscribersPost.subscribers ?? []).map((sub) => (
                  <div
                    key={sub.id}
                    className="row"
                    style={{ marginBottom: 0, cursor: 'default' }}
                  >
                    <div className="ic">{sub.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="t">{sub.name}</div>
                      <div className="s">
                        {sub.contact} · {sub.detail}
                      </div>
                    </div>
                    <span className="pill ok">{sub.status}</span>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                borderTop: '1px solid var(--ln)',
                paddingTop: 14,
                marginTop: 8,
              }}
            >
              <div className="mono" style={{ marginBottom: 6 }}>
                Adicionar inscrito manualmente
              </div>
              <div className="portal-grid g3" style={{ gap: 8 }}>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp"
                  value={subContact}
                  onChange={(e) => setSubContact(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Animal / Doação"
                  value={subDetail}
                  onChange={(e) => setSubDetail(e.target.value)}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn ap"
                  onClick={handleCreateSubscriber}
                >
                  + Confirmar inscrição
                </button>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setSubscribersModalPostId(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VISUALIZAR POST E COMENTÁRIOS */}
      {activeCommentsPost && (
        <div
          className="legal-modal-backdrop"
          onClick={() => setCommentsModalPostId(null)}
        >
          <div
            className="portal-card"
            style={{
              width: 'min(100%, 540px)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mono-label">
              Post · {activeCommentsPost.elapsed ?? 'agora'}
            </span>
            <h2 style={{ marginTop: 4, marginBottom: 8 }}>
              {activeCommentsPost.author}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--i9)', marginBottom: 16 }}>
              {activeCommentsPost.description}
            </p>

            <div className="mono" style={{ marginBottom: 10 }}>
              Comentários ({(activeCommentsPost.commentsList ?? []).length})
            </div>

            <div
              style={{
                display: 'grid',
                gap: 8,
                maxHeight: 260,
                overflowY: 'auto',
                marginBottom: 14,
              }}
            >
              {(activeCommentsPost.commentsList ?? []).length === 0 ? (
                <div className="box">
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </div>
              ) : (
                (activeCommentsPost.commentsList ?? []).map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--s0)',
                      border: '1px solid var(--ln)',
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <strong style={{ fontSize: 12.5, color: 'var(--p9)' }}>
                        {comment.author}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--i6)' }}>
                        {comment.timeAgo}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--i9)' }}>
                      {comment.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                style={{ margin: 0, flex: 1 }}
                placeholder="Escreva um comentário como ONG..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendComment()
                }}
              />
              <button type="button" className="btn" onClick={handleSendComment}>
                Comentar
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setCommentsModalPostId(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CRIAR / EDITAR PUBLICAÇÃO */}
      {isModalOpen && (
        <div
          className="legal-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="portal-card"
            style={{ width: 'min(100%, 480px)', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{editingId ? 'Editar publicação' : 'Nova publicação / campanha'}</h2>

            <div className="mono" style={{ marginTop: 10 }}>
              Tipo
            </div>
            <div className="chips">
              {(['Campanha', 'Post'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${postType === t ? 'sel' : ''}`}
                  onClick={() => setPostType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mono">Título</div>
            <input
              type="text"
              placeholder="Ex: Mutirão de Castração"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {postType === 'Campanha' && (
              <>
                <div className="mono" style={{ marginTop: 8 }}>
                  Categoria (ex: Castração, Doação)
                </div>
                <input
                  type="text"
                  value={categoryLabel}
                  onChange={(e) => setCategoryLabel(e.target.value)}
                />

                <div className="mono" style={{ marginTop: 8 }}>
                  Meta / Progresso
                </div>
                <input
                  type="text"
                  placeholder="Ex: 28 de 60 vagas"
                  value={progressText}
                  onChange={(e) => setProgressText(e.target.value)}
                />
              </>
            )}

            <div className="mono" style={{ marginTop: 8 }}>
              Descrição / Detalhes
            </div>
            <textarea
              placeholder="Detalhes do evento, datas ou informações..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                className="btn g"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn" onClick={handleSave}>
                Salvar publicação
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}