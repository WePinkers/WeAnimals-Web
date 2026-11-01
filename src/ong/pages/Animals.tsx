import { useState, type ChangeEvent } from 'react'
import type { AnimalItem, Candidate, CandidateStatus } from '../types'
import { useToast } from '../components/ToastContext'

interface AnimalsProps {
  animals: AnimalItem[]
  candidates: Candidate[]
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
  selectedAnimalId,
  onSelectAnimal,
  onAddAnimal,
  onUpdateCandidateStatus,
}: AnimalsProps) {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)

  const [animalName, setAnimalName] = useState('')
  const [animalSize, setAnimalSize] = useState<'Pequeno' | 'Médio' | 'Grande'>('Médio')
  const [arrivalDate, setArrivalDate] = useState('')
  const [traits, setTraits] = useState<string[]>(['Vacinada', 'Castrada'])
  const [availableTraits, setAvailableTraits] = useState<string[]>([
    'Vacinada',
    'Castrada',
    'Dócil',
  ])
  const [newTraitText, setNewTraitText] = useState('')
  const [animalPhotos, setAnimalPhotos] = useState<string[]>([])
  const [formError, setFormError] = useState(false)

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

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAnimalPhotos((prev) => [...prev, reader.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  function handleRemovePhoto(indexToRemove: number) {
    setAnimalPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  function handleSaveAnimal() {
    if (!animalName.trim() || !arrivalDate) {
      setFormError(true)
      return
    }
    setFormError(false)
    onAddAnimal({
      name: animalName.trim(),
      description: `Porte ${animalSize} · chegada em ${arrivalDate}`,
      size: animalSize,
      arrivalDate,
      traits,
      requirements: ['Maior de 18 anos', 'Visita prévia'],
      photos: animalPhotos,
    })
    setAnimalName('')
    setArrivalDate('')
    setAnimalPhotos([])
    setShowForm(false)
    showToast('Animal cadastrado com fotos e publicado para adoção!', '🐾')
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

          {formError && (
            <div className="err" style={{ display: 'block' }}>
              Preencha o nome e a data de chegada.
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
          <h2>Candidaturas · {currentAnimal?.name}</h2>

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