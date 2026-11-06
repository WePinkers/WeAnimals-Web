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

export function normalizeReportStatus(status: unknown): ReportStatus {
  switch (status) {
    case 'Equipe acionada':
    case 'new':
    case 'under_review':
      return 'Equipe acionada'
    case 'Equipe a caminho':
    case 'in_progress':
      return 'Equipe a caminho'
    case 'Resgate':
    case 'rescued':
      return 'Resgate'
    case 'Encaminhado a abrigo':
    case 'closed':
      return 'Encaminhado a abrigo'
    default:
      return 'Equipe acionada'
  }
}

export function reportStatusStorageValue(status: unknown): string {
  switch (normalizeReportStatus(status)) {
    case 'Equipe acionada':
      return 'under_review'
    case 'Equipe a caminho':
      return 'in_progress'
    case 'Resgate':
      return 'rescued'
    case 'Encaminhado a abrigo':
      return 'closed'
  }
}

export type ChatMessage = {
  id: string
  text: string
  mine: boolean
  timestamp: string
  senderId?: string
  senderRole?: 'user' | 'team'
  senderName?: string
  readByUser?: boolean
}

export type AdoptionConversationMessage = {
  id: string
  text: string
  senderRole: 'user' | 'team'
  senderName?: string
  timestamp: string
}

export type AdoptionConversation = {
  id: string
  userId: string
  animalId: string
  userName: string
  animalName: string
  lastMessage: string
  lastMessageTime: string
  unread: number
  messages: AdoptionConversationMessage[]
}

export type Report = {
  id: number
  protocolNumber?: number
  priority: string
  priorityClass: 'very-urgent' | 'urgent' | 'priority' | 'low'
  title: string
  location: string
  address: string
  coordinates?: { lat: number; lng: number }
  animalType?: string
  urgency?: string
  status: ReportStatus
  reporter: string
  reporterSince: string
  reporterTotalReports: number
  reporterReliability: number
  elapsed: string
  description?: string
  photoData?: unknown
  photoFileName?: string
  photoUrl?: string
  hasPhoto?: boolean
  createdAt?: unknown
  triageClassification?: string
  triageAnswers?: Record<string, boolean>
  assignedOrganizationId?: string
  assignedOrganizationName?: string
  assignedAt?: unknown
  teamMessageCount?: number
  lastMessageAt?: unknown
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

export type AdoptionApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'visit_scheduled'
  | 'adopted'
  | 'cancelled'

export type Candidate = {
  id: string
  animalId: string
  userId?: string
  name: string
  pct: number
  location: string
  summary: string
  status: CandidateStatus
  applicationStatus?: AdoptionApplicationStatus
  justification?: string
  answers: { question: string; answer: string }[]
}

export type AnimalItem = {
  id: string
  name: string
  description: string
  about?: string
  species?: 'Cão' | 'Gato' | 'Outro'
  breed?: string
  ageText?: string
  size: 'Pequeno' | 'Médio' | 'Grande'
  arrivalDate: string
  traits: string[]
  compatibility?: string[]
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

export type CampaignCategory = 'Castração' | 'Vacinação' | 'Adoção' | 'Doação'

export type CommunityPostCategory = 'Achados' | 'Dúvida' | 'Aviso' | 'Outro'

export type CampaignLocation = {
  name: string
  address: string
}

export type CommunityCampaignAnimalInput = {
  id?: string
  name: string
  breed: string
  ageText: string
  photoUrl?: string
}

export type CommunityCampaign = {
  startsAt?: string
  endsAt?: string
  dateText?: string
  location?: CampaignLocation
  animalAudience?: string
  capacity?: number | null
  animalIds?: string[]
  confirmedAnimals?: CommunityCampaignAnimalInput[]
  donation?: {
    deadline?: string
    goalAmount?: number | null
    currentAmount?: number
    pixKey?: string
    acceptsPix: boolean
    acceptsItems: boolean
    neededItems: string[]
  }
}

export type CommunityPostInput = {
  id?: string
  title: string
  type: 'Campanha' | 'Post'
  categoryLabel: string
  description: string
  progressText?: string
  progressPct?: number
  campaign?: CommunityCampaign
  postCategory?: CommunityPostCategory
  imageUrl?: string
  imageUrls?: string[]
  location?: CampaignLocation
  postDetails?: {
    subject?: string
    animalType?: string
    occurredAt?: string
    expiresAt?: string
    contact?: string
  }
}

export type PostComment = {
  id: string
  author: string
  authorId?: string
  text: string
  timeAgo: string
  parentCommentId?: string
}

export type CommunityPost = {
  id: string
  author: string
  authorId?: string
  isOwn: boolean
  type: 'Campanha' | 'Post'
  categoryLabel: string
  title: string
  description: string
  progressText?: string
  progressPct?: number
  subscribers?: CampaignSubscriber[]
  likes?: number
  likedByCurrentUser?: boolean
  commentsList?: PostComment[]
  elapsed?: string
  createdAtMillis?: number
  campaign?: CommunityCampaign
  postCategory?: CommunityPostCategory
  imageUrl?: string
  imageUrls?: string[]
  location?: CampaignLocation
  postDetails?: {
    subject?: string
    animalType?: string
    occurredAt?: string
    expiresAt?: string
    contact?: string
  }
}

export type CheckInPeriod = 30 | 90 | 180

export type CheckInRecord = {
  id: string
  animal: string
  photoUrl?: string
  adopter: string
  currentDays: CheckInPeriod
  status: 'Ótima' | 'Boa' | 'Alguns desafios' | 'Difícil' | 'Não respondido'
  reviewed: boolean
  reportsByPeriod: Record<
    CheckInPeriod,
    { label: string; value: string }[]
  >
  questionsByPeriod?: Record<
    CheckInPeriod,
    { id: string; label: string }[]
  >
  submittedByPeriod?: Record<CheckInPeriod, boolean>
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
