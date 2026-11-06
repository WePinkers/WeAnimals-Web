import { useState, type ChangeEvent, type ReactNode } from 'react'
import type { AnimalItem, CampaignCategory, CommunityCampaignAnimalInput, CommunityPost, CommunityPostCategory, CommunityPostInput, PostComment } from '../types'
import { useToast } from '../components/ToastContext'

interface CommunityProps {
  posts: CommunityPost[]
  animals: AnimalItem[]
  organizationPixKey?: string
  onSavePost: (postData: CommunityPostInput) => Promise<boolean> | void
  onDeletePost: (id: string) => void
  onLikePost: (id: string) => void
  onAddComment: (postId: string, text: string, parentCommentId?: string, mentionedUserIds?: string[]) => void
}

const campaignTypes: CampaignCategory[] = ['Castração', 'Vacinação', 'Adoção', 'Doação']
const postTypes: CommunityPostCategory[] = ['Achados', 'Dúvida', 'Aviso', 'Outro']
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const validCampaign = (value: string): value is CampaignCategory => campaignTypes.includes(value as CampaignCategory)
const dateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function readCompressedCommunityPhoto(file: File, onResult: (dataUrl: string) => void) {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result !== 'string') return
    const originalPhoto = reader.result
    const image = new Image()
    image.onload = () => {
      let maxDimension = 1280
      let quality = 0.76
      let compressed: string = originalPhoto

      // Firestore stores these photos as bytes with a 200 KB rule limit.
      // Retry with a smaller image/quality so a high-resolution photo is not
      // silently dropped from the campaign.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) break
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        compressed = canvas.toDataURL('image/jpeg', quality)
        if (compressed.split(',', 2)[1]?.length <= 250000) break
        maxDimension = Math.round(maxDimension * 0.78)
        quality = Math.max(0.48, quality - 0.08)
      }

      onResult(compressed)
    }
    image.src = originalPhoto
  }
  reader.readAsDataURL(file)
}

export function Community({ posts, animals, organizationPixKey = '', onSavePost, onDeletePost, onLikePost, onAddComment }: CommunityProps) {
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'Campanha' | 'Post'>('all')
  const [subfilter, setSubfilter] = useState<'all' | CampaignCategory | CommunityPostCategory>('all')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const [kind, setKind] = useState<'Campanha' | 'Post'>('Campanha')
  const [campaignType, setCampaignType] = useState<CampaignCategory>('Castração')
  const [postType, setPostType] = useState<CommunityPostCategory>('Aviso')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [animalAudience, setAnimalAudience] = useState('')
  const [capacity, setCapacity] = useState('')
  const [animalIds, setAnimalIds] = useState<string[]>([])
  const [confirmedAnimals, setConfirmedAnimals] = useState<CommunityCampaignAnimalInput[]>([])
  const [deadline, setDeadline] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [acceptsPix, setAcceptsPix] = useState(true)
  const [acceptsItems, setAcceptsItems] = useState(true)
  const [neededItems, setNeededItems] = useState('')
  const [postSubject, setPostSubject] = useState('')
  const [postAnimalType, setPostAnimalType] = useState('')
  const [postOccurredAt, setPostOccurredAt] = useState('')
  const [postExpiresAt, setPostExpiresAt] = useState('')
  const [postContact, setPostContact] = useState('')
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [replyingToCommentId, setReplyingToCommentId] = useState<string>()

  const commentsPost = posts.find((post) => post.id === commentsPostId)
  const displayedPosts = posts.filter((post) => {
    if (filter === 'all') return true
    if (post.type !== filter) return false
    return subfilter === 'all' || post.categoryLabel === subfilter
  })
  const mentionCandidates = commentsPost
    ? [
        { id: commentsPost.authorId, name: commentsPost.author },
        ...(commentsPost.commentsList ?? []).map((item) => ({ id: item.authorId, name: item.author })),
      ].filter((candidate, index, candidates) => (
        candidate.name.trim()
        && candidates.findIndex((item) => item.name.toLocaleLowerCase() === candidate.name.toLocaleLowerCase()) === index
      ))
    : []
  const mentionMatch = comment.match(/(?:^|\s)@([^\n]*)$/)
  const mentionQuery = mentionMatch ? mentionMatch[1].trim().toLocaleLowerCase() : null
  const filteredMentionCandidates = mentionQuery === null
    ? []
    : mentionCandidates.filter((candidate) => (
        !mentionQuery || candidate.name.toLocaleLowerCase().includes(mentionQuery)
      )).slice(0, 6)

  function resetForm() {
    setEditingId(undefined); setKind('Campanha'); setCampaignType('Castração'); setPostType('Aviso')
    setTitle(''); setDescription(''); setPhotoUrls([]); setStartsAt(''); setEndsAt(''); setLocationName(''); setLocationAddress('')
    setAnimalAudience(''); setCapacity(''); setAnimalIds([]); setConfirmedAnimals([]); setDeadline(''); setGoalAmount(''); setAcceptsPix(true); setAcceptsItems(true); setNeededItems('')
    setPostSubject(''); setPostAnimalType(''); setPostOccurredAt(''); setPostExpiresAt(''); setPostContact('')
  }

  function openNew() { resetForm(); setIsEditorOpen(true) }
  function openEdit(post: CommunityPost) {
    const campaign = post.campaign
    const donation = campaign?.donation
    const details = post.postDetails
    setEditingId(post.id); setKind(post.type); setCampaignType(validCampaign(post.categoryLabel) ? post.categoryLabel : 'Castração'); setPostType(post.postCategory ?? 'Aviso')
    setTitle(post.title); setDescription(post.description); setPhotoUrls(post.imageUrls ?? (post.imageUrl ? [post.imageUrl] : []))
    setStartsAt(campaign?.startsAt ?? ''); setEndsAt(campaign?.endsAt ?? ''); setLocationName(campaign?.location?.name ?? post.location?.name ?? ''); setLocationAddress(campaign?.location?.address ?? post.location?.address ?? '')
    setAnimalAudience(campaign?.animalAudience ?? ''); setCapacity(campaign?.capacity?.toString() ?? ''); setAnimalIds(campaign?.animalIds ?? []); setConfirmedAnimals(campaign?.confirmedAnimals ?? [])
    setDeadline(donation?.deadline ?? ''); setGoalAmount(donation?.goalAmount?.toString() ?? ''); setAcceptsPix(donation?.acceptsPix ?? true); setAcceptsItems(donation?.acceptsItems ?? true); setNeededItems((donation?.neededItems ?? []).join('\n'))
    setPostSubject(details?.subject ?? ''); setPostAnimalType(details?.animalType ?? ''); setPostOccurredAt(details?.occurredAt ?? ''); setPostExpiresAt(details?.expiresAt ?? ''); setPostContact(details?.contact ?? '')
    setIsEditorOpen(true)
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return
    Array.from(files).forEach((file) => {
      readCompressedCommunityPhoto(file, (result) => {
        setPhotoUrls((current) => [...current, result])
      })
    })
    event.target.value = ''
  }

  function addConfirmedAnimal() {
    setConfirmedAnimals((current) => [
      ...current,
      { name: '', breed: '', ageText: '', photoUrl: undefined },
    ])
  }

  function updateConfirmedAnimal(index: number, patch: Partial<CommunityCampaignAnimalInput>) {
    setConfirmedAnimals((current) => current.map((animal, animalIndex) => (
      animalIndex === index ? { ...animal, ...patch } : animal
    )))
  }

  function removeConfirmedAnimal(index: number) {
    setConfirmedAnimals((current) => current.filter((_, animalIndex) => animalIndex !== index))
  }

  function addConfirmedAnimalPhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    readCompressedCommunityPhoto(file, (result) => updateConfirmedAnimal(index, { photoUrl: result }))
    event.target.value = ''
  }

  async function save() {
    if (!description.trim() || (kind === 'Campanha' && !title.trim())) {
      showToast('Preencha os campos obrigatórios antes de publicar.', '⚠️'); return
    }
    const location = locationName.trim() || locationAddress.trim() ? { name: locationName.trim(), address: locationAddress.trim() } : undefined
    let payload: CommunityPostInput
    if (kind === 'Campanha') {
      const existing = posts.find((post) => post.id === editingId)
      const parsedCapacity = Number(capacity)
      const parsedGoal = Number(goalAmount.replace(',', '.'))
      const donation = campaignType === 'Doação' ? { deadline: deadline || undefined, goalAmount: Number.isFinite(parsedGoal) && parsedGoal > 0 ? parsedGoal : null, currentAmount: existing?.campaign?.donation?.currentAmount ?? 0, acceptsPix, acceptsItems, neededItems: neededItems.split('\n').map((item) => item.trim()).filter(Boolean) } : undefined
      const campaignCapacity = (campaignType === 'Castração' || campaignType === 'Vacinação') && Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null
      const campaignAnimals = campaignType === 'Adoção'
        ? confirmedAnimals
            .filter((animal) => animal.name.trim())
            .map((animal) => ({ ...animal, name: animal.name.trim(), breed: animal.breed.trim(), ageText: animal.ageText.trim() }))
        : []
      const campaign = { startsAt: startsAt || undefined, endsAt: endsAt || undefined, location, animalAudience: animalAudience.trim() || undefined, capacity: campaignCapacity, animalIds: campaignType === 'Adoção' ? animalIds : [], confirmedAnimals: campaignAnimals, donation }
      const subscriberCount = existing?.subscribers?.length ?? 0
      const progressText = campaignType === 'Doação' && donation?.goalAmount ? `${currency(donation.currentAmount ?? 0)} de ${currency(donation.goalAmount)}` : campaign.capacity ? `${subscriberCount} de ${campaign.capacity} vagas preenchidas` : campaignAnimals.length ? `${campaignAnimals.length} animais confirmados` : 'Sem limite de vagas'
      const progressPct = campaignType === 'Doação' && donation?.goalAmount ? Math.min(100, ((donation.currentAmount ?? 0) / donation.goalAmount) * 100) : campaign.capacity ? Math.min(100, (subscriberCount / campaign.capacity) * 100) : 0
      payload = { id: editingId, title: title.trim(), type: 'Campanha', categoryLabel: campaignType, description: description.trim(), campaign, progressText, progressPct, imageUrl: photoUrls[0], imageUrls: photoUrls }
    } else {
      payload = { id: editingId, title: title.trim() || postSubject.trim() || postType, type: 'Post', categoryLabel: 'Post', description: description.trim(), postCategory: postType, location, imageUrl: photoUrls[0], imageUrls: photoUrls, postDetails: { subject: postSubject.trim() || undefined, animalType: postAnimalType.trim() || undefined, occurredAt: postOccurredAt || undefined, expiresAt: postExpiresAt || undefined, contact: postContact.trim() || undefined } }
    }
    const saved = await onSavePost(payload)
    if (saved === false) {
      showToast('Não foi possível salvar a campanha. Confira as regras do Firestore e tente novamente.', '⚠️')
      return
    }
    setIsEditorOpen(false)
    showToast(editingId ? 'Publicação atualizada com sucesso!' : 'Publicação criada com sucesso!', '📢')
  }

  function closeComments() {
    setCommentsPostId(null)
    setReplyingToCommentId(undefined)
    setComment('')
  }

  function replyToComment(item: PostComment) {
    setReplyingToCommentId(item.id)
    setComment(`@${item.author} `)
  }

  function selectMention(name: string) {
    const match = comment.match(/(^|\s)@([^\n]*)$/)
    if (!match) return
    const replacementStart = comment.length - match[0].length + match[1].length
    setComment(`${comment.slice(0, replacementStart)}@${name} `)
  }

  function sendComment() {
    if (!commentsPost || !comment.trim()) return
    const normalizedComment = comment.trim()
    const mentionedUserIds = mentionCandidates
      .filter((candidate) => candidate.id && normalizedComment.toLocaleLowerCase().includes(`@${candidate.name.toLocaleLowerCase()}`))
      .map((candidate) => candidate.id as string)
    onAddComment(commentsPost.id, normalizedComment, replyingToCommentId, mentionedUserIds)
    setComment('')
    setReplyingToCommentId(undefined)
  }
  function toggleAnimal(id: string) { setAnimalIds((current) => current.includes(id) ? current.filter((animalId) => animalId !== id) : [...current, id]) }
  const setOccurredAt = setPostOccurredAt
  const setExpiresAt = setPostExpiresAt
  const setContact = setPostContact

  return <section className="portal-page">
    <div className="portal-page-heading"><h1 className="portal-page-title">Comunidade</h1><button type="button" className="brown-button" onClick={openNew}>+ Nova publicação / campanha</button></div>
    <div className="filter-chips community-filters">{([['all', 'Tudo'], ['Campanha', 'Campanhas'], ['Post', 'Posts']] as const).map(([value, label]) => <button key={value} type="button" className={`filter-chip ${filter === value ? 'active' : ''}`} onClick={() => { setFilter(value); setSubfilter('all') }}>{label}</button>)}</div>
    {filter === 'Campanha' && <div className="filter-chips community-subfilters"><button type="button" className={`filter-chip ${subfilter === 'all' ? 'active' : ''}`} onClick={() => setSubfilter('all')}>Todas as campanhas</button>{campaignTypes.map((value) => <button key={value} type="button" className={`filter-chip ${subfilter === value ? 'active' : ''}`} onClick={() => setSubfilter(value)}>{value}</button>)}</div>}
    {filter === 'Post' && <div className="filter-chips community-subfilters"><button type="button" className={`filter-chip ${subfilter === 'all' ? 'active' : ''}`} onClick={() => setSubfilter('all')}>Todos os posts</button>{postTypes.map((value) => <button key={value} type="button" className={`filter-chip ${subfilter === value ? 'active' : ''}`} onClick={() => setSubfilter(value)}>{value}</button>)}</div>}
    <div className="portal-grid community-grid">{displayedPosts.map((post) => <PostCard key={post.id} post={post} onEdit={openEdit} onDelete={onDeletePost} onLike={onLikePost} onComments={(id) => { setCommentsPostId(id); setReplyingToCommentId(undefined); setComment('') }} />)}</div>

    {commentsPost && <div className="legal-modal-backdrop" onClick={closeComments}><div className="community-dialog" onClick={(event) => event.stopPropagation()}><h2>{commentsPost.author}</h2><p>{commentsPost.description}</p><div className="community-list community-comments-list">{(commentsPost.commentsList ?? []).length ? commentsPost.commentsList?.map((item) => <div className={`box community-comment-box ${item.parentCommentId ? 'is-reply' : ''}`} key={item.id}><div className="community-comment-head"><div><strong>{item.author}</strong><small>{item.timeAgo}</small></div><button type="button" className="community-reply-button" onClick={() => replyToComment(item)}>Responder</button></div><div>{item.text}</div></div>) : <div className="box">Ainda não há comentários nesta publicação.</div>}</div>{replyingToCommentId && <div className="community-replying"><span>Respondendo a um comentário</span><button type="button" onClick={() => { setReplyingToCommentId(undefined); setComment('') }}>Cancelar</button></div>}<div className="community-inline-input community-comment-composer"><div className="community-comment-input-wrap"><input placeholder="Escreva um comentário como ONG..." value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendComment()} />{filteredMentionCandidates.length > 0 && <div className="community-mention-menu">{filteredMentionCandidates.map((candidate) => <button type="button" key={candidate.name} onClick={() => selectMention(candidate.name)}><span>@{candidate.name}</span><small>Participante da publicação</small></button>)}</div>}</div><button type="button" className="btn" onClick={sendComment}>Comentar</button></div></div></div>}

    {isEditorOpen && <div className="legal-modal-backdrop" onClick={() => setIsEditorOpen(false)}><div className="community-editor" onClick={(event) => event.stopPropagation()}><div className="community-editor-header"><div><span className="mono-label">COMUNIDADE</span><h2>{editingId ? 'Editar publicação' : 'Nova publicação / campanha'}</h2></div><button type="button" className="community-close" onClick={() => setIsEditorOpen(false)} aria-label="Fechar">×</button></div>
      <div className="community-editor-scroll"><CommunityField label="Tipo de publicação"><div className="chips">{(['Campanha', 'Post'] as const).map((value) => <button key={value} type="button" className={`chip ${kind === value ? 'sel' : ''}`} onClick={() => setKind(value)}>{value}</button>)}</div></CommunityField>
        {kind === 'Campanha' ? <CampaignFields campaignType={campaignType} setCampaignType={setCampaignType} title={title} setTitle={setTitle} startsAt={startsAt} setStartsAt={setStartsAt} endsAt={endsAt} setEndsAt={setEndsAt} locationName={locationName} setLocationName={setLocationName} locationAddress={locationAddress} setLocationAddress={setLocationAddress} animalAudience={animalAudience} setAnimalAudience={setAnimalAudience} capacity={capacity} setCapacity={setCapacity} animals={animals} animalIds={animalIds} toggleAnimal={toggleAnimal} confirmedAnimals={confirmedAnimals} onAddConfirmedAnimal={addConfirmedAnimal} onUpdateConfirmedAnimal={updateConfirmedAnimal} onRemoveConfirmedAnimal={removeConfirmedAnimal} onAddConfirmedAnimalPhoto={addConfirmedAnimalPhoto} deadline={deadline} setDeadline={setDeadline} goalAmount={goalAmount} setGoalAmount={setGoalAmount} acceptsPix={acceptsPix} setAcceptsPix={setAcceptsPix} acceptsItems={acceptsItems} setAcceptsItems={setAcceptsItems} neededItems={neededItems} setNeededItems={setNeededItems} /> : <PostFields postType={postType} setPostType={setPostType} title={title} setTitle={setTitle} subject={postSubject} setSubject={setPostSubject} animalType={postAnimalType} setAnimalType={setPostAnimalType} occurredAt={postOccurredAt} setOccurredAt={setOccurredAt} expiresAt={postExpiresAt} setExpiresAt={setExpiresAt} contact={postContact} setContact={setContact} locationName={locationName} setLocationName={setLocationName} locationAddress={setLocationAddress} setLocationAddress={setLocationAddress} />}
        {kind === 'Campanha' && campaignType === 'Doação' && acceptsPix && <CommunityField label="Chave Pix da ONG"><div className="community-pix-reference">{organizationPixKey.trim() ? <><span>Esta campanha usará a chave cadastrada no Perfil da ONG:</span><strong>{organizationPixKey.trim()}</strong></> : <span>Cadastre a Chave Pix no Perfil da ONG antes de publicar esta campanha.</span>}</div></CommunityField>}
        <CommunityField label="Fotos"><PhotoPicker urls={photoUrls} onChange={addPhotos} onRemove={(index) => setPhotoUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></CommunityField>
        <CommunityField label={kind === 'Campanha' ? 'Descrição e orientações' : 'O que você quer contar'}><textarea placeholder="Conte à comunidade os detalhes importantes..." value={description} onChange={(event) => setDescription(event.target.value)} /></CommunityField>
      </div><div className="community-editor-actions"><button type="button" className="btn g" onClick={() => setIsEditorOpen(false)}>Cancelar</button><button type="button" className="btn" onClick={save}>Salvar publicação</button></div></div></div>}
  </section>
}

function PostCard({ post, onEdit, onDelete, onLike, onComments }: { post: CommunityPost; onEdit: (post: CommunityPost) => void; onDelete: (id: string) => void; onLike: (id: string) => void; onComments: (id: string) => void }) {
  const image = post.imageUrls?.[0] ?? post.imageUrl
  const campaign = post.campaign
  const location = campaign?.location ?? post.location
  const requestDelete = () => {
    if (window.confirm('Excluir esta publicação da Comunidade?')) onDelete(post.id)
  }
  if (post.type === 'Campanha') return <article className="portal-card campaign-card">{image && <img className="community-card-image" src={image} alt="" />}<span className="campaign-type">{post.categoryLabel}</span><h3>{post.title}</h3>{campaign?.dateText && <small>{campaign.dateText}</small>}{!campaign?.dateText && campaign?.startsAt && <small>{dateTime(campaign.startsAt)}</small>}{location && <small>{[location.name, location.address].filter(Boolean).join(' · ')}</small>}<p>{post.description}</p><div className="progress-bar"><i style={{ width: `${post.progressPct ?? 0}%` }} /></div><span className="progress-label">{post.progressText}</span><div className="campaign-actions">{post.isOwn && <button type="button" className="outline-button" onClick={() => onEdit(post)}>Editar</button>}<button type="button" className="reject-button" onClick={requestDelete}>Excluir</button></div></article>
  return <article className="portal-card community-post" onClick={() => onComments(post.id)}>{image && <img className="community-card-image" src={image} alt="" />}<span className="mono-label">{post.postCategory ?? 'Post'} · {post.elapsed ?? 'agora'}</span><h3>{post.author}</h3>{post.postDetails?.subject && <strong>{post.postDetails.subject}</strong>}<p>{post.description}</p>{location && <small>{[location.name, location.address].filter(Boolean).join(' · ')}</small>}<small>{post.likes ?? 0} curtidas · {post.commentsList?.length ?? 0} comentários</small><div className="campaign-actions" onClick={(event) => event.stopPropagation()}><button type="button" className={`outline-button ${post.likedByCurrentUser ? 'is-liked' : ''}`} onClick={() => onLike(post.id)}>♥ {post.likedByCurrentUser ? 'Curtido' : 'Curtir'}</button>{post.isOwn && <button type="button" className="outline-button" onClick={() => onEdit(post)}>Editar</button>}<button type="button" className="reject-button" onClick={requestDelete}>Excluir</button></div></article>
}

function CampaignFields(props: any) {
  const p = props
  return <><CommunityField label="Tipo de campanha"><div className="chips">{campaignTypes.map((value) => <button key={value} type="button" className={`chip ${p.campaignType === value ? 'sel' : ''}`} onClick={() => p.setCampaignType(value)}>{value}</button>)}</div></CommunityField><CommunityField label="Título"><input placeholder="Ex.: Castração gratuita — mutirão de sábado" value={p.title} onChange={(event) => p.setTitle(event.target.value)} /></CommunityField><div className="community-form-grid"><CommunityField label="Início"><input type="datetime-local" value={p.startsAt} onChange={(event) => p.setStartsAt(event.target.value)} /></CommunityField><CommunityField label="Encerramento"><input type="datetime-local" value={p.endsAt} onChange={(event) => p.setEndsAt(event.target.value)} /></CommunityField></div><LocationFields {...p} />
    {p.campaignType !== 'Doação' && <CommunityField label="Público / animais atendidos"><input placeholder="Ex.: Cães e gatos, a partir de 4 meses" value={p.animalAudience} onChange={(event) => p.setAnimalAudience(event.target.value)} /></CommunityField>}
    {(p.campaignType === 'Castração' || p.campaignType === 'Vacinação') && <CommunityField label="Limite de vagas"><input type="number" min="1" placeholder="Deixe vazio para vagas ilimitadas" value={p.capacity} onChange={(event) => p.setCapacity(event.target.value)} /></CommunityField>}
    {p.campaignType === 'Adoção' && <ConfirmedAnimalsFields animals={p.confirmedAnimals} onAdd={p.onAddConfirmedAnimal} onUpdate={p.onUpdateConfirmedAnimal} onRemove={p.onRemoveConfirmedAnimal} onPhotoChange={p.onAddConfirmedAnimalPhoto} />}
    {p.campaignType === 'Doação' && <><div className="community-form-grid"><CommunityField label="Prazo da arrecadação"><input type="date" value={p.deadline} onChange={(event) => p.setDeadline(event.target.value)} /></CommunityField><CommunityField label="Meta financeira (R$)"><input type="number" min="0" placeholder="Ex.: 5000" value={p.goalAmount} onChange={(event) => p.setGoalAmount(event.target.value)} /></CommunityField></div><CommunityField label="Formas de doação"><div className="community-checkboxes"><label><input type="checkbox" checked={p.acceptsPix} onChange={(event) => p.setAcceptsPix(event.target.checked)} /> Aceita Pix</label><label><input type="checkbox" checked={p.acceptsItems} onChange={(event) => p.setAcceptsItems(event.target.checked)} /> Aceita itens</label></div></CommunityField><CommunityField label="Itens mais necessários"><textarea placeholder={'Ração para cães adultos\nCobertores e mantas'} value={p.neededItems} onChange={(event) => p.setNeededItems(event.target.value)} /></CommunityField></>}
  </>
}

function ConfirmedAnimalsFields({
  animals,
  onAdd,
  onUpdate,
  onRemove,
  onPhotoChange,
}: {
  animals: CommunityCampaignAnimalInput[]
  onAdd: () => void
  onUpdate: (index: number, patch: Partial<CommunityCampaignAnimalInput>) => void
  onRemove: (index: number) => void
  onPhotoChange: (index: number, event: ChangeEvent<HTMLInputElement>) => void
}) {
  return <CommunityField label={`Animais confirmados (${animals.length})`}>
    <div className="community-confirmed-animals">
      <p className="community-helper-text">Adicione os animais que participarão da campanha. Cada cadastro aparecerá na tela de animais confirmados do app.</p>
      {animals.map((animal, index) => <div className="community-confirmed-animal" key={animal.id ?? index}>
        <div className="community-confirmed-animal-fields">
          <input placeholder="Nome do animal" value={animal.name} onChange={(event) => onUpdate(index, { name: event.target.value })} />
          <input placeholder="Raça ou tipo" value={animal.breed} onChange={(event) => onUpdate(index, { breed: event.target.value })} />
          <input placeholder="Idade" value={animal.ageText} onChange={(event) => onUpdate(index, { ageText: event.target.value })} />
        </div>
        <div className="community-confirmed-animal-photo">
          {animal.photoUrl ? <img src={animal.photoUrl} alt={`Foto de ${animal.name || 'animal'}`} /> : <span>Sem foto</span>}
          <label className="community-photo-add">📷 {animal.photoUrl ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" onChange={(event) => onPhotoChange(index, event)} /></label>
          <button type="button" className="reject-button" onClick={() => onRemove(index)}>Remover</button>
        </div>
      </div>)}
      <button type="button" className="outline-button community-add-animal" onClick={onAdd}>+ Adicionar animal confirmado</button>
    </div>
  </CommunityField>
}

function PostFields(props: any) {
  const p = props
  return <><CommunityField label="Categoria"><div className="chips">{postTypes.map((value) => <button key={value} type="button" className={`chip ${p.postType === value ? 'sel' : ''}`} onClick={() => p.setPostType(value)}>{value}</button>)}</div></CommunityField>
    {p.postType === 'Achados' && <><div className="community-form-grid"><CommunityField label="Animal / identificação"><input placeholder="Ex.: Gata tricolor, coleira rosa" value={p.subject} onChange={(event) => p.setSubject(event.target.value)} /></CommunityField><CommunityField label="Espécie"><input placeholder="Ex.: Gato" value={p.animalType} onChange={(event) => p.setAnimalType(event.target.value)} /></CommunityField></div><CommunityField label="Quando foi visto"><input type="datetime-local" value={p.occurredAt} onChange={(event) => p.setOccurredAt(event.target.value)} /></CommunityField><LocationFields {...p} /><CommunityField label="Contato para retorno"><input placeholder="Telefone, e-mail ou WhatsApp" value={p.contact} onChange={(event) => p.setContact(event.target.value)} /></CommunityField></>}
    {p.postType === 'Dúvida' && <><CommunityField label="Assunto da dúvida"><input placeholder="Ex.: Como ajudar um animal ferido?" value={p.subject} onChange={(event) => p.setSubject(event.target.value)} /></CommunityField><CommunityField label="Animal relacionado (opcional)"><input placeholder="Ex.: Filhote de cachorro" value={p.animalType} onChange={(event) => p.setAnimalType(event.target.value)} /></CommunityField></>}
    {p.postType === 'Aviso' && <><CommunityField label="Título do aviso"><input placeholder="Ex.: Atendimento reduzido neste feriado" value={p.subject} onChange={(event) => p.setSubject(event.target.value)} /></CommunityField><div className="community-form-grid"><CommunityField label="Válido até (opcional)"><input type="date" value={p.expiresAt} onChange={(event) => p.setExpiresAt(event.target.value)} /></CommunityField><CommunityField label="Contato para retorno"><input placeholder="Ex.: contato@ong.org" value={p.contact} onChange={(event) => p.setContact(event.target.value)} /></CommunityField></div><LocationFields {...p} /></>}
    {p.postType === 'Outro' && <><CommunityField label="Título (opcional)"><input placeholder="Dê um título à publicação" value={p.title} onChange={(event) => p.setTitle(event.target.value)} /></CommunityField><LocationFields {...p} /></>}
  </>
}

function LocationFields({ locationName, setLocationName, locationAddress, setLocationAddress }: any) { return <div className="community-form-grid"><CommunityField label="Nome do local"><input placeholder="Ex.: Sede da ONG" value={locationName} onChange={(event) => setLocationName(event.target.value)} /></CommunityField><CommunityField label="Endereço / bairro"><input placeholder="Ex.: Vila Marlene" value={locationAddress} onChange={(event) => setLocationAddress(event.target.value)} /></CommunityField></div> }
function CommunityField({ label, children }: { label: string; children: ReactNode }) { return <label className="community-field"><span>{label}</span>{children}</label> }
function PhotoPicker({ urls, onChange, onRemove }: { urls: string[]; onChange: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: (index: number) => void }) { return <div className="community-photo-picker"><label className="community-photo-add">📷 + Adicionar fotos<input type="file" accept="image/*" multiple onChange={onChange} /></label>{urls.map((url, index) => <div className="community-photo-preview" key={url}><img src={url} alt={`Foto ${index + 1}`} /><button type="button" aria-label="Remover foto" onClick={() => onRemove(index)}>×</button></div>)}</div> }
