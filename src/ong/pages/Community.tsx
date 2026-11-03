import { useState, type ChangeEvent, type ReactNode } from 'react'
import type { AnimalItem, CampaignCategory, CommunityPost, CommunityPostCategory, CommunityPostInput } from '../types'
import { useToast } from '../components/ToastContext'

interface CommunityProps {
  posts: CommunityPost[]
  animals: AnimalItem[]
  onSavePost: (postData: CommunityPostInput) => void
  onDeletePost: (id: string) => void
  onLikePost: (id: string) => void
  onAddComment: (postId: string, text: string) => void
  onAddSubscriber: (postId: string, subscriber: { name: string; contact: string; detail: string }) => void
}

const campaignTypes: CampaignCategory[] = ['Castração', 'Vacinação', 'Adoção', 'Doação']
const postTypes: CommunityPostCategory[] = ['Achados', 'Dúvida', 'Aviso', 'Outro']
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const validCampaign = (value: string): value is CampaignCategory => campaignTypes.includes(value as CampaignCategory)
const dateTime = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''

export function Community({ posts, animals, onSavePost, onDeletePost, onLikePost, onAddComment, onAddSubscriber }: CommunityProps) {
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'Campanha' | 'Post'>('all')
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
  const [subscriberPostId, setSubscriberPostId] = useState<string | null>(null)
  const [subscriberName, setSubscriberName] = useState('')
  const [subscriberContact, setSubscriberContact] = useState('')
  const [subscriberDetail, setSubscriberDetail] = useState('')
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const subscribersPost = posts.find((post) => post.id === subscriberPostId)
  const commentsPost = posts.find((post) => post.id === commentsPostId)
  const displayedPosts = posts.filter((post) => filter === 'all' || post.type === filter)

  function resetForm() {
    setEditingId(undefined); setKind('Campanha'); setCampaignType('Castração'); setPostType('Aviso')
    setTitle(''); setDescription(''); setPhotoUrls([]); setStartsAt(''); setEndsAt(''); setLocationName(''); setLocationAddress('')
    setAnimalAudience(''); setCapacity(''); setAnimalIds([]); setDeadline(''); setGoalAmount(''); setAcceptsPix(true); setAcceptsItems(true); setNeededItems('')
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
    setAnimalAudience(campaign?.animalAudience ?? ''); setCapacity(campaign?.capacity?.toString() ?? ''); setAnimalIds(campaign?.animalIds ?? [])
    setDeadline(donation?.deadline ?? ''); setGoalAmount(donation?.goalAmount?.toString() ?? ''); setAcceptsPix(donation?.acceptsPix ?? true); setAcceptsItems(donation?.acceptsItems ?? true); setNeededItems((donation?.neededItems ?? []).join('\n'))
    setPostSubject(details?.subject ?? ''); setPostAnimalType(details?.animalType ?? ''); setPostOccurredAt(details?.occurredAt ?? ''); setPostExpiresAt(details?.expiresAt ?? ''); setPostContact(details?.contact ?? '')
    setIsEditorOpen(true)
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setPhotoUrls((current) => [...current, result])
        }
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  function save() {
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
      const campaign = { startsAt: startsAt || undefined, endsAt: endsAt || undefined, location, animalAudience: animalAudience.trim() || undefined, capacity: Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null, animalIds: campaignType === 'Adoção' ? animalIds : [], donation }
      const subscriberCount = existing?.subscribers?.length ?? 0
      const progressText = campaignType === 'Doação' && donation?.goalAmount ? `${currency(donation.currentAmount ?? 0)} de ${currency(donation.goalAmount)}` : campaign.capacity ? `${subscriberCount} de ${campaign.capacity} vagas preenchidas` : 'Sem limite de vagas'
      const progressPct = campaignType === 'Doação' && donation?.goalAmount ? Math.min(100, ((donation.currentAmount ?? 0) / donation.goalAmount) * 100) : campaign.capacity ? Math.min(100, (subscriberCount / campaign.capacity) * 100) : 0
      payload = { id: editingId, title: title.trim(), type: 'Campanha', categoryLabel: campaignType, description: description.trim(), campaign, progressText, progressPct, imageUrl: photoUrls[0], imageUrls: photoUrls }
    } else {
      payload = { id: editingId, title: title.trim() || postSubject.trim() || postType, type: 'Post', categoryLabel: 'Post', description: description.trim(), postCategory: postType, location, imageUrl: photoUrls[0], imageUrls: photoUrls, postDetails: { subject: postSubject.trim() || undefined, animalType: postAnimalType.trim() || undefined, occurredAt: postOccurredAt || undefined, expiresAt: postExpiresAt || undefined, contact: postContact.trim() || undefined } }
    }
    onSavePost(payload); setIsEditorOpen(false)
    showToast(editingId ? 'Publicação atualizada com sucesso!' : 'Publicação criada com sucesso!', '📢')
  }

  function addSubscriber() {
    if (!subscribersPost || !subscriberName.trim()) { showToast('Informe o nome do inscrito.', '⚠️'); return }
    onAddSubscriber(subscribersPost.id, { name: subscriberName.trim(), contact: subscriberContact.trim() || 'Sem telefone', detail: subscriberDetail.trim() || 'Inscrição confirmada' })
    setSubscriberName(''); setSubscriberContact(''); setSubscriberDetail('')
  }
  function sendComment() { if (commentsPost && comment.trim()) { onAddComment(commentsPost.id, comment.trim()); setComment('') } }
  function toggleAnimal(id: string) { setAnimalIds((current) => current.includes(id) ? current.filter((animalId) => animalId !== id) : [...current, id]) }

  return <section className="portal-page">
    <div className="portal-page-heading"><h1 className="portal-page-title">Comunidade</h1><button type="button" className="brown-button" onClick={openNew}>+ Nova publicação / campanha</button></div>
    <div className="filter-chips community-filters">{([['all', 'Tudo'], ['Campanha', 'Campanhas'], ['Post', 'Posts']] as const).map(([value, label]) => <button key={value} type="button" className={`filter-chip ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="portal-grid community-grid">{displayedPosts.map((post) => <PostCard key={post.id} post={post} onEdit={openEdit} onDelete={onDeletePost} onLike={onLikePost} onComments={setCommentsPostId} onSubscribers={setSubscriberPostId} />)}</div>

    {subscribersPost && <div className="legal-modal-backdrop" onClick={() => setSubscriberPostId(null)}><div className="community-dialog" onClick={(event) => event.stopPropagation()}><div className="head"><h2>Inscritos · {subscribersPost.title}</h2><span className="pill ok">{subscribersPost.progressText}</span></div><div className="community-list">{(subscribersPost.subscribers ?? []).length ? subscribersPost.subscribers?.map((sub) => <div key={sub.id} className="row"><div className="ic">{sub.name[0]}</div><div><strong>{sub.name}</strong><small>{sub.contact} · {sub.detail}</small></div></div>) : <div className="box">Nenhum inscrito registrado até o momento.</div>}</div><div className="community-divider" /><div className="community-form-grid three"><CommunityField label="Nome completo"><input value={subscriberName} onChange={(event) => setSubscriberName(event.target.value)} /></CommunityField><CommunityField label="Telefone"><input value={subscriberContact} onChange={(event) => setSubscriberContact(event.target.value)} /></CommunityField><CommunityField label="Detalhe / animal"><input value={subscriberDetail} onChange={(event) => setSubscriberDetail(event.target.value)} /></CommunityField></div><div className="community-editor-actions"><button type="button" className="btn g" onClick={() => setSubscriberPostId(null)}>Fechar</button><button type="button" className="btn" onClick={addSubscriber}>Confirmar inscrição</button></div></div></div>}
    {commentsPost && <div className="legal-modal-backdrop" onClick={() => setCommentsPostId(null)}><div className="community-dialog" onClick={(event) => event.stopPropagation()}><h2>{commentsPost.author}</h2><p>{commentsPost.description}</p><div className="community-list">{(commentsPost.commentsList ?? []).map((item) => <div className="box" key={item.id}><strong>{item.author}</strong><small>{item.timeAgo}</small><div>{item.text}</div></div>)}</div><div className="community-inline-input"><input placeholder="Escreva um comentário como ONG..." value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendComment()} /><button type="button" className="btn" onClick={sendComment}>Comentar</button></div></div></div>}

    {isEditorOpen && <div className="legal-modal-backdrop" onClick={() => setIsEditorOpen(false)}><div className="community-editor" onClick={(event) => event.stopPropagation()}><div className="community-editor-header"><div><span className="mono-label">COMUNIDADE</span><h2>{editingId ? 'Editar publicação' : 'Nova publicação / campanha'}</h2></div><button type="button" className="community-close" onClick={() => setIsEditorOpen(false)} aria-label="Fechar">×</button></div>
      <div className="community-editor-scroll"><CommunityField label="Tipo de publicação"><div className="chips">{(['Campanha', 'Post'] as const).map((value) => <button key={value} type="button" className={`chip ${kind === value ? 'sel' : ''}`} onClick={() => setKind(value)}>{value}</button>)}</div></CommunityField>
        {kind === 'Campanha' ? <CampaignFields campaignType={campaignType} setCampaignType={setCampaignType} title={title} setTitle={setTitle} startsAt={startsAt} setStartsAt={setStartsAt} endsAt={endsAt} setEndsAt={setEndsAt} locationName={locationName} setLocationName={setLocationName} locationAddress={locationAddress} setLocationAddress={setLocationAddress} animalAudience={animalAudience} setAnimalAudience={setAnimalAudience} capacity={capacity} setCapacity={setCapacity} animals={animals} animalIds={animalIds} toggleAnimal={toggleAnimal} deadline={deadline} setDeadline={setDeadline} goalAmount={goalAmount} setGoalAmount={setGoalAmount} acceptsPix={acceptsPix} setAcceptsPix={setAcceptsPix} acceptsItems={acceptsItems} setAcceptsItems={setAcceptsItems} neededItems={neededItems} setNeededItems={setNeededItems} /> : <PostFields postType={postType} setPostType={setPostType} title={title} setTitle={setTitle} subject={postSubject} setSubject={setPostSubject} animalType={postAnimalType} setAnimalType={setPostAnimalType} occurredAt={postOccurredAt} setOccurredAt={setPostOccurredAt} expiresAt={postExpiresAt} setExpiresAt={setPostExpiresAt} contact={postContact} setContact={setPostContact} locationName={locationName} setLocationName={setLocationName} locationAddress={locationAddress} setLocationAddress={setLocationAddress} />}
        <CommunityField label="Fotos"><PhotoPicker urls={photoUrls} onChange={addPhotos} onRemove={(index) => setPhotoUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></CommunityField>
        <CommunityField label={kind === 'Campanha' ? 'Descrição e orientações' : 'O que você quer contar'}><textarea placeholder="Conte à comunidade os detalhes importantes..." value={description} onChange={(event) => setDescription(event.target.value)} /></CommunityField>
      </div><div className="community-editor-actions"><button type="button" className="btn g" onClick={() => setIsEditorOpen(false)}>Cancelar</button><button type="button" className="btn" onClick={save}>Salvar publicação</button></div></div></div>}
  </section>
}

function PostCard({ post, onEdit, onDelete, onLike, onComments, onSubscribers }: { post: CommunityPost; onEdit: (post: CommunityPost) => void; onDelete: (id: string) => void; onLike: (id: string) => void; onComments: (id: string) => void; onSubscribers: (id: string) => void }) {
  const image = post.imageUrls?.[0] ?? post.imageUrl
  const campaign = post.campaign
  const location = campaign?.location ?? post.location
  const subscribers = post.subscribers?.length ?? 0
  if (post.type === 'Campanha') return <article className="portal-card campaign-card">{image && <img className="community-card-image" src={image} alt="" />}<span className="campaign-type">{post.categoryLabel}</span><h3>{post.title}</h3>{campaign?.startsAt && <small>{dateTime(campaign.startsAt)}</small>}{location && <small>{[location.name, location.address].filter(Boolean).join(' · ')}</small>}<p>{post.description}</p><div className="progress-bar"><i style={{ width: `${post.progressPct ?? 0}%` }} /></div><span className="progress-label">{post.progressText} · {subscribers} inscritos</span><div className="campaign-actions"><button type="button" className="outline-button" onClick={() => onEdit(post)}>Editar</button><button type="button" className="outline-button" onClick={() => onSubscribers(post.id)}>Inscritos ({subscribers})</button><button type="button" className="reject-button" onClick={() => onDelete(post.id)}>Excluir</button></div></article>
  return <article className="portal-card community-post" onClick={() => onComments(post.id)}>{image && <img className="community-card-image" src={image} alt="" />}<span className="mono-label">{post.postCategory ?? 'Post'} · {post.elapsed ?? 'agora'}</span><h3>{post.author}</h3>{post.postDetails?.subject && <strong>{post.postDetails.subject}</strong>}<p>{post.description}</p>{location && <small>{[location.name, location.address].filter(Boolean).join(' · ')}</small>}<small>{post.likes ?? 0} curtidas · {post.commentsList?.length ?? 0} comentários</small><div className="campaign-actions" onClick={(event) => event.stopPropagation()}><button type="button" className="outline-button" onClick={() => onLike(post.id)}>♥ Curtir</button><button type="button" className="outline-button" onClick={() => onEdit(post)}>Editar</button><button type="button" className="reject-button" onClick={() => onDelete(post.id)}>Excluir</button></div></article>
}

function CampaignFields(props: any) {
  const p = props
  return <><CommunityField label="Tipo de campanha"><div className="chips">{campaignTypes.map((value) => <button key={value} type="button" className={`chip ${p.campaignType === value ? 'sel' : ''}`} onClick={() => p.setCampaignType(value)}>{value}</button>)}</div></CommunityField><CommunityField label="Título"><input placeholder="Ex.: Castração gratuita — mutirão de sábado" value={p.title} onChange={(event) => p.setTitle(event.target.value)} /></CommunityField><div className="community-form-grid"><CommunityField label="Início"><input type="datetime-local" value={p.startsAt} onChange={(event) => p.setStartsAt(event.target.value)} /></CommunityField><CommunityField label="Encerramento"><input type="datetime-local" value={p.endsAt} onChange={(event) => p.setEndsAt(event.target.value)} /></CommunityField></div><LocationFields {...p} />
    {p.campaignType !== 'Doação' && <CommunityField label="Público / animais atendidos"><input placeholder="Ex.: Cães e gatos, a partir de 4 meses" value={p.animalAudience} onChange={(event) => p.setAnimalAudience(event.target.value)} /></CommunityField>}
    {(p.campaignType === 'Castração' || p.campaignType === 'Vacinação') && <CommunityField label="Limite de vagas"><input type="number" min="1" placeholder="Deixe vazio para vagas ilimitadas" value={p.capacity} onChange={(event) => p.setCapacity(event.target.value)} /></CommunityField>}
    {p.campaignType === 'Adoção' && <CommunityField label="Animais confirmados para o evento"><div className="community-animal-options">{p.animals.map((animal: AnimalItem) => <label key={animal.id}><input type="checkbox" checked={p.animalIds.includes(animal.id)} onChange={() => p.toggleAnimal(animal.id)} /> <span>{animal.name}</span></label>)}</div></CommunityField>}
    {p.campaignType === 'Doação' && <><div className="community-form-grid"><CommunityField label="Prazo da arrecadação"><input type="date" value={p.deadline} onChange={(event) => p.setDeadline(event.target.value)} /></CommunityField><CommunityField label="Meta financeira (R$)"><input type="number" min="0" placeholder="Ex.: 5000" value={p.goalAmount} onChange={(event) => p.setGoalAmount(event.target.value)} /></CommunityField></div><CommunityField label="Formas de doação"><div className="community-checkboxes"><label><input type="checkbox" checked={p.acceptsPix} onChange={(event) => p.setAcceptsPix(event.target.checked)} /> Aceita Pix</label><label><input type="checkbox" checked={p.acceptsItems} onChange={(event) => p.setAcceptsItems(event.target.checked)} /> Aceita itens</label></div></CommunityField><CommunityField label="Itens mais necessários"><textarea placeholder={'Ração para cães adultos\nCobertores e mantas'} value={p.neededItems} onChange={(event) => p.setNeededItems(event.target.value)} /></CommunityField></>}
  </>
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
