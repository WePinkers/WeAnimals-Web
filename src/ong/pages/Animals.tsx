import { useState, type ChangeEvent } from 'react'
import type {
  AdoptionApplicationStatus,
  AdoptionConversation,
  AnimalItem,
  Candidate,
  CandidateStatus,
} from '../types'
import { useToast } from '../components/ToastContext'
import { AnimalConversations } from '../components/AnimalConversations'

interface AnimalsProps {
  animals: AnimalItem[]
  candidates: Candidate[]
  adoptionConversations: AdoptionConversation[]
  adoptionConversationsError?: string | null
  selectedAnimalId: string
  onSelectAnimal: (id: string) => void
  onAddAnimal: (animal: Omit<AnimalItem, 'id'>) => Promise<void>
  onSendAdoptionMessage: (conversationId: string, text: string) => Promise<void>
  onUpdateApplicationStatus: (
    candidateId: string,
    status: AdoptionApplicationStatus,
  ) => Promise<void>
  onUpdateCandidateStatus: (
    candidateId: string,
    status: CandidateStatus,
    justification?: string,
  ) => void
}

function applicationStatusRank(status: AdoptionApplicationStatus): number {
  switch (status) {
    case 'pending':
      return 0
    case 'reviewing':
      return 1
    case 'approved':
      return 2
    case 'visit_scheduled':
      return 3
    case 'adopted':
      return 4
    case 'rejected':
    case 'cancelled':
      return Number.MAX_SAFE_INTEGER
  }
}

function normalizeArrivalDate(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const parts = trimmed.split('/').map((part) => part.trim())
  if (parts.length !== 3) return ''

  const [first, second, third] = parts
  if (!/^\d{1,2}$/.test(first) || !/^\d{1,2}$/.test(second) || !/^\d{4}$/.test(third)) {
    return ''
  }

  const firstNumber = Number(first)
  const secondNumber = Number(second)
  const month = firstNumber > 12 ? secondNumber : firstNumber
  const day = firstNumber > 12 ? firstNumber : secondNumber

  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${third}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const MAX_ANIMAL_PHOTO_DATA_URL_BYTES = 220_000

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Não foi possível ler a foto.'))
    }
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'))
    reader.readAsDataURL(file)
  })
}

async function compressAnimalPhoto(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file)
  if (source.length <= MAX_ANIMAL_PHOTO_DATA_URL_BYTES) return source

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Não foi possível processar a foto.'))
    element.src = source
  })

  const maxDimension = 900
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a foto.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const compressed = canvas.toDataURL('image/jpeg', 0.72)
  if (compressed.length > MAX_ANIMAL_PHOTO_DATA_URL_BYTES) {
    return canvas.toDataURL('image/jpeg', 0.5)
  }
  return compressed
}

export function Animals({
  animals,
  candidates,
  adoptionConversations,
  adoptionConversationsError,
  selectedAnimalId,
  onSelectAnimal,
  onAddAnimal,
  onSendAdoptionMessage,
  onUpdateApplicationStatus,
  onUpdateCandidateStatus,
}: AnimalsProps) {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)

  const [animalName, setAnimalName] = useState('')
  const [animalSpecies, setAnimalSpecies] = useState<'Cão' | 'Gato' | 'Outro'>('Cão')
  const [animalBreed, setAnimalBreed] = useState('')
  const [animalAgeText, setAnimalAgeText] = useState('')
  const [animalSize, setAnimalSize] = useState<'Pequeno' | 'Médio' | 'Grande'>('Médio')
  const [arrivalDate, setArrivalDate] = useState('')
  const [animalAbout, setAnimalAbout] = useState('')
  const [traits, setTraits] = useState<string[]>(['Vacinada', 'Castrada'])
  const [availableTraits, setAvailableTraits] = useState<string[]>([
    'Vacinada',
    'Castrada',
    'Dócil',
  ])
  const [newTraitText, setNewTraitText] = useState('')
  const [animalPhotos, setAnimalPhotos] = useState<string[]>([])
  const [compatibility, setCompatibility] = useState<string[]>([])
  const availableCompatibility = [
    'Bom com crianças',
    'Bom com outros cães',
    'Bom com gatos',
    'Energia moderada',
    'Calmo em casa',
  ]
  const [formError, setFormError] = useState('')

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [activeAnimalPanel, setActiveAnimalPanel] = useState<'candidates' | 'conversations'>('candidates')
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [justification, setJustification] = useState('')
  const [rejectError, setRejectError] = useState(false)

  const currentAnimal =
    animals.find((a) => a.id === selectedAnimalId) ?? animals[0]

  const animalCandidates = candidates.filter(
    (c) => c.animalId === currentAnimal?.id,
  )

  const currentCandidate =
    animalCandidates.find((c) => c.id === selectedCandidateId) ??
    animalCandidates[0]

  function toggleTrait(trait: string) {
    setTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait],
    )
  }

  function toggleCompatibility(item: string) {
    if (!compatibility.includes(item) && compatibility.length >= 3) {
      showToast('Escolha somente 3 opções de convivência.', 'i')
      return
    }
    setCompatibility((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
    )
  }

  function handleAddTrait() {
    const trimmed = newTraitText.trim()
    if (!trimmed) return
    if (!availableTraits.includes(trimmed)) {
      setAvailableTraits((prev) => [...prev, trimmed])
    }
    if (!traits.includes(trimmed)) {
      setTraits((prev) => [...prev, trimmed])
    }
    setNewTraitText('')
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    void Promise.all(Array.from(files).map(compressAnimalPhoto))
      .then((compressedPhotos) => {
        setAnimalPhotos((prev) => [...prev, ...compressedPhotos])
        setFormError('')
      })
      .catch(() => {
        setFormError('Não foi possível processar a foto. Escolha outra imagem.')
      })
      .finally(() => {
        event.target.value = ''
      })
  }

  function handleRemovePhoto(indexToRemove: number) {
    setAnimalPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  async function handleSaveAnimal() {
    const name = animalName.trim()
    const normalizedArrivalDate = normalizeArrivalDate(arrivalDate)
    if (!name || !normalizedArrivalDate) {
      setFormError(!name && !normalizedArrivalDate
        ? 'Preencha o nome e a data de chegada.'
        : !name
          ? 'Preencha o nome do animal.'
          : 'Informe uma data de chegada válida.')
      return
    }
    setFormError('')
    try {
      await onAddAnimal({
        name,
        description: `Porte ${animalSize} · chegada em ${normalizedArrivalDate}`,
        about: animalAbout.trim(),
        species: animalSpecies,
        breed: animalBreed.trim(),
        ageText: animalAgeText.trim(),
        size: animalSize,
        arrivalDate: normalizedArrivalDate,
        traits,
        compatibility,
        requirements: ['Maior de 18 anos', 'Visita prévia'],
        photos: animalPhotos,
      })
    } catch (error) {
      const errorCode = typeof error === 'object'
        && error !== null
        && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : ''
      const errorMessage = errorCode === 'permission-denied'
        ? 'O Firebase recusou a publicação. Publique as regras atuais e confirme se esta conta da ONG está aprovada.'
        : errorCode === 'invalid-argument'
          ? 'A foto ou algum dado ultrapassou o limite do Firebase. Escolha uma foto menor.'
          : 'Não foi possível publicar o animal. Tente novamente.'
      setFormError(errorMessage)
      showToast(errorMessage, '!')
      return
    }
    setAnimalName('')
    setAnimalSpecies('Cão')
    setAnimalBreed('')
    setAnimalAgeText('')
    setArrivalDate('')
    setAnimalAbout('')
    setCompatibility([])
    setAnimalPhotos([])
    setShowForm(false)
    showToast('Animal cadastrado com fotos e publicado para adoção!', '🐾')
  }

  function handleReject() {
    if (!currentCandidate) return
    if (!justification.trim()) {
      setRejectError(true)
      return
    }
    setRejectError(false)
    onUpdateCandidateStatus(currentCandidate.id, 'recusado', justification.trim())
    setJustification('')
    showToast(`Candidatura de ${currentCandidate.name} recusada.`, '✕')
  }

  const applicationStatusOptions: Array<{
    value: AdoptionApplicationStatus
    label: string
  }> = [
    { value: 'reviewing', label: 'Em análise' },
    { value: 'visit_scheduled', label: 'Visita agendada' },
    { value: 'adopted', label: 'Adoção confirmada' },
  ]

  function handleApplicationStatusChange(status: AdoptionApplicationStatus) {
    if (!currentCandidate) return
    if (status === 'rejected' && !justification.trim()) {
      setRejectError(true)
      return
    }
    setRejectError(false)
    void onUpdateApplicationStatus(currentCandidate.id, status)
    setJustification('')
    const statusLabel = applicationStatusOptions.find((option) => option.value === status)?.label
      ?? (status === 'rejected' ? 'Recusada' : status)
    showToast(`Status atualizado para ${statusLabel.toLowerCase()}.`, '✓')
  }

  const currentApplicationStatus = currentCandidate?.applicationStatus ?? 'pending'
  const currentApplicationRank = currentCandidate
    ? applicationStatusRank(currentApplicationStatus)
    : 0
  const canChangeApplicationStatus = currentApplicationStatus === 'pending'
    || currentApplicationStatus === 'reviewing'
  const applicationIsAtOrPast = (status: AdoptionApplicationStatus) =>
    status !== 'rejected'
    && applicationStatusRank(status) <= currentApplicationRank

  return (
    <section className="portal-page">
      <div className="head">
        <h1 className="portal-page-title">Animais</h1>
        <button
          type="button"
          className="btn"
          onClick={() => setShowForm((visible) => !visible)}
        >
          + Cadastrar animal
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Cadastrar animal</h2>
          <div className="portal-grid g3">
            <div>
              <div className="mono">Nome</div>
              <input
                type="text"
                style={{ marginTop: 6 }}
                placeholder="Ex: Duquesa"
                value={animalName}
                onChange={(e) => {
                  setAnimalName(e.target.value)
                  setFormError('')
                }}
              />
            </div>
            <div>
              <div className="mono">Porte</div>
              <div className="chips">
                {(['Pequeno', 'Médio', 'Grande'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`chip ${animalSize === size ? 'sel' : ''}`}
                    onClick={() => setAnimalSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mono">Chegada ao abrigo</div>
              <input
                type="date"
                style={{ marginTop: 6 }}
                value={arrivalDate}
                onChange={(e) => {
                  setArrivalDate(normalizeArrivalDate(e.target.value))
                  setFormError('')
                }}
              />
            </div>
          </div>

          <div className="portal-grid g3" style={{ marginTop: 12 }}>
            <div>
              <div className="mono">Espécie</div>
              <div className="chips" style={{ marginBottom: 0 }}>
                {(['Cão', 'Gato', 'Outro'] as const).map((species) => (
                  <button
                    key={species}
                    type="button"
                    className={`chip ${animalSpecies === species ? 'sel' : ''}`}
                    onClick={() => setAnimalSpecies(species)}
                  >
                    {species}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mono">Raça ou tipo</div>
              <input
                type="text"
                style={{ marginTop: 6 }}
                placeholder="Ex: SRD"
                value={animalBreed}
                onChange={(e) => setAnimalBreed(e.target.value)}
              />
            </div>
            <div>
              <div className="mono">Idade</div>
              <input
                type="text"
                style={{ marginTop: 6 }}
                placeholder="Ex: 2 anos"
                value={animalAgeText}
                onChange={(e) => setAnimalAgeText(e.target.value)}
              />
            </div>
          </div>

          <div className="mono" style={{ marginTop: 12 }}>
            Fotos do animal
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              margin: '8px 0 14px',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'var(--s0)',
                border: '1.5px dashed var(--ln)',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12.5,
                color: 'var(--p8)',
              }}
            >
              📷 + Adicionar fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </label>

            {animalPhotos.map((src, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid var(--ln)',
                }}
              >
                <img
                  src={src}
                  alt={`Foto ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  aria-label="Remover foto"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: 0,
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    fontSize: 11,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mono" style={{ marginTop: 12 }}>
            Características
          </div>
          <div className="chips" style={{ alignItems: 'center' }}>
            {availableTraits.map((trait) => (
              <button
                key={trait}
                type="button"
                className={`chip ${traits.includes(trait) ? 'sel' : ''}`}
                onClick={() => toggleTrait(trait)}
              >
                {trait}
              </button>
            ))}
            <input
              type="text"
              placeholder="+ Nova característica"
              value={newTraitText}
              onChange={(e) => setNewTraitText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTrait()
              }}
              style={{ width: 170, padding: '6px 12px', margin: 0 }}
            />
          </div>

          <div
            className="animal-form-details"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.35fr)',
              gap: 18,
              marginTop: 18,
            }}
          >
            <div>
              <div className="mono">Convivência</div>
              <div className="form-help">
                Escolha somente 3 opções sobre como o animal convive no dia a dia.
              </div>
              <div className="chips" style={{ marginBottom: 0 }}>
                {availableCompatibility.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip ${compatibility.includes(item) ? 'sel' : ''}`}
                    disabled={compatibility.length >= 3 && !compatibility.includes(item)}
                    onClick={() => toggleCompatibility(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mono">Sobre o animal</div>
              <div className="form-help">
                Conte um pouco sobre a personalidade, rotina e cuidados necessários.
              </div>
              <textarea
                rows={4}
                placeholder="Ex: Dócil, brincalhona e acostumada com pessoas..."
                value={animalAbout}
                onChange={(e) => setAnimalAbout(e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <div className="err" style={{ display: 'block' }}>
              {formError}
            </div>
          )}

          <button type="button" className="btn" onClick={handleSaveAnimal}>
            Publicar para adoção
          </button>
        </div>
      )}

      <div className="portal-grid animals-grid">
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Animal</th>
                <th>Candidaturas</th>
              </tr>
            </thead>
            <tbody>
              {animals.map((animal) => {
                const count = candidates.filter(
                  (c) => c.animalId === animal.id,
                ).length
                return (
                  <tr
                    key={animal.id}
                    className={`k ${currentAnimal?.id === animal.id ? 'selected-row' : ''}`}
                    onClick={() => {
                      onSelectAnimal(animal.id)
                      setSelectedCandidateId(null)
                      setRejectError(false)
                    }}
                  >
                    <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {animal.photos && animal.photos[0] ? (
                        <img
                          src={animal.photos[0]}
                          alt={animal.name}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div className="ic">🐾</div>
                      )}
                      <div>
                        <b>{animal.name}</b>
                        <div className="s" style={{ fontSize: 12, color: 'var(--i6)' }}>
                          {animal.description}
                        </div>
                      </div>
                    </td>
                    <td>{count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card candidate-card">
          <div className="animal-panel-tabs" role="tablist" aria-label="Informações do animal">
            <button
              type="button"
              className={activeAnimalPanel === 'candidates' ? 'active' : ''}
              onClick={() => setActiveAnimalPanel('candidates')}
            >
              Candidaturas <span>{animalCandidates.length}</span>
            </button>
            <button
              type="button"
              className={activeAnimalPanel === 'conversations' ? 'active' : ''}
              onClick={() => setActiveAnimalPanel('conversations')}
            >
              Conversas <span>{adoptionConversations.filter((conversation) => conversation.animalId === currentAnimal?.id).length}</span>
            </button>
          </div>

          {activeAnimalPanel === 'conversations' ? (
            <AnimalConversations
              animalId={currentAnimal?.id}
              animalName={currentAnimal?.name ?? 'este animal'}
              conversations={adoptionConversations}
              error={adoptionConversationsError}
              onSendMessage={onSendAdoptionMessage}
            />
          ) : animalCandidates.length === 0 ? (
            <div className="box">
              Ainda não há candidatos para {currentAnimal?.name}.
            </div>
          ) : (
            <>
              {animalCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className={`row ${currentCandidate?.id === cand.id ? 'sel' : ''}`}
                  onClick={() => {
                    setSelectedCandidateId(cand.id)
                    setRejectError(false)
                  }}
                >
                  <div className="ic">{cand.name.charAt(0)}</div>
                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                      alignSelf: 'center',
                      height: 34,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      className="t"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 18,
                        minWidth: 0,
                        overflow: 'visible',
                        whiteSpace: 'nowrap',
                        lineHeight: '18px',
                      }}
                    >
                      {cand.name}
                      {cand.status === 'aprovado' && (
                        <span
                          className="pill ok"
                          style={{
                            marginLeft: 0,
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 18,
                            padding: '0 8px',
                            lineHeight: '18px',
                            transform: 'translateY(6px)',
                          }}
                        >
                          Aprovado
                        </span>
                      )}
                      {cand.status === 'recusado' && (
                        <span
                          className="pill"
                          style={{
                            marginLeft: 0,
                            background: 'var(--a1)',
                            color: 'var(--a6)',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 18,
                            padding: '0 8px',
                            lineHeight: '18px',
                          }}
                        >
                          Recusado
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        height: 14,
                        margin: '2px 0 0',
                        padding: 0,
                        color: 'var(--i6)',
                        fontSize: 12,
                        lineHeight: '14px',
                      }}
                    >
                      {cand.location}
                    </div>
                  </div>
                  <div className="r" style={{ alignSelf: 'center', flexShrink: 0 }}>
                    <b>{cand.pct}%</b>
                  </div>
                </div>
              ))}

              {currentCandidate && (
                <>
                  <div className="box">
                    <b>{currentCandidate.name}</b> · {currentCandidate.pct}% compatível ·{' '}
                    {currentCandidate.summary}
                    <br />
                    <button
                      type="button"
                      onClick={() => setShowQuestionnaire((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        marginTop: 6,
                        color: 'var(--p7)',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        textDecoration: 'underline',
                      }}
                    >
                      {showQuestionnaire
                        ? 'Ocultar respostas do questionário'
                        : 'Ver respostas completas do questionário'}
                    </button>
                  </div>

                  {showQuestionnaire && (
                    <div style={{ marginTop: 12 }}>
                      {currentCandidate.answers.map((item) => (
                        <div className="ans" key={item.question}>
                          <div>{item.question}</div>
                          <b>{item.answer}</b>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentCandidate.applicationStatus ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="mono">Atualizar status da candidatura</div>
                      <div className="chips" style={{ marginTop: 8 }}>
                        {applicationStatusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`chip ${(
                              currentCandidate.applicationStatus === option.value
                              || (currentCandidate.applicationStatus === 'pending' && option.value === 'reviewing')
                            ) ? 'sel' : ''}`}
                            disabled={applicationIsAtOrPast(option.value)}
                            onClick={() => handleApplicationStatusChange(option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {canChangeApplicationStatus ? (
                        <>
                          <div className="mono" style={{ marginTop: 12 }}>
                            Justificativa (obrigatória ao recusar)
                          </div>
                          <textarea
                            placeholder="Motivo da decisão…"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                          />
                          {rejectError && (
                            <div className="err" style={{ display: 'block' }}>
                              Escreva uma justificativa para recusar.
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            <button
                              type="button"
                              className="btn rj"
                              onClick={() => handleApplicationStatusChange('rejected')}
                            >
                              Recusar
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : currentCandidate.status === 'pendente' ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="mono">Justificativa (obrigatória ao recusar)</div>
                      <textarea
                        placeholder="Motivo da decisão…"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                      />
                      {rejectError && (
                        <div className="err" style={{ display: 'block' }}>
                          Escreva uma justificativa para recusar.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button type="button" className="btn rj" onClick={handleReject}>
                          Recusar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="box"
                      style={{
                        textAlign: 'center',
                        fontWeight: 600,
                        color:
                          currentCandidate.status === 'aprovado'
                            ? 'var(--p7)'
                            : 'var(--a6)',
                      }}
                    >
                      {currentCandidate.status === 'aprovado'
                        ? '✓ Adoção Aprovada'
                        : `✕ Candidatura Recusada: ${currentCandidate.justification}`}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
