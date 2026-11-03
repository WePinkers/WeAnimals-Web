import { useState, type ChangeEvent } from 'react'
import type { AnimalItem, AnimalStatus, Candidate, CandidateStatus, CheckInRecord } from '../types'
import { useToast } from '../components/ToastContext'

interface AnimalsProps {
  animals: AnimalItem[]
  candidates: Candidate[]
  checkIns: CheckInRecord[]
  selectedAnimalId: string
  onSelectAnimal: (id: string) => void
  onAddAnimal: (animal: Omit<AnimalItem, 'id'>) => void
  onUpdateCandidateStatus: (
    candidateId: string,
    status: CandidateStatus,
    justification?: string,
  ) => void
}

export function Animals({
  animals,
  candidates,
  checkIns,
  selectedAnimalId,
  onSelectAnimal,
  onAddAnimal,
  onUpdateCandidateStatus,
}: AnimalsProps) {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)

  const [animalName, setAnimalName] = useState('')
  const [animalSpecies, setAnimalSpecies] = useState<'Cão' | 'Gato' | 'Outro'>('Cão')
  const [animalSex, setAnimalSex] = useState<'Macho' | 'Fêmea' | 'Não informado'>('Não informado')
  const [animalBreed, setAnimalBreed] = useState('SRD')
  const [animalAge, setAnimalAge] = useState('')
  const [animalSize, setAnimalSize] = useState<'Pequeno' | 'Médio' | 'Grande'>('Médio')
  const [arrivalDate, setArrivalDate] = useState('')
  const [animalStatus, setAnimalStatus] = useState<AnimalStatus>('Disponível')
  const [animalStory, setAnimalStory] = useState('')
  const [animalLocation, setAnimalLocation] = useState('')
  const [energyLevel, setEnergyLevel] = useState<'Baixa' | 'Moderada' | 'Alta'>('Moderada')
  const [idealHome, setIdealHome] = useState('')
  const [traits, setTraits] = useState<string[]>(['Vacinada', 'Castrada'])
  const [availableTraits, setAvailableTraits] = useState<string[]>([
    'Vacinada',
    'Castrada',
    'Dócil',
  ])
  const [newTraitText, setNewTraitText] = useState('')
  const [compatibility, setCompatibility] = useState<string[]>([])
  const [requirements, setRequirements] = useState<string[]>(['Maior de 18 anos', 'Visita prévia'])
  const [newRequirementText, setNewRequirementText] = useState('')
  const [animalPhotos, setAnimalPhotos] = useState<string[]>([])
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [showAnimalDetails, setShowAnimalDetails] = useState(true)
  const [formError, setFormError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Rascunho' | 'Disponível' | 'Em processo' | 'Adotado' | 'Pausado'>('Todos')

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
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

  const visibleAnimals = animals.filter((animal) =>
    statusFilter === 'Todos' || (animal.status ?? 'Disponível') === statusFilter,
  )
  const countByStatus = (status: string) => animals.filter((animal) => (animal.status ?? 'Disponível') === status).length
  const activeCheckInCount = checkIns.length
  const selectedAnimalCheckIns = checkIns.filter(
    (entry) => entry.animalId === currentAnimal?.id || entry.animal === currentAnimal?.name,
  ).length
  const normalizeAgeText = (value?: string) => {
    const trimmed = value?.trim()
    if (!trimmed) return 'idade não informada'

    const plainNumberMatch = trimmed.match(/^\s*(\d+)\s*$/)
    if (plainNumberMatch) {
      const amount = Number(plainNumberMatch[1])
      return `${amount} ${amount === 1 ? 'ano' : 'anos'}`
    }

    const withUnitMatch = trimmed.match(/^(\d+)\s*(ano|anos|mês|meses)$/i)
    if (withUnitMatch) {
      const amount = Number(withUnitMatch[1])
      const unit = withUnitMatch[2].toLowerCase()
      const normalizedUnit = unit === 'ano' || unit === 'anos' ? (amount === 1 ? 'ano' : 'anos') : (amount === 1 ? 'mês' : 'meses')
      return `${amount} ${normalizedUnit}`
    }

    return trimmed
  }

  const getAnimalAgeText = (animal?: AnimalItem) => {
    if (!animal) return 'idade não informada'
    const estimatedAge = normalizeAgeText(animal.estimatedAge)
    if (estimatedAge !== 'idade não informada') return estimatedAge

    const match = (animal.description ?? '').match(/(\d+\s*(?:ano|anos|mês|meses|ano\s*e?\s*mes|meses))/i)
    return match ? normalizeAgeText(match[1]) : 'idade não informada'
  }

  const currentAnimalAgeText = getAnimalAgeText(currentAnimal)

  function toggleTrait(trait: string) {
    setTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait],
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

  function toggleCompatibility(value: string) {
    setCompatibility((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  function handleAddRequirement() {
    const trimmed = newRequirementText.trim()
    if (!trimmed || requirements.includes(trimmed)) return
    setRequirements((current) => [...current, trimmed])
    setNewRequirementText('')
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAnimalPhotos((prev) => {
            const updatedPhotos = [...prev, reader.result as string]
            if (!coverPhoto && updatedPhotos.length > 0) {
              setCoverPhoto(updatedPhotos[0])
            }
            return updatedPhotos
          })
        }
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  function handleRemovePhoto(indexToRemove: number) {
    setAnimalPhotos((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove)
      if (updated.length === 0) {
        setCoverPhoto(null)
      } else if (coverPhoto === prev[indexToRemove]) {
        setCoverPhoto(updated[0])
      }
      return updated
    })
  }

  function saveAnimal(nextStatus: AnimalStatus, successMessage: string) {
    if (!animalName.trim() || !arrivalDate) {
      setFormError(true)
      return
    }

    if (nextStatus !== 'Rascunho' && animalPhotos.length === 0) {
      setFormError(true)
      return
    }

    setFormError(false)
    const pickCoverPhoto = coverPhoto || animalPhotos[0] || undefined
    const normalizedAnimalAge = normalizeAgeText(animalAge)

    onAddAnimal({
      name: animalName.trim(),
      description: `${animalSpecies} · ${normalizedAnimalAge === 'idade não informada' ? 'idade não informada' : normalizedAnimalAge} · porte ${animalSize.toLowerCase()}`,
      size: animalSize,
      arrivalDate,
      traits,
      requirements,
      photos: animalPhotos,
      coverPhoto: pickCoverPhoto,
      species: animalSpecies,
      sex: animalSex,
      breed: animalBreed.trim() || 'SRD',
      estimatedAge: normalizeAgeText(animalAge) === 'idade não informada' ? undefined : normalizeAgeText(animalAge),
      status: nextStatus,
      story: animalStory.trim() || undefined,
      health: traits,
      compatibility,
      energyLevel,
      idealHome: idealHome.trim() || undefined,
      location: animalLocation.trim() || undefined,
      publishedAt: nextStatus === 'Rascunho' ? undefined : new Date().toISOString(),
    })

    setAnimalName('')
    setAnimalSpecies('Cão')
    setAnimalSex('Não informado')
    setAnimalBreed('SRD')
    setAnimalAge('')
    setArrivalDate('')
    setAnimalStatus('Disponível')
    setAnimalStory('')
    setAnimalLocation('')
    setEnergyLevel('Moderada')
    setIdealHome('')
    setCompatibility([])
    setRequirements(['Maior de 18 anos', 'Visita prévia'])
    setAnimalPhotos([])
    setCoverPhoto(null)
    setShowForm(false)
    showToast(successMessage, '🐾')
  }

  function handleSaveDraft() {
    saveAnimal('Rascunho', 'Rascunho salvo com sucesso!')
  }

  function handleSaveAnimal() {
    const nextStatus: AnimalStatus = animalStatus === 'Rascunho' || animalStatus === 'Pausado' || animalStatus === 'Em processo' ? animalStatus : 'Disponível'
    saveAnimal(nextStatus, 'Animal cadastrado e publicado para adoção!')
  }

  function handleApprove() {
    if (!currentCandidate) return
    onUpdateCandidateStatus(currentCandidate.id, 'aprovado')
    showToast(`Adoção aprovada para ${currentCandidate.name}!`, '🎉')
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

      <div className="portal-grid g3" style={{ marginBottom: 18, gap: 16 }}>
        <div className="card" style={{ minHeight: 110, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div className="mono" style={{ lineHeight: 1.2, fontSize: 11 }}>Disponíveis no app</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <strong style={{ fontSize: 28, color: 'var(--p9)', lineHeight: 1, margin: 0 }}>{countByStatus('Disponível')}</strong>
          </div>
          <small style={{ color: 'var(--i6)', fontSize: 12, lineHeight: 1.4 }}>Visíveis para adoção</small>
        </div>
        <div className="card" style={{ minHeight: 110, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div className="mono" style={{ lineHeight: 1.2, fontSize: 11 }}>Em processo</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <strong style={{ fontSize: 28, color: 'var(--p9)', lineHeight: 1, margin: 0 }}>{countByStatus('Em processo')}</strong>
          </div>
          <small style={{ color: 'var(--i6)', fontSize: 12, lineHeight: 1.4 }}>Com uma candidatura em andamento</small>
        </div>
        <div className="card" style={{ minHeight: 110, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div className="mono" style={{ lineHeight: 1.2, fontSize: 11 }}>Acompanhamento</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <strong style={{ fontSize: 28, color: 'var(--p9)', lineHeight: 1, margin: 0 }}>{activeCheckInCount}</strong>
          </div>
          <small style={{ color: 'var(--i6)', fontSize: 12, lineHeight: 1.4 }}>Adoções com check-ins ativos</small>
        </div>
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
                onChange={(e) => setAnimalName(e.target.value)}
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
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </div>
          </div>

          <div className="portal-grid g3" style={{ marginTop: 12 }}>
            <div>
              <div className="mono">Espécie</div>
              <div className="chips">
                {(['Cão', 'Gato', 'Outro'] as const).map((species) => (
                  <button key={species} type="button" className={`chip ${animalSpecies === species ? 'sel' : ''}`} onClick={() => setAnimalSpecies(species)}>{species}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mono">Sexo</div>
              <div className="chips">
                {(['Macho', 'Fêmea', 'Não informado'] as const).map((sex) => (
                  <button key={sex} type="button" className={`chip ${animalSex === sex ? 'sel' : ''}`} onClick={() => setAnimalSex(sex)}>{sex}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mono">Status de publicação</div>
              <div className="chips">
                {(['Rascunho', 'Disponível', 'Em processo', 'Pausado'] as const).map((status) => (
                  <button key={status} type="button" className={`chip ${animalStatus === status ? 'sel' : ''}`} onClick={() => setAnimalStatus(status)}>{status}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="portal-grid g3" style={{ marginTop: 12 }}>
            <div><div className="mono">Raça / identificação</div><input type="text" placeholder="Ex.: SRD" value={animalBreed} onChange={(e) => setAnimalBreed(e.target.value)} /></div>
            <div><div className="mono">Idade aproximada</div><input type="text" placeholder="Ex.: 2 anos" value={animalAge} onChange={(e) => setAnimalAge(e.target.value)} /></div>
            <div><div className="mono">Bairro / localização</div><input type="text" placeholder="Ex.: Vila Marlene" value={animalLocation} onChange={(e) => setAnimalLocation(e.target.value)} /></div>
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
                  border: coverPhoto === src ? '2px solid var(--p7)' : '1px solid var(--ln)',
                }}
              >
                <img
                  src={src}
                  alt={`Foto ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => setCoverPhoto(src)}
                  style={{
                    position: 'absolute',
                    inset: 'auto 4px 4px 4px',
                    padding: '4px 6px',
                    border: 0,
                    borderRadius: 999,
                    background: coverPhoto === src ? 'var(--p7)' : 'rgba(15, 23, 42, 0.72)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {coverPhoto === src ? 'Capa' : 'Capa'}
                </button>
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

          {animalPhotos.length > 0 && (
            <div className="mono" style={{ marginTop: 8, fontSize: 12, color: 'var(--i6)' }}>
              Selecione a foto de capa para a prévia do animal no app.
            </div>
          )}

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

          <div className="mono" style={{ marginTop: 14 }}>Convivência</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {['Boa com crianças', 'Boa com cães', 'Boa com gatos', 'Prefere ser único pet'].map((item) => (
              <button key={item} type="button" className={`chip ${compatibility.includes(item) ? 'sel' : ''}`} onClick={() => toggleCompatibility(item)}>{item}</button>
            ))}
          </div>

          <div className="mono" style={{ marginTop: 14 }}>Nível de energia</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {(['Baixa', 'Moderada', 'Alta'] as const).map((level) => (
              <button key={level} type="button" className={`chip ${energyLevel === level ? 'sel' : ''}`} onClick={() => setEnergyLevel(level)}>{level}</button>
            ))}
          </div>

          <div className="portal-grid g2" style={{ marginTop: 14 }}>
            <div>
              <div className="mono">História e personalidade</div>
              <textarea placeholder="Conte a história, personalidade e cuidados do animal..." value={animalStory} onChange={(e) => setAnimalStory(e.target.value)} />
            </div>
            <div>
              <div className="mono">Lar ideal</div>
              <textarea placeholder="Ex.: Casa com quintal e passeios regulares" value={idealHome} onChange={(e) => setIdealHome(e.target.value)} />
            </div>
          </div>

          <div className="mono" style={{ marginTop: 14 }}>Requisitos para adoção</div>
          <div className="chips" style={{ alignItems: 'center', marginTop: 8 }}>
            {requirements.map((requirement) => <button key={requirement} type="button" className="chip sel" onClick={() => setRequirements((current) => current.filter((item) => item !== requirement))}>{requirement} ×</button>)}
            <input type="text" placeholder="+ Novo requisito" value={newRequirementText} onChange={(e) => setNewRequirementText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddRequirement() }} style={{ width: 190, padding: '6px 12px', margin: 0 }} />
          </div>

          {formError && (
            <div className="err" style={{ display: 'block' }}>
              Preencha o nome, a data de chegada e uma foto para publicar.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="button" className="btn" onClick={handleSaveDraft}>
              Salvar rascunho
            </button>
            <button type="button" className="btn ap" onClick={handleSaveAnimal}>
              Publicar para adoção
            </button>
          </div>
        </div>
      )}

      <div className="filter-chips" style={{ marginBottom: 8, gap: 6 }}>
        {(['Todos', 'Disponível', 'Rascunho', 'Em processo', 'Adotado', 'Pausado'] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
            style={{ padding: '5px 10px', fontSize: 11.5 }}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="portal-grid animals-grid" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
        <div className="card table-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 86px', borderBottom: '1px solid var(--ln)', minHeight: 36, alignItems: 'center' }}>
            <div className="mono" style={{ padding: '10px 12px 8px', fontWeight: 800, letterSpacing: '0.12em', fontSize: 9, lineHeight: 1.2 }}>Animal</div>
            <div className="mono" style={{ padding: '10px 10px 8px', textAlign: 'right', fontWeight: 800, letterSpacing: '0.12em', fontSize: 9, lineHeight: 1.2 }}>Candidatura</div>
          </div>

          {visibleAnimals.map((animal) => {
            const count = candidates.filter(
              (c) => c.animalId === animal.id,
            ).length
            const isSelected = currentAnimal?.id === animal.id

            return (
              <div
                key={animal.id}
                onClick={() => {
                  onSelectAnimal(animal.id)
                  setSelectedCandidateId(null)
                  setRejectError(false)
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 26px',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  minHeight: 58,
                  borderBottom: '1px solid var(--ln)',
                  background: isSelected ? '#f3f1e8' : '#fff',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden', maxWidth: '100%' }}>
                  {animal.photos && animal.photos[0] ? (
                    <img
                      src={animal.photos[0]}
                      alt={animal.name}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        objectFit: 'cover',
                        flexShrink: 0,
                        background: '#efe8dc',
                      }}
                    />
                  ) : (
                    <div className="ic" style={{ width: 34, height: 34, borderRadius: 9, fontSize: 12 }}>🐾</div>
                  )}
                  <div style={{ minWidth: 0, overflow: 'hidden', maxWidth: '100%' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--p9)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{animal.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--i6)', lineHeight: 1.25, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {animal.breed ?? 'SRD'} · {getAnimalAgeText(animal)} · {animal.status ?? 'Disponível'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--p9)', minWidth: 26, lineHeight: 1 }}>{count}</div>
              </div>
            )
          })}
        </div>

        <div className="card candidate-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px 8px', borderBottom: '1px solid var(--ln)', minHeight: 52 }}>
            <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.1, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span>Animal ·</span>
              <span>{currentAnimal?.name}</span>
            </h2>
            <button
              type="button"
              className="btn g"
              onClick={() => setShowAnimalDetails((prev) => !prev)}
              style={{ minHeight: 28, padding: '6px 10px', fontSize: 11.5, background: '#f2efe7', color: 'var(--p9)', border: '1px solid var(--ln)', borderRadius: 10 }}
            >
              {showAnimalDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          </div>

          {showAnimalDetails && currentAnimal && (
            <div style={{ padding: '12px 14px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 70 }}>
                {currentAnimal.photos?.[0] ? (
                  <img src={currentAnimal.photos[0]} alt={currentAnimal.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, background: '#efe7d9', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#efe7d9', fontSize: 24, flexShrink: 0 }}>🐾</div>
                )}

                <div style={{ minWidth: 0, overflow: 'hidden', maxWidth: '100%' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--p9)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentAnimal.name}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.3, color: 'var(--i6)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentAnimal.species ?? 'Cão'} · {currentAnimalAgeText} · {currentAnimal.status ?? 'Disponível'}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11, color: 'var(--i6)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {currentAnimal.sex && <span>Sexo: {currentAnimal.sex}</span>}
                    {currentAnimal.breed && <span>Raça: {currentAnimal.breed}</span>}
                    <span>{selectedAnimalCheckIns} check-in{selectedAnimalCheckIns === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {(currentAnimal.traits ?? []).slice(0, 5).map((trait) => (
                  <span key={trait} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5px 7px', background: '#dfe9d8', color: '#1d4d2f', borderRadius: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {trait}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.4, color: 'var(--i6)' }}>
                <div><strong style={{ color: 'var(--p9)' }}>Requisitos:</strong> {currentAnimal.requirements?.length ? currentAnimal.requirements.join(' · ') : 'Nenhum requisito informado'}</div>
                {currentAnimal.location && <div><strong style={{ color: 'var(--p9)' }}>Local:</strong> {currentAnimal.location}</div>}
                {selectedAnimalCheckIns > 0 && (
                  <div><strong style={{ color: 'var(--p9)' }}>Acompanhamento:</strong> {selectedAnimalCheckIns} check-in{selectedAnimalCheckIns === 1 ? '' : 's'} ativo{selectedAnimalCheckIns === 1 ? '' : 's'}</div>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: '20px 20px 0' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 26 }}>Candidaturas · {currentAnimal?.name}</h2>
          </div>

          {animalCandidates.length === 0 ? (
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
                  <div>
                    <div className="t">
                      {cand.name}
                      {cand.status === 'aprovado' && (
                        <span className="pill ok" style={{ marginLeft: 8 }}>
                          Aprovado
                        </span>
                      )}
                      {cand.status === 'recusado' && (
                        <span
                          className="pill"
                          style={{
                            marginLeft: 8,
                            background: 'var(--a1)',
                            color: 'var(--a6)',
                          }}
                        >
                          Recusado
                        </span>
                      )}
                    </div>
                    <div className="s">{cand.location}</div>
                  </div>
                  <div className="r">
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

                  {currentCandidate.status === 'pendente' ? (
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
                        <button type="button" className="btn ap" onClick={handleApprove}>
                          Aprovar adoção
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
