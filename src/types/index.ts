export type LoginErrorCode =
  | 'invalid-identifier'
  | 'not-found'
  | 'invalid-credential'
  | 'email-not-verified'
  | 'pending'
  | 'too-many-requests'
  | 'disabled'
  | 'generic'

export type DashboardSection =
  | 'home'
  | 'reports'
  | 'community'
  | 'animals'
  | 'checkins'
  | 'profile'

export type ReportStatus =
  | 'Equipe acionada'
  | 'Equipe a caminho'
  | 'Resgate'
  | 'Encaminhado a abrigo'

export type ChatMessage = {
  id: string
  text: string
  mine: boolean
  timestamp: string
}

export type Report = {
  id: number
  priority: string
  priorityClass: 'very-urgent' | 'urgent' | 'priority'
  title: string
  location: string
  address: string
  coordinates?: { lat: number; lng: number }
  status: ReportStatus
  reporter: string
  reporterSince: string
  reporterTotalReports: number
  reporterReliability: number
  elapsed: string
  triage: {
    immediateRisk: string
    activeAbuse: string
    trappedOrInjured: string
    streetNoRisk: string
    photoName: string
  }
  chat: ChatMessage[]
}

export type AppNotification = {
  id: string
  type: 'urgent' | 'adoption' | 'checkin' | 'info'
  title: string
  message: string
  timeAgo: string
  read: boolean
  targetSection: DashboardSection
}

export type CandidateStatus = 'pendente' | 'aprovado' | 'recusado'

export type Candidate = {
  id: string
  animalId: string
  name: string
  pct: number
  location: string
  summary: string
  status: CandidateStatus
  justification?: string
  answers: { question: string; answer: string }[]
}

export type AnimalItem = {
  id: string
  name: string
  description: string
  size: 'Pequeno' | 'Médio' | 'Grande'
  arrivalDate: string
  traits: string[]
  requirements: string[]
  photos: string[]
}

export type CampaignSubscriber = {
  id: string
  name: string
  contact: string
  detail: string
  status: string
}

export type PostComment = {
  id: string
  author: string
  text: string
  timeAgo: string
}

export type CommunityPost = {
  id: string
  author: string
  isOwn: boolean
  type: 'Campanha' | 'Post'
  categoryLabel: string
  title: string
  description: string
  progressText?: string
  progressPct?: number
  subscribers?: CampaignSubscriber[]
  likes?: number
  commentsList?: PostComment[]
  elapsed?: string
}

export type CheckInPeriod = 30 | 90 | 180

export type CheckInRecord = {
  id: string
  animal: string
  adopter: string
  currentDays: CheckInPeriod
  status: 'Ótima' | 'Alguns desafios' | 'Não respondido'
  reviewed: boolean
  reportsByPeriod: Record<
    CheckInPeriod,
    { label: string; value: string }[]
  >
}

export type OrganizationProfile = {
  name: string
  cnpj: string
  email: string
  pixKey: string
  responsibleName: string
  verifiedAt: string
  isVerified?: boolean 
}