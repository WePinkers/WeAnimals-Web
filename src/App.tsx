import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth'
import { 
  addDoc,
  collection, 
  collectionGroup,
  getDocs,
  onSnapshot, 
  doc, 
  getDoc,
  setDoc,
  updateDoc, 
  deleteDoc, 
  deleteField,
  increment,
  runTransaction,
  Bytes,
  orderBy,
  query,
  where,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import './ong/app.css'
import AdminApp from './admin/AdminApp'
import { auth, db } from './firebase'
import {
  isOrganizationLoginMutationInProgress,
  OrganizationAuthError,
  signInOrganization,
} from './ong/auth/organizationAuth'
import {
  isOrganizationAuthMutationInProgress,
  submitOrganizationAccreditation,
} from './ong/auth/organizationAccreditation'
import { hasAdminAccess } from './admin/adminAccess'
import { normalizeReportStatus, reportStatusStorageValue } from './ong/types'

import { DashboardLayout } from './ong/layouts/DashboardLayout'
import { Home } from './ong/pages/Home'
import { Reports } from './ong/pages/Reports'
import { Community } from './ong/pages/Community'
import { Animals } from './ong/pages/Animals'
import { CheckIns } from './ong/pages/CheckIns'
import { Profile } from './ong/pages/Profile'
import { LegacyOrganizationLogin } from './ong/components/LegacyLoginScreens'
import type {
  LoginErrorCode,
  DashboardSection,
  ReportStatus,
  Report,
  ChatMessage,
  AppNotification,
  AdoptionConversation,
  AnimalItem,
  Candidate,
  CandidateStatus,
  AdoptionApplicationStatus,
  CommunityPost,
  CommunityPostInput,
  CommunityCampaignAnimalInput,
  CommunityPostCategory,
  CampaignCategory,
  PostComment,
  CheckInPeriod,
  CheckInRecord,
  OrganizationProfile,
} from './ong/types'

const initialReports: Report[] = [
  {
    id: 4468,
    priority: 'Muito urgente',
    priorityClass: 'very-urgent',
    title: 'Cão idoso',
    location: 'Vila Marlene',
    address: 'Rua Voluntários, 88 — Vila Marlene',
    coordinates: { lat: -23.6687, lng: -46.5322 },
    status: 'Equipe a caminho',
    reporter: 'Renata F.',
    reporterSince: 'mar 2025',
    reporterTotalReports: 6,
    reporterReliability: 94,
    elapsed: 'há 22 min',
    triage: {
      immediateRisk: 'Não',
      activeAbuse: 'Sim',
      trappedOrInjured: 'Sim',
      streetNoRisk: 'Não',
      photoName: 'foto-cao-vila-marlene.jpg',
    },
    chat: [
      { id: 'm1', text: 'O cão ainda está lá, alguém já foi?', mine: false, timestamp: '14:10' },
      { id: 'm2', text: 'Equipe a caminho, chegada em 22 min.', mine: true, timestamp: '14:12' },
    ],
  },
]

const initialAnimals: AnimalItem[] = [
  {
    id: 'ani-1',
    name: 'Canela',
    description: 'SRD · 2 anos',
    about: 'Resgatada em janeiro, dócil com crianças e outros cães. Castrada, vacinada e vermifugada.',
    size: 'Médio',
    arrivalDate: '2026-04-10',
    traits: ['Vacinada', 'Castrada', 'Dócil'],
    compatibility: ['Bom com crianças', 'Bom com outros cães', 'Energia moderada'],
    requirements: ['Maior de 18 anos', 'Visita prévia'],
    photos: [],
  },
]

function mapAdoptionAnimalDocument(id: string, data: Record<string, any>): AnimalItem {
  const species = data.especie === 'gato' ? 'Gato' : data.especie === 'outro' ? 'Outro' : 'Cão'
  const traits = Array.isArray(data.caracteristicas)
    ? data.caracteristicas.filter((value: unknown): value is string => typeof value === 'string')
    : []
  const compatibility = [
    ...(Array.isArray(data.convivencia)
      ? data.convivencia.filter((value: unknown): value is string => typeof value === 'string')
      : []),
    data.bom_com_criancas === true ? 'Bom com crianças' : '',
    data.bom_com_outros_animais === true ? 'Bom com outros animais' : '',
    data.nivel_energia === 'moderada' ? 'Energia moderada' :
      data.nivel_energia === 'alta' ? 'Energia alta' :
        data.nivel_energia === 'baixa' ? 'Energia tranquila' : '',
  ].filter(Boolean)
  const photos = Array.isArray(data.foto_urls)
    ? data.foto_urls.filter((value: unknown): value is string => typeof value === 'string')
    : []
  const coverPhoto = typeof data.foto_url === 'string' && data.foto_url ? data.foto_url : photos[0]

  return {
    id,
    name: data.nome || 'Animal sem nome',
    description: [data.raca, data.idade_texto].filter(Boolean).join(' · ') || `Porte ${data.porte || 'não informado'}`,
    about: data.descricao || '',
    species,
    breed: data.raca || '',
    ageText: data.idade_texto || '',
    size: data.porte || 'Médio',
    arrivalDate: data.chegada_ao_abrigo || '',
    traits,
    compatibility,
    requirements: Array.isArray(data.requisitos_adocao) ? data.requisitos_adocao : [],
    photos: coverPhoto ? [coverPhoto, ...photos.filter((photo: string) => photo !== coverPhoto)] : photos,
  }
}

function adoptionSpeciesValue(species: AnimalItem['species']) {
  if (species === 'Gato') return 'gato'
  if (species === 'Outro') return 'outro'
  return 'cao'
}

function ageYearsFromText(ageText: string | undefined) {
  const match = ageText?.match(/\d+/)
  return match ? Number(match[0]) : null
}

function adoptionUserName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  if (!name) return null
  const normalized = name.toLocaleLowerCase('pt-BR')
  if (normalized === 'usuário interessado' || normalized === 'usuario interessado') return null
  return name
}

function adoptionCandidateStatus(value: unknown): CandidateStatus {
  switch (value) {
    case 'approved':
    case 'visit_scheduled':
    case 'adopted':
      return 'aprovado'
    case 'rejected':
    case 'cancelled':
      return 'recusado'
    default:
      return 'pendente'
  }
}

function adoptionApplicationStatus(value: unknown): AdoptionApplicationStatus {
  switch (value) {
    case 'reviewing':
    case 'approved':
    case 'rejected':
    case 'visit_scheduled':
    case 'adopted':
    case 'cancelled':
      return value
    default:
      return 'pending'
  }
}

function adoptionApplicationStatusRank(status: AdoptionApplicationStatus): number {
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

const adoptionQuestionnaireFields = [
  {
    key: 'routine',
    question: 'Como é a sua rotina?',
    options: {
      away_all_day: 'Fora o dia todo',
      home_office: 'Home office',
      often_home: 'Bastante em casa',
    },
  },
  {
    key: 'availableSpace',
    question: 'Que espaço você tem disponível?',
    options: {
      small_apartment: 'Apto pequeno',
      apartment_with_balcony: 'Apto com varanda',
      house_with_yard: 'Casa com quintal',
    },
  },
  {
    key: 'petExperience',
    question: 'Já teve animais antes?',
    options: {
      first_time: 'Primeira vez',
      had_pets_before: 'Já tive antes',
      has_other_pets: 'Tenho outros agora',
    },
  },
  {
    key: 'dailyTime',
    question: 'Quanto tempo disponível por dia?',
    options: {
      less_than_one_hour: 'Menos de 1h',
      one_to_three_hours: '1 a 3h',
      more_than_three_hours: 'Mais de 3h',
    },
  },
  {
    key: 'household',
    question: 'Há crianças ou outros animais em casa?',
    options: {
      lives_alone: 'Só eu',
      young_children: 'Crianças pequenas',
      other_pets: 'Outros pets',
    },
  },
] as const

function mapAdoptionQuestionnaireAnswers(profile: Record<string, any>) {
  return adoptionQuestionnaireFields.flatMap(({ key, question, options }) => {
    const value = profile[key]
    if (typeof value !== 'string' || !value.trim()) return []
    return [{
      question,
      answer: options[value as keyof typeof options] ?? value,
    }]
  })
}

function mapAdoptionApplicationCandidate(
  applicationId: string,
  data: Record<string, any>,
): Candidate {
  const profile = data.profile && typeof data.profile === 'object' ? data.profile : {}
  const answers = mapAdoptionQuestionnaireAnswers(profile)

  return {
    id: applicationId,
    animalId: typeof data.animalId === 'string' ? data.animalId : '',
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    name: adoptionUserName(data.userName) ?? 'Usuário interessado',
    pct: typeof data.matchPercentage === 'number' ? data.matchPercentage : 0,
    location: typeof data.shelterName === 'string' && data.shelterName.trim()
      ? data.shelterName
      : 'Candidatura enviada pelo app',
    summary: 'Candidatura enviada pelo aplicativo',
    status: adoptionCandidateStatus(data.status),
    applicationStatus: adoptionApplicationStatus(data.status),
    answers,
  }
}

const initialCandidates: Candidate[] = [
  {
    id: 'cand-1',
    animalId: 'ani-1',
    name: 'Renata Ferreira',
    pct: 74,
    location: 'Vila Marlene',
    summary: 'já teve animais · apto com varanda · home office',
    status: 'pendente',
    answers: [
      { question: 'Rotina', answer: 'Home office integral' },
      { question: 'Espaço', answer: 'Apartamento com varanda telada' },
      { question: 'Já teve animais?', answer: 'Sim, cães adultos' },
    ],
  },
]

const communityPostLabels: Record<string, CommunityPostCategory> = {
  FOUND: 'Achados',
  QUESTION: 'Dúvida',
  NOTICE: 'Aviso',
  OTHER: 'Outro',
}

const communityCampaignLabels: Record<string, CampaignCategory> = {
  NEUTERING: 'Castração',
  VACCINATION: 'Vacinação',
  ADOPTION: 'Adoção',
  DONATION: 'Doação',
}

function communityTimestampMillis(value: unknown) {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (value instanceof Date) return value.getTime()
  return 0
}

function communityElapsed(value: unknown) {
  const millis = communityTimestampMillis(value)
  if (!millis) return 'agora'
  const minutes = Math.max(0, Math.floor((Date.now() - millis) / 60000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  return `há ${Math.floor(hours / 24)} d`
}

function communityPhotoUrl(value: unknown) {
  if (value && typeof (value as { toBase64?: () => string }).toBase64 === 'function') {
    return `data:image/jpeg;base64,${(value as { toBase64: () => string }).toBase64()}`
  }
  return typeof value === 'string' ? value : undefined
}

function communityPhotoBytes(value?: string) {
  if (!value?.startsWith('data:')) return undefined
  const base64 = value.split(',', 2)[1]
  // Keep the decoded Firestore bytes below the 200 KB rule limit.
  if (!base64 || base64.length > 250000) return undefined
  try {
    return Bytes.fromBase64String(base64)
  } catch {
    return undefined
  }
}

async function syncCommunityCampaignAnimals(campaignId: string, animals: CommunityCampaignAnimalInput[]) {
  const animalsCollection = collection(db, 'community_campaigns', campaignId, 'animals')
  const existingSnapshot = await getDocs(animalsCollection)
  const batch = writeBatch(db)
  const existingAnimals = new Map(
    existingSnapshot.docs.map((animalDoc) => [animalDoc.id, animalDoc.data()]),
  )
  const normalizedAnimals = animals
    .filter((animal) => animal.name.trim())
    .slice(0, 50)

  existingSnapshot.docs.forEach((animalDoc) => {
    if (!normalizedAnimals.some((_, index) => animalDoc.id === `animal-${index + 1}`)) {
      batch.delete(animalDoc.ref)
    }
  })

  normalizedAnimals.forEach((animal, index) => {
    const animalId = `animal-${index + 1}`
    const existingAnimal = existingAnimals.get(animalId)
    const data: Record<string, any> = {
      name: animal.name.trim().slice(0, 80),
      breed: animal.breed.trim().slice(0, 80),
      ageText: animal.ageText.trim().slice(0, 80),
      createdAt: existingAnimal?.createdAt ?? serverTimestamp(),
    }
    const photoData = communityPhotoBytes(animal.photoUrl)
    if (photoData) {
      data.photoData = photoData
    } else if (existingAnimal) {
      // deleteField() is valid when merging an existing document, but not
      // when creating a brand-new document with set().
      data.photoData = deleteField()
      batch.set(doc(animalsCollection, animalId), data, { merge: true })
      return
    }
    batch.set(doc(animalsCollection, animalId), data)
  })

  await batch.commit()
}

function mapCommunityPostDocument(id: string, data: Record<string, any>, currentUserId?: string): CommunityPost | null {
  const category = communityPostLabels[String(data.category ?? '').toUpperCase()]
  const description = String(data.body ?? data.description ?? '').trim()
  if (!category || !description) return null
  const photo = communityPhotoUrl(data.photoData ?? data.imageUrl)
  const locationLabel = String(data.locationLabel ?? '').trim()
  return {
    id,
    author: String(data.authorName ?? 'Membro da comunidade'),
    authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
    isOwn: data.authorId === currentUserId,
    type: 'Post',
    categoryLabel: category,
    title: String(data.title ?? category),
    description,
    likes: Number(data.likesCount ?? data.likes ?? 0),
    likedByCurrentUser: false,
    commentsList: [],
    elapsed: communityElapsed(data.createdAt),
    createdAtMillis: communityTimestampMillis(data.createdAt),
    postCategory: category,
    imageUrl: photo,
    imageUrls: photo ? [photo] : [],
    location: locationLabel ? { name: locationLabel, address: '' } : undefined,
  }
}

function mapCommunityCampaignDocument(id: string, data: Record<string, any>, currentUserId?: string): CommunityPost | null {
  const category = communityCampaignLabels[String(data.category ?? '').toUpperCase()]
  const title = String(data.title ?? '').trim()
  if (!category || !title) return null
  const totalSlots = typeof data.totalSlots === 'number' ? data.totalSlots : undefined
  const filledSlots = typeof data.filledSlots === 'number' ? data.filledSlots : 0
  const goalCents = typeof data.donationGoalCents === 'number' ? data.donationGoalCents : undefined
  const raisedCents = typeof data.donationRaisedCents === 'number' ? data.donationRaisedCents : 0
  const photo = communityPhotoUrl(data.photoData ?? data.imageUrl)
  const locationName = String(data.locationLabel ?? '').trim()
  const locationText = String(data.locationText ?? '').trim()
  const progressText = goalCents
    ? `R$ ${(raisedCents / 100).toFixed(2)} de R$ ${(goalCents / 100).toFixed(2)}`
    : totalSlots
      ? `${filledSlots} de ${totalSlots} vagas preenchidas`
      : String(data.availabilityText ?? 'Sem limite de vagas')
  const progressPct = goalCents
    ? Math.min(100, (raisedCents / goalCents) * 100)
    : totalSlots
      ? Math.min(100, (filledSlots / totalSlots) * 100)
      : 0
  return {
    id,
    author: String(data.organizationName ?? 'Organização parceira'),
    isOwn: data.createdBy === currentUserId,
    type: 'Campanha',
    categoryLabel: category,
    title,
    description: String(data.description ?? '').trim(),
    progressText,
    progressPct,
    subscribers: [],
    elapsed: communityElapsed(data.createdAt),
    createdAtMillis: communityTimestampMillis(data.createdAt),
    imageUrl: photo,
    imageUrls: photo ? [photo] : [],
    campaign: {
      startsAt: typeof data.startsAt === 'string' ? data.startsAt : undefined,
      endsAt: typeof data.endsAt === 'string' ? data.endsAt : undefined,
      dateText: String(data.dateText ?? ''),
      location: { name: locationName || locationText, address: locationText },
      animalAudience: String(data.audienceText ?? ''),
      capacity: totalSlots ?? null,
      donation: category === 'Doação'
        ? {
            goalAmount: goalCents == null ? null : goalCents / 100,
            currentAmount: raisedCents / 100,
            acceptsPix: Boolean(data.pixKey),
            pixKey: typeof data.pixKey === 'string' ? data.pixKey : undefined,
            acceptsItems: Array.isArray(data.donationNeeds) && data.donationNeeds.length > 0,
            neededItems: Array.isArray(data.donationNeeds) ? data.donationNeeds : [],
          }
        : undefined,
    },
    location: locationName || locationText
      ? { name: locationName || locationText, address: locationText }
      : undefined,
  }
}

const adoptionCheckInQuestions: Record<CheckInPeriod, { id: string; label: string }[]> = {
  30: [
    { id: 'routine_adjusted', label: 'O animal já se acostumou com a rotina da casa?' },
    { id: 'health_or_behavior_issue', label: 'Teve algum problema de saúde ou comportamento nesse período?' },
  ],
  90: [
    { id: 'walks_and_feeding_established', label: 'A rotina de passeios e alimentação já está estabelecida?' },
    { id: 'behavior_changed', label: 'O comportamento mudou desde o último check-in?' },
    { id: 'regular_vet_visits', label: 'JÁ LEVA AO VETERINÁRIO COM REGULARIDADE?' },
  ],
  180: [
    { id: 'strong_bond', label: 'Vocês já formaram um vínculo forte?' },
    { id: 'shelter_support_needed', label: 'Sente que precisa de algum suporte do abrigo agora?' },
    { id: 'recommend_adoption', label: 'RECOMENDARIA A ADOÇÃO PARA OUTRAS PESSOAS?' },
  ],
}

const checkInAnswerLabels: Record<string, string> = {
  yes: 'Sim',
  no: 'Não',
  partly: 'Em parte',
  yes_certainly: 'Sim, com certeza',
  maybe: 'Talvez',
}

function checkInStatusFromRating(rating: unknown): CheckInRecord['status'] {
  switch (rating) {
    case 'excellent':
      return 'Ótima'
    case 'good':
      return 'Boa'
    case 'some_challenges':
      return 'Alguns desafios'
    case 'difficult':
      return 'Difícil'
    default:
      return 'Não respondido'
  }
}

function checkInReportsForPeriod(
  period: CheckInPeriod,
  checkInData?: Record<string, any>,
): { label: string; value: string }[] {
  const reports = adoptionCheckInQuestions[period].map((question) => ({
    label: question.label,
    value: checkInData
      ? checkInAnswerLabels[String(checkInData.answers?.[question.id])] ?? 'Não informado'
      : 'Aguardando resposta do tutor',
  }))

  const note = typeof checkInData?.note === 'string' ? checkInData.note.trim() : ''
  if (note) reports.push({ label: 'Observação do tutor', value: note })

  return reports
}

function mapAdoptionCheckInRecord(
  applicationDocument: any,
  checkInDocuments: any[],
): CheckInRecord {
  const applicationData = applicationDocument.data() as Record<string, any>
  const userId = applicationDocument.ref.parent.parent?.id ?? applicationData.userId ?? 'user'
  const animalId = applicationDocument.id
  const checkInsByPeriod = new Map<CheckInPeriod, Record<string, any>>()

  checkInDocuments.forEach((checkInDocument) => {
    const data = checkInDocument.data() as Record<string, any>
    const period = Number(data.milestoneDays) as CheckInPeriod
    if ([30, 90, 180].includes(period)) checkInsByPeriod.set(period, data)
  })

  const submittedByPeriod = {
    30: checkInsByPeriod.has(30),
    90: checkInsByPeriod.has(90),
    180: checkInsByPeriod.has(180),
  }
  const submittedPeriods = ([30, 90, 180] as const).filter((period) => submittedByPeriod[period])
  const latestPeriod = submittedPeriods[submittedPeriods.length - 1]
  const currentDays: CheckInPeriod = latestPeriod === 30
    ? 90
    : latestPeriod === 90
      ? 180
      : latestPeriod === 180
        ? 180
        : 30
  const latestCheckIn = latestPeriod ? checkInsByPeriod.get(latestPeriod) : undefined

  return {
    id: `adoption-checkin:${userId}:${animalId}`,
    animal: String(applicationData.animalName ?? 'Animal'),
    photoUrl: typeof applicationData.photoUrl === 'string'
      ? applicationData.photoUrl
      : typeof applicationData.fotoUrl === 'string'
        ? applicationData.fotoUrl
        : undefined,
    adopter: adoptionUserName(applicationData.userName)
      ?? adoptionUserName(applicationData.adopterName)
      ?? 'Adotante',
    currentDays,
    status: latestCheckIn ? checkInStatusFromRating(latestCheckIn.rating) : 'Não respondido',
    reviewed: false,
    reportsByPeriod: {
      30: checkInReportsForPeriod(30, checkInsByPeriod.get(30)),
      90: checkInReportsForPeriod(90, checkInsByPeriod.get(90)),
      180: checkInReportsForPeriod(180, checkInsByPeriod.get(180)),
    },
    questionsByPeriod: adoptionCheckInQuestions,
    submittedByPeriod,
  }
}

const initialCheckIns: CheckInRecord[] = [
  {
    id: 'chk-1',
    animal: 'Girassol',
    adopter: 'Renata F.',
    currentDays: 90,
    status: 'Ótima',
    reviewed: false,
    reportsByPeriod: {
      30: checkInReportsForPeriod(30, { answers: { routine_adjusted: 'yes', health_or_behavior_issue: 'no' } }),
      90: checkInReportsForPeriod(90, { answers: { walks_and_feeding_established: 'yes', behavior_changed: 'no', regular_vet_visits: 'yes' } }),
      180: checkInReportsForPeriod(180, { answers: { strong_bond: 'yes', shelter_support_needed: 'no', recommend_adoption: 'yes_certainly' } }),
    },
    questionsByPeriod: adoptionCheckInQuestions,
    submittedByPeriod: { 30: true, 90: true, 180: true },
  },
]

function getAppRoutePath(pathname: string) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (basePath && pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length)
  }
  return pathname
}

function App() {
  if (getAppRoutePath(window.location.pathname).startsWith('/admin')) {
    return <AdminRoute />
  }

  return <OrganizationPortalApp />
}

function AdminRoute() {
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true

    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser?.isAnonymous) {
        void signOut(auth).catch(() => undefined)
      }

      if (!nextUser || nextUser.isAnonymous) {
        if (active) {
          setAllowed(false)
          setCheckingAccess(false)
        }
        return
      }

      void hasAdminAccess(nextUser).then((hasAccess) => {
        if (!active) return

        setAllowed(hasAccess)
        setCheckingAccess(false)
      })
    })
  }, [])

  if (checkingAccess) {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="loading-spinner" />
        <p>Validando acesso administrativo...</p>
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="admin-access-denied">
        <div className="admin-access-card">
          <span className="admin-access-lock" aria-hidden="true">⌑</span>
          <span className="eyebrow">ACESSO RESTRITO</span>
          <h1>Painel administrativo</h1>
          <p>
            Entre com um e-mail de administrador autorizado para acessar esta área.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.assign(import.meta.env.BASE_URL)}
          >
            Voltar para o login
          </button>
        </div>
      </main>
    )
  }

  return <AdminApp />
}

function OrganizationPortalApp() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (
        isOrganizationAuthMutationInProgress() ||
        isOrganizationLoginMutationInProgress()
      ) {
        return
      }

      if (nextUser?.isAnonymous) {
        void signOut(auth).catch(() => undefined)
      }

      if (!nextUser || nextUser.isAnonymous) {
        if (active) {
          setUser(null)
          setCheckingSession(false)
        }
        return
      }

      void hasAdminAccess(nextUser).then((isAdmin) => {
        if (!active) return

        if (isAdmin) {
          window.location.replace(`${import.meta.env.BASE_URL}admin`)
          return
        }

        setUser(nextUser)
        setCheckingSession(false)
      })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (checkingSession) {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="loading-spinner" />
        <p>Carregando seu acesso...</p>
      </main>
    )
  }

  return user ? (
    <OrganizationDashboard user={user} onLogout={() => signOut(auth)} />
  ) : (
    <LegacyOrganizationLogin onAuthenticated={setUser} />
  )
}

function formatOrganizationIdentifier(value: string) {
  if (/[a-zA-Z@]/.test(value)) return value
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return digits.slice(0, 2) + '.' + digits.slice(2)
  if (digits.length <= 8) {
    return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5)
  }
  if (digits.length <= 12) {
    return (
      digits.slice(0, 2) +
      '.' +
      digits.slice(2, 5) +
      '.' +
      digits.slice(5, 8) +
      '/' +
      digits.slice(8)
    )
  }
  return (
    digits.slice(0, 2) +
    '.' +
    digits.slice(2, 5) +
    '.' +
    digits.slice(5, 8) +
    '/' +
    digits.slice(8, 12) +
    '-' +
    digits.slice(12)
  )
}

function normalizeOrganizationCnpj(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const digits = text.replace(/\D/g, '')
  return digits.length === 14 ? formatOrganizationIdentifier(digits) : text
}

type ReportPriorityPresentation = {
  label: string
  className: 'very-urgent' | 'urgent' | 'priority' | 'low'
}

function normalizedClassification(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function reportPriorityFromClassification(data: Record<string, any>): ReportPriorityPresentation {
  const calculatedClassification =
    data.triageClassification ??
    data.calculatedClassification ??
    data.classificationCalculated ??
    data.classification
  const classification = normalizedClassification(calculatedClassification)

  // A classificação calculada pela triagem é a fonte principal da prioridade.
  if (
    classification.includes('very_urgent') ||
    classification.includes('muito_urgente') ||
    classification.includes('critical') ||
    classification.includes('critica')
  ) {
    return { label: 'Muito urgente', className: 'very-urgent' }
  }
  if (classification === 'urgent' || classification.includes('urgente')) {
    return { label: 'Urgente', className: 'urgent' }
  }
  if (classification === 'priority' || classification.includes('prioridade')) {
    return { label: 'Prioridade', className: 'priority' }
  }
  if (classification === 'low' || classification.includes('baixa_urgencia')) {
    return { label: 'Baixa urgência', className: 'low' }
  }

  // Compatibilidade com denúncias antigas que ainda não têm a classificação.
  const informedUrgency = normalizedClassification(data.urgency)
  if (informedUrgency === 'high' || informedUrgency === 'alta') {
    return { label: 'Muito urgente', className: 'very-urgent' }
  }
  if (informedUrgency === 'medium' || informedUrgency === 'media') {
    return { label: 'Urgente', className: 'urgent' }
  }
  return { label: 'Baixa urgência', className: 'low' }
}

function PasswordVisibilityIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.7" />
      {hidden && <path d="m3 3 18 18" />}
    </svg>
  )
}

export function OrganizationLogin({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => void
}) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberConnected, setRememberConnected] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showAccreditation, setShowAccreditation] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorCode(null)
    if (!identifier.trim() || !password) {
      setErrorCode('invalid-identifier')
      return
    }
    setIsSubmitting(true)
    try {
      const authenticatedUser = await signInOrganization(
        identifier,
        password,
        rememberConnected,
      )

      if (await hasAdminAccess(authenticatedUser)) {
        window.location.assign(`${import.meta.env.BASE_URL}admin`)
        return
      }

      onAuthenticated(authenticatedUser)
    } catch (error) {
      if (error instanceof OrganizationAuthError) {
        if (error.code === 'pending') {
          setShowPending(true)
          return
        }
        setErrorCode(error.code as LoginErrorCode)
      } else {
        setErrorCode('generic')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showRecovery) return <PasswordRecovery onBack={() => setShowRecovery(false)} />
  if (showAccreditation) return <OrganizationAccreditation onBack={() => setShowAccreditation(false)} />
  if (showPending) {
    return (
      <OrganizationLoginBlocked
        onResubmit={() => {
          setShowPending(false)
          setShowAccreditation(true)
        }}
        onBack={() => setShowPending(false)}
      />
    )
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Sobre o WeAnimals">
        <div className="brand-lockup">
          <img className="brand-silhouette" src={`${import.meta.env.BASE_URL}weanimals-entry-silhouette.png`} alt="" />
          <span>WeAnimals</span>
        </div>
        <div className="brand-message">
          <span className="eyebrow">PAINEL INSTITUCIONAL</span>
          <h1>Cuidar também é organizar o atendimento.</h1>
          <p>Acompanhe denúncias, atualize ocorrências e ajude cada animal a encontrar proteção.</p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" />
          Plataforma de proteção animal
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-heading">
            <span className="eyebrow">ACESSO INSTITUCIONAL</span>
            <h2>Bem-vinda ao painel</h2>
            <p>Entre com os dados institucionais da sua organização.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="organization-identifier">
              CNPJ ou e-mail institucional
              <input
                id="organization-identifier"
                type="text"
                value={identifier}
                onChange={(event) =>
                  setIdentifier(formatOrganizationIdentifier(event.target.value))
                }
                placeholder="00.000.000/0000-00 ou e-mail"
                autoComplete="username"
                autoFocus
              />
            </label>
            <label htmlFor="organization-password">
              Senha
              <span className="password-field">
                <input
                  id="organization-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <PasswordVisibilityIcon hidden={!showPassword} />
                </button>
              </span>
            </label>
            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberConnected}
                  onChange={(event) => setRememberConnected(event.target.checked)}
                />
                <span>Manter conectado</span>
              </label>
              <button
                type="button"
                className="forgot-button"
                onClick={() => setShowRecovery(true)}
              >
                Esqueci minha senha
              </button>
            </div>
            {errorCode && <LoginError code={errorCode} />}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar no painel'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--i6)' }}>Ainda não tem cadastro? </span>
              <button
                type="button"
                className="forgot-button"
                onClick={() => setShowAccreditation(true)}
                style={{ display: 'inline', marginLeft: '4px' }}
              >
                Solicitar credenciamento
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

function PasswordRecovery({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRecovery(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setIsSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page" style={{ display: 'grid', placeItems: 'center', padding: '20px' }}>
      <div className="login-card" style={{ background: '#fff', padding: '40px', borderRadius: '16px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Voltar para o login
        </button>

        {!sent ? (
          <form className="login-form" onSubmit={handleRecovery} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '6px', fontWeight: 700 }}>Redefinir senha</h2>
              <p style={{ fontSize: '13.5px', color: '#64748b' }}>Digite seu e-mail institucional cadastrado para receber o link de recuperação.</p>
            </div>
            <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
              E-mail institucional
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@ong.org"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
                required
                autoFocus
              />
            </label>
            <button className="primary-button" type="submit" disabled={isSubmitting} style={{ padding: '12px', marginTop: '8px' }}>
              {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h2 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '12px' }}>E-mail enviado!</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Caso o e-mail informado esteja cadastrado, enviamos as instruções para a redefinição da sua senha.
            </p>
            <button className="primary-button" onClick={onBack} style={{ width: '100%' }}>Voltar para o login</button>
          </div>
        )}
      </div>
    </main>
  )
}

function OrganizationAccreditation({ onBack }: { onBack: () => void }) {
  const [cnpj, setCnpj] = useState('')
  const [legalName, setLegalName] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pixKey, setPixKey] = useState('')
  
  const [cnpjFile, setCnpjFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [bylawsFile, setBylawsFile] = useState<File | null>(null)
  const [addressFile, setAddressFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    if (!cnpjFile || !idFile || !addressFile) {
      setErrorMessage('Por favor, envie todos os documentos obrigatórios.')
      return
    }
    setIsSubmitting(true)
    try {
      await submitOrganizationAccreditation({
        cnpj,
        legalName,
        responsibleName,
        institutionalEmail: email,
        password,
        documentName: cnpjFile.name,
        documentSizeBytes: cnpjFile.size,
        documentContentType: cnpjFile.type,
        pixKey,
      })
      setSubmitted(true)
    } catch (error: any) {
      console.error(error)
      setErrorMessage(`Erro no credenciamento: ${error.message || error}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="login-page" style={{ display: 'grid', placeItems: 'center', padding: '20px' }}>
        <div className="login-card" style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '480px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '12px' }}>Credenciamento enviado com sucesso!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            Os seus dados e documentos foram enviados para análise da moderação. Você já pode entrar no painel com acesso restrito enquanto aguarda a aprovação.
          </p>
          <button className="primary-button" onClick={onBack} style={{ width: '100%' }}>Ir para o login</button>
        </div>
      </main>
    )
  }

  return (
    <main className="login-page" style={{ padding: '40px 20px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="login-card" style={{ background: '#fff', padding: '36px', borderRadius: '16px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', margin: 'auto' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Voltar para o login
        </button>

        <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '6px', fontWeight: 700 }}>Solicitar credenciamento</h2>
        <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px' }}>
          Preencha os dados institucionais e envie os documentos obrigatórios para validação da ONG.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            CNPJ ou Registro
            <input
              type="text"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={e => setCnpj(formatOrganizationIdentifier(e.target.value))}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Razão Social / Nome da ONG
            <input
              type="text"
              placeholder="Ex: Abrigo Esperança"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Nome do Responsável Legal
            <input
              type="text"
              placeholder="Ex: Ana Maria Souza"
              value={responsibleName}
              onChange={e => setResponsibleName(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            E-mail institucional
            <input
              type="email"
              placeholder="contato@ong.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Senha de acesso
            <input
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            Chave Pix para doações
            <input
              type="text"
              placeholder="CNPJ, e-mail ou chave aleatória"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontWeight: 400 }}
              required
            />
          </label>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            1. CNPJ Ativo ou Comprovante de Registro <span style={{ color: '#ef4444' }}>*</span>
            <input
              type="file"
              onChange={e => setCnpjFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {cnpjFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {cnpjFile.name}</small>}
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            2. Documento de Identidade e CPF do Responsável <span style={{ color: '#ef4444' }}>*</span>
            <input
              type="file"
              onChange={e => setIdFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {idFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {idFile.name}</small>}
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            3. Estatuto Social / Ata da Diretoria (Opcional)
            <input
              type="file"
              onChange={e => setBylawsFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            {bylawsFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {bylawsFile.name}</small>}
          </label>

          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
            4. Comprovante de Endereço Recente da Sede <span style={{ color: '#ef4444' }}>*</span>
            <input
              type="file"
              onChange={e => setAddressFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: '13px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
            {addressFile && <small style={{ color: '#166534', fontWeight: 500 }}>Selecionado: {addressFile.name}</small>}
          </label>

          {errorMessage && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
              {errorMessage}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={isSubmitting} style={{ marginTop: '12px', padding: '12px' }}>
            {isSubmitting ? 'Enviando credenciamento...' : 'Enviar para Moderação'}
          </button>
        </form>
      </div>
    </main>
  )
}

function OrganizationLoginBlocked({ onResubmit, onBack }: { onResubmit: () => void; onBack: () => void }) {
  return <div style={{ padding: 40 }}>Bloqueado. <button onClick={onResubmit}>Reenviar</button> <button onClick={onBack}>Voltar</button></div>
}

function LoginError({ code }: { code: LoginErrorCode }) {
  let friendlyMessage = `Erro ao entrar (${code})`
  if (code === 'not-found' || code === 'invalid-credential') {
    friendlyMessage = 'E-mail, CNPJ ou senha incorretos. Verifique os dados inseridos.'
  } else if (code === 'invalid-identifier') {
    friendlyMessage = 'Por favor, informe um CNPJ ou e-mail válido.'
  } else if (code === 'too-many-requests') {
    friendlyMessage = 'Muitas tentativas incorretas. Tente novamente mais tarde.'
  } else if (code === 'disabled') {
    friendlyMessage = 'Esta conta foi desativada temporariamente.'
  }

  return (
    <div className="login-error" style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>
      {friendlyMessage}
    </div>
  )
}

function OrganizationDashboard({
  user,
  onLogout,
}: {
  user: User
  onLogout: () => void
}) {
  const [section, setSection] = useState<DashboardSection>('home')
  const [searchQuery, setSearchQuery] = useState('')

  const [reports, setReports] = useState<Report[]>([])
  const [reportMessages, setReportMessages] = useState<Record<string, ChatMessage[]>>({})
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [selectedReportId, setSelectedReportId] = useState<any>(
    () => reports[0]?.id ?? initialReports[0]?.id ?? 4468,
  )

  const [animals, setAnimals] = useState<AnimalItem[]>(() => {
    const saved = localStorage.getItem('weanimals_animals')
    return saved ? JSON.parse(saved) : initialAnimals
  })
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(() => animals[0]?.id ?? 'ani-1')
  const [adoptionConversations, setAdoptionConversations] = useState<AdoptionConversation[]>([])
  const [adoptionConversationsError, setAdoptionConversationsError] = useState<string | null>(null)

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('weanimals_candidates')
    return saved ? JSON.parse(saved) : initialCandidates
  })

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    return []
  })

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(() => {
    const saved = localStorage.getItem('weanimals_checkins')
    return saved ? JSON.parse(saved) : initialCheckIns
  })
  const [selectedCheckInId, setSelectedCheckInId] = useState<string>(() => checkIns[0]?.id ?? 'chk-1')

  const [profile, setProfile] = useState<OrganizationProfile & { isVerified?: boolean }>(() => {
    const saved = localStorage.getItem('weanimals_profile')
    return saved
      ? JSON.parse(saved)
      : {
          name: user.displayName || 'Abrigo Esperança',
          cnpj: '00.000.000/0001-00',
          email: user.email || 'contato@abrigoesperanca.org',
          pixKey: user.email || 'doacoes@abrigoesperanca.org',
          responsibleName: 'Responsável (Pendente)',
          verifiedAt: new Date().toLocaleDateString('pt-BR'),
          isVerified: true,
        }
  })
  const profileWriteVersion = useRef(0)

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'n1',
      type: 'urgent',
      title: 'Sistema Ativo',
      message: 'Persistência local e notificações ativadas.',
      timeAgo: 'Agora',
      read: false,
      targetSection: 'home',
    },
  ])

  useEffect(() => {
    const currentAuthUser = auth.currentUser
    if (
      user.isAnonymous ||
      !currentAuthUser ||
      currentAuthUser.isAnonymous ||
      currentAuthUser.uid !== user.uid
    ) {
      return undefined
    }

    const authenticatedReportsQuery = query(
      collection(db, 'reports'),
      where('reporterIsAnonymous', '==', false),
    )
    const unsubscribeReports = onSnapshot(authenticatedReportsQuery, (snapshot) => {
      setReportsError(null)
      if (!snapshot.empty) {
        const reporterCounts = new Map<string, number>()
        snapshot.docs.forEach((reportDoc) => {
          const reportData = reportDoc.data()
          const reporterId = reportData.userId || reportData.reporterId
          if (typeof reporterId === 'string' && reporterId.trim()) {
            reporterCounts.set(reporterId, (reporterCounts.get(reporterId) || 0) + 1)
          }
        })

        const realReports = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data()
          const priority = reportPriorityFromClassification(data)
          const reporterId = data.userId || data.reporterId

          const animal = data.animalType === 'dog' ? 'Cão' : data.animalType === 'cat' ? 'Gato' : data.animalType || 'Animal'
          const title = data.title || `${animal} em perigo`
          const triageAnswers = (data.triageAnswers || {}) as Record<string, boolean>
          const answerLabel = (value: unknown) =>
            value === true ? 'Sim' : value === false ? 'Não' : 'Não respondido'

          return {
            ...data,
            // Garante ID único combinando protocolo e id do doc do Firebase
            id: docSnap.id || data.id || data.protocolNumber || `rep-${index}`,
            title: title,
            priority: priority.label,
            priorityClass: priority.className,
            status: normalizeReportStatus(data.status),
            reporter: data.reporterName || data.userName || data.reporter || 'Usuário autenticado',
            reporterTotalReports:
              typeof reporterId === 'string' && reporterCounts.has(reporterId)
                ? reporterCounts.get(reporterId) || 0
                : Number(data.reporterTotalReports || 0),
            description: data.description || 'Sem descrição detalhada.',
            location: data.locationLabel || data.location || 'Localização via GPS',
            address: data.address || 'Endereço não informado',
            animalType: data.animalType || 'other',
            urgency: data.urgency || 'medium',
            triageClassification: data.triageClassification || '',
            triageAnswers,
            photoData: data.photoData,
            photoFileName: data.photoFileName,
            photoUrl: data.photoUrl,
            hasPhoto: Boolean(data.photoData || data.photoUrl || data.photoFileName),
            createdAt: data.createdAt,
            assignedOrganizationId: data.assignedOrganizationId,
            assignedOrganizationName: data.assignedOrganizationName,
            assignedAt: data.assignedAt,
            teamMessageCount: Number(data.teamMessageCount || 0),
            lastMessageAt: data.lastMessageAt,
            triage: {
              immediateRisk: answerLabel(triageAnswers.immediateDanger),
              activeAbuse: answerLabel(triageAnswers.activeAbuse),
              trappedOrInjured: answerLabel(triageAnswers.injuredOrImmobilized),
              streetNoRisk: answerLabel(triageAnswers.streetSituation),
              photoName: data.photoFileName || '',
            },
            coordinates: { 
              lat: data.latitude || -23.5505,
              lng: data.longitude || -46.6333 
            },
            elapsed: data.elapsed || 'Recente',
            chat: data.chat || []
          }
        }) as any
        setReports(realReports)
      } else {
        setReports([])
      }
    }, (error) => {
      console.error('Erro ao carregar denúncias autenticadas:', error)
      setReports([])
      setReportsError(
        error.code === 'permission-denied'
          ? 'A conta da ONG ainda não tem permissão para consultar as denúncias.'
          : 'Não foi possível carregar as denúncias agora.',
      )
    })

    const authenticatedAnimalsQuery = query(
      collection(db, 'animais'),
      where('ong_id', '==', user.uid),
    )
    const unsubscribeAnimals = onSnapshot(authenticatedAnimalsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setAnimals(snapshot.docs.map((animalDoc) =>
          mapAdoptionAnimalDocument(animalDoc.id, animalDoc.data()),
        ))
      }
    })

    const isTemporaryTestOrganization = user.email?.toLowerCase() === 'alissanovais@gmail.com'
    const adoptionConversationsQuery = isTemporaryTestOrganization
      ? query(collectionGroup(db, 'animals'))
      : query(
          collectionGroup(db, 'animals'),
          where('ngoId', '==', user.uid),
        )
    let messageUnsubscribers: Array<() => void> = []
    let checkInUnsubscribers: Array<() => void> = []
    let adoptionCheckInRecords = new Map<string, CheckInRecord>()

    const syncAdoptionCheckIns = (applicationDocs: any[]) => {
      checkInUnsubscribers.forEach((unsubscribe) => unsubscribe())
      checkInUnsubscribers = []
      adoptionCheckInRecords = new Map()

      const adoptedApplications = applicationDocs.filter((applicationDoc) => {
        const data = applicationDoc.data() as Record<string, any>
        return data.status === 'adopted' && data.ngoId === user.uid
      })

      adoptedApplications.forEach((applicationDoc) => {
        const initialRecord = mapAdoptionCheckInRecord(applicationDoc, [])
        adoptionCheckInRecords.set(initialRecord.id, initialRecord)

        const unsubscribe = onSnapshot(
          collection(applicationDoc.ref, 'checkins'),
          (snapshot) => {
            adoptionCheckInRecords.set(
              initialRecord.id,
              mapAdoptionCheckInRecord(applicationDoc, snapshot.docs),
            )
            setCheckIns(Array.from(adoptionCheckInRecords.values()))
          },
          (error) => {
            console.error(`Erro ao carregar o check-in da adoção ${initialRecord.id}:`, error)
          },
        )
        checkInUnsubscribers.push(unsubscribe)
      })

      setCheckIns(Array.from(adoptionCheckInRecords.values()))
    }

    const unsubscribeAdoptionConversations = onSnapshot(
      adoptionConversationsQuery,
      (snapshot) => {
        setAdoptionConversationsError(null)
        messageUnsubscribers.forEach((unsubscribe) => unsubscribe())
        messageUnsubscribers = []

        // `animals` também é usado como subcoleção de candidaturas. Uma
        // conversa tem `createdAt`; candidatura usa `submittedAt`.
        const conversationDocs = snapshot.docs.filter((conversationDoc) => {
          const data = conversationDoc.data()
          return data.createdAt != null && typeof data.userId === 'string' && typeof data.animalId === 'string'
        })
        const applicationDocs = snapshot.docs.filter((applicationDoc) => {
          const data = applicationDoc.data()
          return data.submittedAt != null
            && typeof data.userId === 'string'
            && typeof data.animalId === 'string'
        })
        const conversationNames = new Map<string, string>()
        conversationDocs.forEach((conversationDoc) => {
          const userId = conversationDoc.ref.parent.parent?.id ?? ''
          const name = adoptionUserName(conversationDoc.data().userName)
          if (userId && name) conversationNames.set(`adoption:${userId}:${conversationDoc.id}`, name)
        })

        const applicationCandidates = applicationDocs
          .filter((applicationDoc) => applicationDoc.data().status !== 'cancelled')
          .map((applicationDoc) => {
          const data = applicationDoc.data()
          const userId = applicationDoc.ref.parent.parent?.id ?? data.userId
          const animalId = applicationDoc.id
          return mapAdoptionApplicationCandidate(
            `adoption:${userId}:${animalId}`,
            {
              ...data,
              animalId,
              userName: conversationNames.get(`adoption:${userId}:${animalId}`) ?? data.userName,
            },
          )
          })
        setCandidates(applicationCandidates)
        syncAdoptionCheckIns(applicationDocs)

        // Assim que a ONG recebe a candidatura, ela já entra em análise.
        // A mudança fica no mesmo documento que o app acompanha em tempo real.
        applicationDocs
          .filter((applicationDoc) => {
            const data = applicationDoc.data()
            return data.status === 'pending' && data.ngoId === user.uid
          })
          .forEach((applicationDoc) => {
            const userId = applicationDoc.ref.parent.parent?.id
            if (!userId) return
            void updateDoc(
              doc(db, 'adoption_applications', userId, 'animals', applicationDoc.id),
              {
                status: 'reviewing',
                updatedAt: serverTimestamp(),
              },
            ).catch((error) => {
              console.error('Não foi possível iniciar a análise da candidatura:', error)
            })
          })

        // Mantém animais já aprovados/reservados fora do catálogo do app,
        // inclusive candidaturas aprovadas antes desta regra ser adicionada.
        applicationDocs
          .filter((applicationDoc) => {
            const data = applicationDoc.data()
            return data.ngoId === user.uid
              && ['approved', 'visit_scheduled', 'adopted'].includes(data.status)
          })
          .forEach((applicationDoc) => {
            void updateDoc(doc(db, 'animais', applicationDoc.id), {
              status: 'reservado',
            }).catch((error) => {
              console.error('Não foi possível reservar o animal após a aprovação:', error)
            })
          })

        // O cadastro do app guarda o questionário, mas o nome fica no perfil
        // do usuário. Preenche candidaturas antigas sem precisar de uma nova
        // candidatura para aparecerem com o nome correto.
        applicationDocs.forEach((applicationDoc) => {
          const userId = applicationDoc.ref.parent.parent?.id
          if (!userId) return
          const applicationId = `adoption:${userId}:${applicationDoc.id}`
          void Promise.all([
            getDoc(doc(db, 'user_profiles', userId)).catch(() => null),
            getDocs(query(collection(db, 'reports'), where('userId', '==', userId))).catch(() => null),
          ]).then(([profileSnapshot, reportsSnapshot]) => {
            const reportName = reportsSnapshot?.docs
              .map((reportDoc) => reportDoc.data())
              .map((reportData) => reportData.reporterName || reportData.userName || reportData.reporter)
              .map(adoptionUserName)
              .find((name): name is string => Boolean(name))
            const profileName = [
              profileSnapshot?.data()?.fullName,
              profileSnapshot?.data()?.displayName,
              reportName,
            ].map(adoptionUserName).find((name): name is string => Boolean(name))
            if (!profileName) return
            setCandidates((current) => current.map((candidate) => (
              candidate.id === applicationId
                ? { ...candidate, name: profileName }
                : candidate
            )))
          }).catch(() => {
            // O contador e a candidatura continuam disponíveis mesmo sem o nome.
          })
        })

        const baseConversations = conversationDocs.map((conversationDoc) => {
          const data = conversationDoc.data()
          const userDocument = conversationDoc.ref.parent.parent
          return {
            id: `${userDocument?.id ?? 'user'}:${conversationDoc.id}`,
            userId: userDocument?.id ?? '',
            animalId: conversationDoc.id,
            userName: adoptionUserName(data.userName) ?? 'Usuário interessado',
            animalName: 'Animal',
            lastMessage: '',
            lastMessageTime: 'Agora',
            unread: 0,
            messages: [],
          } satisfies AdoptionConversation
        })
        setAdoptionConversations(baseConversations)

        // Conversas antigas podem não ter userName salvo ainda. Resolva o nome
        // também a partir dos dados que já existem no Firebase, para não
        // depender de uma nova mensagem criada depois deste ajuste.
        conversationDocs.forEach((conversationDoc) => {
          const userId = conversationDoc.ref.parent.parent?.id
          const data = conversationDoc.data()
          if (!userId || adoptionUserName(data.userName)) return
          const conversationId = `${userId}:${conversationDoc.id}`
          void Promise.all([
            getDoc(doc(db, 'user_profiles', userId)).catch(() => null),
            getDoc(doc(db, 'adoption_applications', userId, 'animals', conversationDoc.id)).catch(() => null),
            getDocs(query(collection(db, 'reports'), where('userId', '==', userId))).catch(() => null),
          ]).then(([profileSnapshot, applicationSnapshot, reportsSnapshot]) => {
            const profileData = profileSnapshot?.data()
            const applicationData = applicationSnapshot?.data()
            const applicationProfile = applicationData?.profile
            const reportName = reportsSnapshot?.docs
              .map((reportDoc) => reportDoc.data())
              .map((reportData) => reportData.reporterName || reportData.userName || reportData.reporter)
              .map(adoptionUserName)
              .find((name): name is string => Boolean(name))
            const profileName = [
              profileData?.fullName,
              profileData?.displayName,
              applicationData?.userName,
              applicationData?.fullName,
              applicationProfile?.fullName,
              applicationProfile?.name,
              reportName,
            ].map(adoptionUserName).find((name): name is string => Boolean(name))

            if (typeof profileName !== 'string' || !profileName.trim()) return
            setAdoptionConversations((current) => current.map((conversation) => (
              conversation.id === conversationId
                ? { ...conversation, userName: profileName.trim() }
                : conversation
            )))
          })
        })

        messageUnsubscribers = conversationDocs.map((conversationDoc) => {
          const userId = conversationDoc.ref.parent.parent?.id ?? ''
          const conversationId = `${userId}:${conversationDoc.id}`
          return onSnapshot(collection(conversationDoc.ref, 'messages'), (messageSnapshot) => {
            const messages = messageSnapshot.docs
              .map((messageDoc) => {
                const data = messageDoc.data()
                const createdAt = data.createdAt?.toDate?.() as Date | undefined
                return {
                  id: messageDoc.id,
                  text: typeof data.text === 'string' ? data.text : '',
                  senderRole: data.senderRole === 'team' ? 'team' as const : 'user' as const,
                  senderName: typeof data.senderName === 'string' ? data.senderName : undefined,
                  timestamp: createdAt
                    ? createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : 'Agora',
                  createdAtMillis: createdAt?.getTime() ?? 0,
                }
              })
              .filter((message) => message.text.trim())
              .sort((a, b) => a.createdAtMillis - b.createdAtMillis)
              .map(({ createdAtMillis: _createdAtMillis, ...message }) => message)
            const lastMessage = messages[messages.length - 1]
            const userMessages = messages.filter((message) => message.senderRole === 'user')
            const messageUserName = userMessages
              .map((message) => adoptionUserName(message.senderName))
              .find((name): name is string => Boolean(name))

            setAdoptionConversations((current) => current.map((conversation) => (
              conversation.id === conversationId
                ? {
                    ...conversation,
                    userName: messageUserName || conversation.userName,
                    lastMessage: lastMessage?.text || '',
                    lastMessageTime: lastMessage?.timestamp || conversation.lastMessageTime,
                    unread: userMessages.length,
                    messages,
                  }
                : conversation
            )))
            if (messageUserName) {
              setCandidates((current) => current.map((candidate) => (
                candidate.id === `adoption:${userId}:${conversationDoc.id}`
                  ? { ...candidate, name: messageUserName }
                  : candidate
              )))
            }
          })
        })
      },
      (error) => {
        console.error('Erro ao carregar conversas de adoção:', error)
        setAdoptionConversations([])
        setAdoptionConversationsError(
          error.code === 'permission-denied'
            ? 'A conta da ONG não tem permissão para ler esta conversa. Publique as regras atualizadas e confirme se o UID da ONG é o mesmo do campo ong_id do animal.'
            : 'Tente atualizar a página e carregar novamente.',
        )
      },
    )

    let remotePosts: CommunityPost[] = []
    let remoteCampaigns: CommunityPost[] = []
    let remoteComments: Record<string, PostComment[]> = {}
    let remoteLikes: Record<string, boolean> = {}
    const commentUnsubscribers = new Map<string, () => void>()
    const likeUnsubscribers = new Map<string, () => void>()
    const campaignAnimalUnsubscribers = new Map<string, () => void>()
    const publishCommunitySnapshot = () => {
      setPosts(
        [...remotePosts, ...remoteCampaigns].map((post) => post.type === 'Post'
          ? {
              ...post,
              likedByCurrentUser: remoteLikes[post.id] ?? false,
              commentsList: remoteComments[post.id] ?? [],
            }
          : post).sort((left, right) => {
          return (right.createdAtMillis ?? 0) - (left.createdAtMillis ?? 0)
        }),
      )
    }

    const syncPostCommentListeners = () => {
      const postIds = new Set(remotePosts.map((post) => post.id))

      for (const [postId, unsubscribe] of commentUnsubscribers) {
        if (!postIds.has(postId)) {
          unsubscribe()
          commentUnsubscribers.delete(postId)
          delete remoteComments[postId]
        }
      }

      for (const postId of postIds) {
        if (commentUnsubscribers.has(postId)) continue

        const commentsQuery = query(
          collection(db, 'community_posts', postId, 'comments'),
          orderBy('createdAt', 'asc'),
        )
        const unsubscribe = onSnapshot(
          commentsQuery,
          (snapshot) => {
            remoteComments[postId] = snapshot.docs
              .map((commentDoc) => {
                const data = commentDoc.data()
                return {
                  id: commentDoc.id,
                  author: String(data.authorName ?? 'Membro da comunidade'),
                  authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
                  text: String(data.text ?? '').trim(),
                  timeAgo: communityElapsed(data.createdAt),
                  parentCommentId: typeof data.parentCommentId === 'string'
                    ? data.parentCommentId
                    : undefined,
                }
              })
              .filter((comment) => comment.text.length > 0)
            publishCommunitySnapshot()
          },
          (error) => {
            console.error(`Erro ao carregar comentários da publicação ${postId}:`, error)
            remoteComments[postId] = []
            publishCommunitySnapshot()
          },
        )
        commentUnsubscribers.set(postId, unsubscribe)
      }

      publishCommunitySnapshot()
    }

    const syncCampaignAnimalListeners = () => {
      const adoptionCampaignIds = new Set(
        remoteCampaigns
          .filter((post) => post.categoryLabel === 'Adoção')
          .map((post) => post.id),
      )

      for (const [campaignId, unsubscribe] of campaignAnimalUnsubscribers) {
        if (!adoptionCampaignIds.has(campaignId)) {
          unsubscribe()
          campaignAnimalUnsubscribers.delete(campaignId)
        }
      }

      for (const campaignId of adoptionCampaignIds) {
        if (campaignAnimalUnsubscribers.has(campaignId)) continue

        const unsubscribe = onSnapshot(
          collection(db, 'community_campaigns', campaignId, 'animals'),
          (snapshot) => {
            const confirmedAnimals = snapshot.docs.map((animalDoc) => {
              const animal = animalDoc.data()
              return {
                id: animalDoc.id,
                name: String(animal.name ?? ''),
                breed: String(animal.breed ?? ''),
                ageText: String(animal.ageText ?? ''),
                photoUrl: communityPhotoUrl(animal.photoData),
              }
            }).filter((animal) => animal.name.trim())

            remoteCampaigns = remoteCampaigns.map((post) => (
              post.id === campaignId
                ? { ...post, campaign: { ...post.campaign, confirmedAnimals } }
                : post
            ))
            publishCommunitySnapshot()
          },
          (error) => {
            console.error(`Erro ao carregar animais confirmados da campanha ${campaignId}:`, error)
          },
        )
        campaignAnimalUnsubscribers.set(campaignId, unsubscribe)
      }
    }

    const syncPostLikeListeners = () => {
      const postIds = new Set(remotePosts.map((post) => post.id))

      for (const [postId, unsubscribe] of likeUnsubscribers) {
        if (!postIds.has(postId)) {
          unsubscribe()
          likeUnsubscribers.delete(postId)
          delete remoteLikes[postId]
        }
      }

      for (const postId of postIds) {
        if (likeUnsubscribers.has(postId)) continue

        const unsubscribe = onSnapshot(
          doc(db, 'community_posts', postId, 'likes', user.uid),
          (snapshot) => {
            remoteLikes[postId] = snapshot.exists()
            publishCommunitySnapshot()
          },
          (error) => {
            console.error(`Erro ao carregar curtida da publicação ${postId}:`, error)
            remoteLikes[postId] = false
            publishCommunitySnapshot()
          },
        )
        likeUnsubscribers.set(postId, unsubscribe)
      }

      publishCommunitySnapshot()
    }

    const unsubscribePosts = onSnapshot(
      collection(db, 'community_posts'),
      (snapshot) => {
        remotePosts = snapshot.docs
          .map((postDoc) => mapCommunityPostDocument(postDoc.id, postDoc.data(), user.uid))
          .filter((post): post is CommunityPost => Boolean(post))
        syncPostCommentListeners()
        syncPostLikeListeners()
      },
      (error) => console.error('Erro ao carregar publicações da comunidade:', error),
    )

    const unsubscribeCampaigns = onSnapshot(
      collection(db, 'community_campaigns'),
      async (snapshot) => {
        const mappedCampaigns = snapshot.docs
          .map((campaignDoc) => mapCommunityCampaignDocument(campaignDoc.id, campaignDoc.data(), user.uid))
          .filter((post): post is CommunityPost => Boolean(post))

        remoteCampaigns = await Promise.all(mappedCampaigns.map(async (post) => {
          try {
            const animalSnapshot = await getDocs(
              collection(db, 'community_campaigns', post.id, 'animals'),
            )
            const confirmedAnimals = animalSnapshot.docs.map((animalDoc) => {
              const animal = animalDoc.data()
              return {
                id: animalDoc.id,
                name: String(animal.name ?? ''),
                breed: String(animal.breed ?? ''),
                ageText: String(animal.ageText ?? ''),
                photoUrl: communityPhotoUrl(animal.photoData),
              }
            }).filter((animal) => animal.name.trim())
            return {
              ...post,
              campaign: { ...post.campaign, confirmedAnimals },
            }
          } catch (error) {
            console.error(`Erro ao carregar animais confirmados da campanha ${post.id}:`, error)
            return post
          }
        }))
        syncCampaignAnimalListeners()
        publishCommunitySnapshot()
      },
      (error) => console.error('Erro ao carregar campanhas da comunidade:', error),
    )

    const hydrateOrganizationProfile = async (organizationData: Record<string, any>) => {
      const versionAtStart = profileWriteVersion.current
      let verificationData: Record<string, any> = {}
      let mappedCnpj = ''

      try {
        const [verificationSnapshot, mappingSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'organization_verification_requests'),
            where('requesterId', '==', user.uid),
            limit(1),
          )),
          user.email
            ? getDocs(query(
                collection(db, 'cnpj_mapping'),
                where('email', '==', user.email),
                limit(1),
              ))
            : Promise.resolve(null),
        ])

        verificationData = verificationSnapshot.docs[0]?.data() ?? {}
        const mappingDocument = mappingSnapshot?.docs[0]
        if (mappingDocument) mappedCnpj = formatOrganizationIdentifier(mappingDocument.id)
      } catch (error) {
        console.warn('Não foi possível carregar os dados complementares da ONG:', error)
      }

      if (profileWriteVersion.current !== versionAtStart) return

      const organizationCnpj = String(organizationData.cnpj ?? '').trim()
      const cnpj = organizationCnpj && !/^0{2}[.\d/\-]*$/.test(organizationCnpj)
        ? organizationCnpj
        : String(verificationData.cnpj || mappedCnpj || organizationCnpj)

      setProfile((prev) => ({
        ...prev,
        name: organizationData.name ?? verificationData.legalName ?? prev.name,
        cnpj: normalizeOrganizationCnpj(cnpj || prev.cnpj),
        email: organizationData.institutionalEmail
          ?? organizationData.email
          ?? verificationData.institutionalEmail
          ?? user.email
          ?? prev.email,
        pixKey: organizationData.pixKey ?? verificationData.pixKey ?? prev.pixKey,
        responsibleName: organizationData.responsibleName ?? verificationData.responsibleName ?? prev.responsibleName,
        isVerified: organizationData.isVerified ?? prev.isVerified,
        verifiedAt: organizationData.verifiedAt ?? prev.verifiedAt,
      }))
    }

    const unsubscribeOrg = onSnapshot(
      doc(db, 'organizations', user.uid),
      (docSnap) => {
        void hydrateOrganizationProfile(docSnap.exists() ? docSnap.data() : {})
      },
      (error) => console.error('Erro ao carregar o perfil institucional:', error),
    )

    return () => {
      unsubscribeReports()
      unsubscribeAnimals()
      unsubscribeAdoptionConversations()
      messageUnsubscribers.forEach((unsubscribe) => unsubscribe())
      checkInUnsubscribers.forEach((unsubscribe) => unsubscribe())
      unsubscribePosts()
      unsubscribeCampaigns()
      commentUnsubscribers.forEach((unsubscribe) => unsubscribe())
      likeUnsubscribers.forEach((unsubscribe) => unsubscribe())
      campaignAnimalUnsubscribers.forEach((unsubscribe) => unsubscribe())
      unsubscribeOrg()
    }
  }, [user.uid])

  const reportIdsKey = reports.map((report) => String(report.id)).sort().join('|')

  useEffect(() => {
    if (!reportIdsKey) {
      setReportMessages({})
      return undefined
    }

    const reportIds = reportIdsKey.split('|').filter(Boolean)
    const unsubscribers = reportIds.map((reportId) => {
      const messagesQuery = query(
        collection(db, 'reports', reportId, 'messages'),
        orderBy('createdAt', 'asc'),
      )

      return onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messages = snapshot.docs.map((messageDoc) => {
            const data = messageDoc.data()
            const createdAt = data.createdAt?.toDate?.() as Date | undefined
            const senderRole = data.senderRole === 'team' ? 'team' : 'user'
            return {
              id: messageDoc.id,
              text: String(data.text || ''),
              mine: senderRole === 'team' && data.senderId === user.uid,
              timestamp: createdAt
                ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'agora',
              senderId: data.senderId,
              senderRole,
              senderName: data.senderName || (senderRole === 'team' ? 'Equipe responsável' : 'Denunciante'),
              readByUser: data.readByUser === true,
            } satisfies ChatMessage
          })

          setReportMessages((current) => ({ ...current, [reportId]: messages }))
        },
        (error) => {
          console.warn(`Não foi possível acompanhar o chat da denúncia ${reportId}.`, error)
        },
      )
    })

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [reportIdsKey, user.uid])

  useEffect(() => {
    localStorage.setItem('weanimals_animals', JSON.stringify(animals))
  }, [animals])

  useEffect(() => {
    localStorage.setItem('weanimals_candidates', JSON.stringify(candidates))
  }, [candidates])

  useEffect(() => {
    localStorage.setItem('weanimals_checkins', JSON.stringify(checkIns))
  }, [checkIns])

  useEffect(() => {
    localStorage.setItem('weanimals_profile', JSON.stringify(profile))
  }, [profile])

  function handleLogout() {
    localStorage.removeItem('weanimals_profile')
    localStorage.removeItem('weanimals_reports')
    localStorage.removeItem('weanimals_animals')
    localStorage.removeItem('weanimals_candidates')
    localStorage.removeItem('weanimals_checkins')
    onLogout()
  }

  function pushNotification(title: string, message: string, targetSection: DashboardSection, type: AppNotification['type'] = 'info') {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      timeAgo: 'Agora',
      read: false,
      targetSection,
    }
    setNotifications((prev) => [newNotif, ...prev])
  }

  async function handleUpdateReportStatus(reportId: any, status: ReportStatus) {
    let updatedReport: Report | undefined
    const selected = reports.find((report) => report.id === reportId)
    const assignment = selected?.assignedOrganizationName
      ? {}
      : {
          assignedOrganizationId: user.uid,
          assignedOrganizationName: profile.name,
          assignedAt: serverTimestamp(),
        }

    setReports((current) =>
      current.map((report) => {
        if (report.id === reportId) {
          updatedReport = {
            ...report,
            status,
            elapsed: 'atualizado agora',
            ...(!report.assignedOrganizationName
              ? {
                  assignedOrganizationId: user.uid,
                  assignedOrganizationName: profile.name,
                }
              : {}),
          }
          return updatedReport
        }
        return report
      }),
    )
    pushNotification('Denúncia Atualizada', `O status da denúncia mudou para "${status}".`, 'reports', 'urgent')

    try {
      const reportRef = doc(db, 'reports', String(reportId))
      await updateDoc(reportRef, {
        status: reportStatusStorageValue(status),
        updatedAt: serverTimestamp(),
        ...assignment,
      })
    } catch (error) {
      console.error('Erro ao atualizar status da denúncia no Firebase:', error)
    }
  }

  async function handleSendReportMessage(reportId: any, text: string) {
    const messageRef = doc(collection(db, 'reports', String(reportId), 'messages'))
    const novaMensagem: ChatMessage = {
      id: messageRef.id,
      text,
      mine: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderId: user.uid,
      senderRole: 'team',
      senderName: profile.name,
      readByUser: false,
    }

    setReportMessages((current) => ({
      ...current,
      [String(reportId)]: [...(current[String(reportId)] || []), novaMensagem],
    }))

    try {
      const reportRef = doc(db, 'reports', String(reportId))
      const batch = writeBatch(db)
      batch.set(messageRef, {
        reportId: String(reportId),
        senderId: user.uid,
        senderRole: 'team',
        senderName: profile.name,
        text,
        createdAt: serverTimestamp(),
        readByUser: false,
      })
      batch.update(reportRef, {
        assignedOrganizationId: user.uid,
        assignedOrganizationName: profile.name,
        assignedAt: serverTimestamp(),
        teamMessageCount: increment(1),
        lastMessageAt: serverTimestamp(),
      })
      await batch.commit()
      pushNotification('Mensagem enviada', `Mensagem enviada ao denunciante da denúncia #${reportId}.`, 'reports', 'info')
    } catch (error) {
      console.error('Erro ao enviar mensagem para o Firebase:', error)
      setReportMessages((current) => ({
        ...current,
        [String(reportId)]: (current[String(reportId)] || []).filter((message) => message.id !== messageRef.id),
      }))
    }
  }

  async function handleSendAdoptionMessage(conversationId: string, text: string) {
    const conversation = adoptionConversations.find((item) => item.id === conversationId)
    if (!conversation) return

    await addDoc(
      collection(db, 'adoption_conversations', conversation.userId, 'animals', conversation.animalId, 'messages'),
      {
        senderId: user.uid,
        senderRole: 'team',
        senderName: profile.name,
        text: text.trim(),
        createdAt: serverTimestamp(),
      },
    )
    pushNotification(
      'Mensagem enviada',
      `Mensagem enviada ao interessado em ${conversation.animalName || 'um animal'}.`,
      'animals',
      'adoption',
    )
  }

  async function handleAddAnimal(newAnimal: Omit<AnimalItem, 'id'>) {
    const tempId = `ani-${Date.now()}`
    try {
      const compatibility = newAnimal.compatibility ?? []
      const traits = newAnimal.traits ?? []
      const photos = newAnimal.photos ?? []
      await setDoc(doc(db, 'animais', tempId), {
        nome: newAnimal.name,
        ong_id: user.uid,
        abrigo_nome: profile.name,
        abrigo_endereco: '',
        especie: adoptionSpeciesValue(newAnimal.species),
        raca: newAnimal.breed ?? '',
        idade_texto: newAnimal.ageText ?? '',
        idade_anos: ageYearsFromText(newAnimal.ageText),
        porte: newAnimal.size,
        foto_url: photos[0] ?? '',
        foto_urls: photos,
        caracteristicas: traits,
        vacinado: traits.some((trait) => trait.toLowerCase().includes('vacin')),
        castrado: traits.some((trait) => trait.toLowerCase().includes('castrad')),
        bom_com_criancas: compatibility.includes('Bom com crianças'),
        bom_com_outros_animais: compatibility.some((item) =>
          item === 'Bom com outros cães' || item === 'Bom com gatos' || item === 'Bom com outros animais',
        ),
        convivencia: compatibility,
        nivel_energia: compatibility.includes('Energia moderada') ? 'moderada' :
          compatibility.includes('Energia alta') ? 'alta' :
            compatibility.includes('Energia tranquila') || compatibility.includes('Calmo em casa') ? 'baixa' : null,
        descricao: newAnimal.about ?? '',
        requisitos_adocao: newAnimal.requirements ?? [],
        chegada_ao_abrigo: newAnimal.arrivalDate,
        status: 'disponivel',
        criado_em: serverTimestamp(),
      })
      setSelectedAnimalId(tempId)
      pushNotification('Novo Animal', `${newAnimal.name} foi cadastrado para adoção.`, 'animals', 'adoption')
    } catch (error) {
      console.error('Erro ao adicionar animal no Firebase:', error)
      throw error
    }
  }

  async function handleUpdateCandidateStatus(candidateId: string, status: CandidateStatus, justificationText?: string) {
    let updatedCandidate: Candidate | undefined

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          updatedCandidate = {
            ...c,
            status,
            ...(justificationText ? { justification: justificationText } : {}),
          }
          return updatedCandidate
        }
        return c
      }),
    )

    try {
      if (updatedCandidate) {
        await setDoc(doc(db, 'candidates', candidateId), updatedCandidate, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao atualizar candidato no Firebase:', error)
    }
  }

  async function handleUpdateAdoptionApplicationStatus(
    candidateId: string,
    status: AdoptionApplicationStatus,
  ) {
    const candidate = candidates.find((item) => item.id === candidateId)
    if (!candidate?.userId) return

    const currentStatus = candidate.applicationStatus ?? 'pending'
    const currentRank = adoptionApplicationStatusRank(currentStatus)
    const nextRank = adoptionApplicationStatusRank(status)
    const canReject = currentStatus === 'pending' || currentStatus === 'reviewing'
    const canAdvance = status === 'rejected'
      ? canReject
      : nextRank > currentRank

    if (!canAdvance) {
      pushNotification(
        'Status não alterado',
        'A candidatura não pode voltar para uma etapa anterior.',
        'animals',
        'adoption',
      )
      return
    }

    setCandidates((current) => current.map((item) => (
      item.id === candidateId
        ? {
            ...item,
            applicationStatus: status,
            status: status === 'rejected' || status === 'cancelled' ? 'recusado' :
              status === 'approved' || status === 'visit_scheduled' || status === 'adopted' ? 'aprovado' :
                'pendente',
          }
        : item
    )))

    try {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
      }
      if (status === 'adopted') updateData.adoptedAt = serverTimestamp()
      const statusBatch = writeBatch(db)
      statusBatch.update(
        doc(db, 'adoption_applications', candidate.userId, 'animals', candidate.animalId),
        updateData,
      )
      if (status === 'approved' || status === 'visit_scheduled' || status === 'adopted') {
        statusBatch.update(doc(db, 'animais', candidate.animalId), {
          status: 'reservado',
        })
      }
      await statusBatch.commit()
      const statusLabel = {
        pending: 'aguardando análise',
        reviewing: 'em análise',
        approved: 'aprovada',
        rejected: 'recusada',
        visit_scheduled: 'visita agendada',
        adopted: 'adoção confirmada',
        cancelled: 'cancelada',
      }[status]
      pushNotification(
        'Candidatura atualizada',
        `A candidatura de ${candidate.name} foi marcada como ${statusLabel}.`,
        'animals',
        'adoption',
      )
    } catch (error) {
      console.error('Erro ao atualizar candidatura de adoção:', error)
    }
  }

  async function handleSaveCommunityPost(postData: CommunityPostInput) {
    if (postData.id) {
      try {
        if (postData.type === 'Campanha') {
          const category = {
            Castração: 'NEUTERING',
            Vacinação: 'VACCINATION',
            Adoção: 'ADOPTION',
            Doação: 'DONATION',
          }[postData.categoryLabel] ?? 'OTHER'
          const campaign = postData.campaign ?? {}
          const locationText = [campaign.location?.name, campaign.location?.address]
            .map((value) => value?.trim())
            .filter(Boolean)
            .join(' — ') || 'Região da organização'
          const dateText = [campaign.startsAt, campaign.endsAt]
            .map((value) => value ? new Date(value).toLocaleString('pt-BR') : '')
            .filter(Boolean)
            .join(' · ') || 'Data a definir'
          const capacity = typeof campaign.capacity === 'number' && campaign.capacity > 0
            ? Math.floor(campaign.capacity)
            : undefined
          const updateData: Record<string, any> = {
            category,
            title: postData.title.trim(),
            dateText,
            startsAt: campaign.startsAt || deleteField(),
            endsAt: campaign.endsAt || deleteField(),
            locationText: locationText.slice(0, 160),
            locationLabel: (campaign.location?.name || campaign.location?.address || profile.name).slice(0, 80),
            availabilityText: capacity
              ? `0 de ${capacity} vagas`
              : campaign.confirmedAnimals?.length
                ? `${campaign.confirmedAnimals.length} animais confirmados`
                : 'Sem limite de vagas',
            audienceText: campaign.animalAudience?.trim() || '',
            description: postData.description.trim(),
            highlightText: '',
            photoData: communityPhotoBytes(postData.imageUrls?.[0] ?? postData.imageUrl) ?? deleteField(),
            totalSlots: capacity ?? deleteField(),
          }
          if (category === 'DONATION') {
            const goal = typeof campaign.donation?.goalAmount === 'number' && campaign.donation.goalAmount > 0
              ? Math.round(campaign.donation.goalAmount * 100)
              : undefined
            updateData.donationGoalCents = goal ?? deleteField()
            updateData.donationNeeds = campaign.donation?.neededItems ?? []
            updateData.pixKey = profile.pixKey || ''
          }
          await updateDoc(doc(db, 'community_campaigns', postData.id), updateData)
          await syncCommunityCampaignAnimals(postData.id, campaign.confirmedAnimals ?? [])
        } else {
          const category = {
            Achados: 'FOUND',
            Dúvida: 'QUESTION',
            Aviso: 'NOTICE',
            Outro: 'OTHER',
          }[postData.postCategory ?? postData.categoryLabel] ?? 'OTHER'
          const updateData: Record<string, any> = {
            category,
            body: postData.description.trim().slice(0, 1000),
            locationLabel: [postData.location?.name, postData.location?.address]
              .map((value) => value?.trim())
              .filter(Boolean)
              .join(' — ')
              .slice(0, 80) || profile.name.slice(0, 80),
            photoData: communityPhotoBytes(postData.imageUrls?.[0] ?? postData.imageUrl) ?? deleteField(),
          }
          await updateDoc(doc(db, 'community_posts', postData.id), updateData)
        }

        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postData.id) {
              return {
                ...p,
                title: postData.title,
                type: postData.type,
                categoryLabel: postData.categoryLabel,
                description: postData.description,
                progressText: postData.progressText,
                progressPct: postData.progressPct,
                campaign: postData.campaign,
                postCategory: postData.postCategory,
                imageUrl: postData.imageUrl,
                imageUrls: postData.imageUrls,
                location: postData.location,
                postDetails: postData.postDetails,
              }
            }
            return p
          }),
        )
        return true
      } catch (error) {
        console.error('Erro ao atualizar publicação da Comunidade:', error)
        return false
      }
    }

    const isCampaign = postData.type === 'Campanha'
    const collectionName = isCampaign ? 'community_campaigns' : 'community_posts'
    const reference = doc(collection(db, collectionName))

    try {
      if (isCampaign) {
        const category = {
          Castração: 'NEUTERING',
          Vacinação: 'VACCINATION',
          Adoção: 'ADOPTION',
          Doação: 'DONATION',
        }[postData.categoryLabel] ?? 'OTHER'
        const campaign = postData.campaign ?? {}
        const locationText = [campaign.location?.name, campaign.location?.address]
          .map((value) => value?.trim())
          .filter(Boolean)
          .join(' — ') || 'Região da organização'
        const dateText = [campaign.startsAt, campaign.endsAt]
          .map((value) => value ? new Date(value).toLocaleString('pt-BR') : '')
          .filter(Boolean)
          .join(' · ') || 'Data a definir'
        const capacity = typeof campaign.capacity === 'number' && campaign.capacity > 0
          ? Math.floor(campaign.capacity)
          : undefined
        const remoteCampaign: Record<string, any> = {
          organizationId: user.uid,
          organizationName: profile.name,
          createdBy: user.uid,
          category,
          title: postData.title.trim(),
          dateText,
          locationText: locationText.slice(0, 160),
          locationLabel: (campaign.location?.name || campaign.location?.address || profile.name).slice(0, 80),
          availabilityText: capacity
            ? `0 de ${capacity} vagas`
            : campaign.confirmedAnimals?.length
              ? `${campaign.confirmedAnimals.length} animais confirmados`
              : 'Sem limite de vagas',
          audienceText: campaign.animalAudience?.trim() || '',
          description: postData.description.trim(),
          highlightText: '',
          createdAt: serverTimestamp(),
        }
        const photoData = communityPhotoBytes(postData.imageUrls?.[0] ?? postData.imageUrl)
        if (photoData) remoteCampaign.photoData = photoData
        if (campaign.startsAt) remoteCampaign.startsAt = campaign.startsAt
        if (campaign.endsAt) remoteCampaign.endsAt = campaign.endsAt
        if (capacity) {
          remoteCampaign.totalSlots = capacity
          remoteCampaign.filledSlots = 0
        }
        if (category === 'DONATION') {
          const goal = typeof campaign.donation?.goalAmount === 'number' && campaign.donation.goalAmount > 0
            ? Math.round(campaign.donation.goalAmount * 100)
            : undefined
          if (goal) {
            remoteCampaign.donationGoalCents = goal
            remoteCampaign.donationRaisedCents = 0
          }
          remoteCampaign.donationNeeds = campaign.donation?.neededItems ?? []
          remoteCampaign.pixKey = profile.pixKey || ''
        }
        await setDoc(reference, remoteCampaign)
        await syncCommunityCampaignAnimals(reference.id, campaign.confirmedAnimals ?? [])
      } else {
        const category = {
          Achados: 'FOUND',
          Dúvida: 'QUESTION',
          Aviso: 'NOTICE',
          Outro: 'OTHER',
        }[postData.postCategory ?? postData.categoryLabel] ?? 'OTHER'
        const remotePost: Record<string, any> = {
          authorId: user.uid,
          authorName: profile.name,
          category,
          body: postData.description.trim().slice(0, 1000),
          locationLabel: [postData.location?.name, postData.location?.address]
            .map((value) => value?.trim())
            .filter(Boolean)
            .join(' — ')
            .slice(0, 80) || profile.name.slice(0, 80),
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp(),
        }
        const photoData = communityPhotoBytes(postData.imageUrls?.[0] ?? postData.imageUrl)
        if (photoData) remotePost.photoData = photoData
        await setDoc(reference, remotePost)
      }
      pushNotification(
        isCampaign ? 'Nova campanha' : 'Nova publicação',
        `"${postData.title || 'Comunidade'}" foi publicada e já está disponível para a rede.`,
        'community',
        'info',
      )
      return true
    } catch (error) {
      console.error('Erro ao publicar na Comunidade:', error)
      if (isCampaign) {
        // Avoid leaving an adoption campaign without its confirmed-animal list
        // when the nested write is rejected by Firestore rules.
        await deleteDoc(reference).catch(() => undefined)
      }
      return false
    }
  }

  async function handleDeleteCommunityPost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    try {
      const post = posts.find((item) => item.id === id)
      await deleteDoc(doc(db, post?.type === 'Campanha' ? 'community_campaigns' : 'community_posts', id))
    } catch (error) {
      console.error('Erro ao excluir publicação da Comunidade:', error)
    }
  }

  async function handleLikeCommunityPost(id: string) {
    const currentPost = posts.find((post) => post.id === id)
    if (!currentPost) return
    const currentLiked = Boolean(currentPost.likedByCurrentUser)
    let nextLiked = currentLiked
    let nextLikes = currentPost.likes ?? 0

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            likes: Math.max(0, (p.likes ?? 0) + (currentLiked ? -1 : 1)),
            likedByCurrentUser: !currentLiked,
          }
        }
        return p
      }),
    )

    try {
      await runTransaction(db, async (transaction) => {
        const postReference = doc(db, 'community_posts', id)
        const likeReference = doc(db, 'community_posts', id, 'likes', user.uid)
        const postSnapshot = await transaction.get(postReference)
        const likeSnapshot = await transaction.get(likeReference)
        const likesCount = Number(postSnapshot.data()?.likesCount ?? 0)

        nextLiked = !likeSnapshot.exists()
        nextLikes = Math.max(0, likesCount + (nextLiked ? 1 : -1))
        if (nextLiked) {
          transaction.set(likeReference, {
            userId: user.uid,
            createdAt: serverTimestamp(),
          })
        } else {
          transaction.delete(likeReference)
        }
        transaction.update(postReference, {
          likesCount: nextLikes,
          commentsCount: Number(postSnapshot.data()?.commentsCount ?? 0),
        })
      })

      setPosts((prev) => prev.map((post) => (
        post.id === id
          ? { ...post, likes: nextLikes, likedByCurrentUser: nextLiked }
          : post
      )))
    } catch (error) {
      console.error('Erro ao curtir publicação da Comunidade:', error)
      setPosts((prev) => prev.map((post) => (
        post.id === id
          ? { ...post, likes: currentPost.likes, likedByCurrentUser: currentLiked }
          : post
      )))
    }
  }

  async function handleAddPostComment(
    postId: string,
    text: string,
    parentCommentId?: string,
    mentionedUserIds: string[] = [],
  ) {
    const post = posts.find((item) => item.id === postId)
    const newComment = {
      id: `c-${Date.now()}`,
      author: profile.name,
      authorId: user.uid,
      text,
      timeAgo: 'agora',
      parentCommentId,
    }
    let updatedPost: CommunityPost | undefined

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          updatedPost = {
            ...p,
            commentsList: [...(p.commentsList ?? []), newComment],
          }
          return updatedPost
        }
        return p
      }),
    )

    try {
      if (updatedPost) {
        const commentReference = await addDoc(collection(db, 'community_posts', postId, 'comments'), {
          authorId: user.uid,
          authorName: profile.name,
          text,
          createdAt: serverTimestamp(),
          ...(parentCommentId ? { parentCommentId } : {}),
        })
        await updateDoc(doc(db, 'community_posts', postId), {
          commentsCount: increment(1),
        })

        const parentAuthorId = parentCommentId
          ? post?.commentsList?.find((item) => item.id === parentCommentId)?.authorId
          : undefined
        const recipientIds = Array.from(new Set([
          ...mentionedUserIds,
          parentAuthorId,
        ].filter((recipientId): recipientId is string => Boolean(recipientId && recipientId !== user.uid))))

        await Promise.all(recipientIds.map((recipientId) =>
          addDoc(collection(db, 'community_notifications'), {
            recipientId,
            actorId: user.uid,
            actorName: profile.name,
            postId,
            commentId: commentReference.id,
            type: 'community_mention',
            message: `${profile.name} mencionou você na Comunidade.`,
            read: false,
            createdAt: serverTimestamp(),
          }).catch((notificationError) => {
            console.error('Não foi possível criar a notificação da Comunidade:', notificationError)
          }),
        ))
      }
    } catch (error) {
      console.error('Erro ao comentar publicação da Comunidade:', error)
    }
  }

  async function handleMarkCheckInReviewed(id: string) {
    let updatedCheckIn: CheckInRecord | undefined
    setCheckIns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedCheckIn = { ...c, reviewed: true }
          return updatedCheckIn
        }
        return c
      }),
    )
    try {
      if (updatedCheckIn) {
        await setDoc(doc(db, 'checkins', id), updatedCheckIn, { merge: true })
      }
    } catch (error) {
      console.error('Erro ao revisar check-in no Firebase:', error)
    }
  }

  const reportsForUi = reports.map((report) => {
    const messages = reportMessages[String(report.id)]
    const chat = messages?.length ? messages : report.chat ?? []
    return {
      ...report,
      chat,
      teamMessageCount: messages?.length
        ? messages.filter((message) => message.senderRole === 'team').length
        : report.teamMessageCount ?? report.chat?.filter((message) => message.mine).length ?? 0,
    }
  })

  const selectedReport =
    reportsForUi.find((r) => r.id === selectedReportId) ?? reportsForUi[0]

  const badges = {
    reports: reportsForUi.filter((r) => r.status !== 'Encaminhado a abrigo').length,
    animals: candidates.filter((c) => c.status === 'pendente').length,
    checkins: checkIns.filter((c) => !c.reviewed).length,
  }

  function handleMarkNotificationsAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <DashboardLayout
      user={user}
      organizationName={profile.name}
      organizationEmail={profile.email}
      isVerified={profile.isVerified ?? true}
      currentSection={section}
      notifications={notifications}
      badges={badges}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNavigate={setSection}
      onLogout={handleLogout}
      onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
    >
      {section === 'home' && (
        <Home
          reports={reportsForUi}
          animals={animals}
          candidates={candidates}
          checkIns={checkIns}
          onOpenReport={(id) => {
            setSelectedReportId(id)
            setSection('reports')
          }}
          onOpenCandidates={(animalId) => {
            if (animalId) setSelectedAnimalId(animalId)
            setSection('animals')
          }}
          onOpenCheckIns={(checkInId) => {
            if (checkInId) setSelectedCheckInId(checkInId)
            setSection('checkins')
          }}
        />
      )}
      {section === 'reports' && (
        <Reports
          reports={reportsForUi}
          reportsError={reportsError}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReportId}
          onUpdateStatus={handleUpdateReportStatus}
          onSendMessage={handleSendReportMessage}
        />
      )}
      {section === 'community' && (
        <Community
          posts={posts}
          animals={animals}
          organizationPixKey={profile.pixKey}
          onSavePost={handleSaveCommunityPost}
          onDeletePost={handleDeleteCommunityPost}
          onLikePost={handleLikeCommunityPost}
          onAddComment={handleAddPostComment}
        />
      )}
      {section === 'animals' && (
        <Animals
          animals={animals}
          candidates={candidates}
          adoptionConversations={adoptionConversations}
          adoptionConversationsError={adoptionConversationsError}
          selectedAnimalId={selectedAnimalId}
          onSelectAnimal={setSelectedAnimalId}
          onAddAnimal={handleAddAnimal}
          onSendAdoptionMessage={handleSendAdoptionMessage}
          onUpdateCandidateStatus={handleUpdateCandidateStatus}
          onUpdateApplicationStatus={handleUpdateAdoptionApplicationStatus}
        />
      )}
      {section === 'checkins' && (
        <CheckIns
          checkIns={checkIns}
          selectedCheckInId={selectedCheckInId}
          onSelectCheckIn={setSelectedCheckInId}
          onMarkReviewed={handleMarkCheckInReviewed}
        />
      )}
      {section === 'profile' && (
        <Profile
          profile={profile}
          onUpdateProfile={async (updated) => {
            try {
              profileWriteVersion.current += 1
              const organizationReference = doc(db, 'organizations', user.uid)
              const organizationSnapshot = await getDoc(organizationReference)
              await setDoc(organizationReference, {
                name: updated.name,
                cnpj: updated.cnpj,
                // A conta fake pode ainda não ter um documento organizations.
                // Nesse caso a criação precisa usar o e-mail autenticado.
                email: organizationSnapshot.exists()
                  ? updated.email
                  : user.email ?? updated.email,
                institutionalEmail: updated.email,
                pixKey: updated.pixKey,
                responsibleName: updated.responsibleName,
                updatedAt: serverTimestamp(),
              }, { merge: true })
              profileWriteVersion.current += 1
              setProfile(updated)
              pushNotification('Perfil atualizado', 'Os dados institucionais foram salvos no sistema.', 'profile', 'info')
            } catch (error) {
              console.error('Erro ao atualizar perfil no Firebase:', error)
              throw error
            }
          }}
          onLogout={handleLogout}
        />
      )}
    </DashboardLayout>
  )
}

export default App
