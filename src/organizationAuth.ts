import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { isConfiguredAdminEmail } from './admin/adminAccess'

const ORGANIZATION_IDENTIFIER_COLLECTION = 'organization_identifiers'
const ORGANIZATION_VERIFICATION_COLLECTION =
  'organization_verification_requests'
const ORGANIZATION_ACCOUNTS_COLLECTION = 'organization_accounts'
const TEMPORARY_CNPJ = '62075431000174'
const TEMPORARY_EMAIL = 'alissanovais@gmail.com'

let organizationLoginMutationInProgress = false

export class OrganizationAuthError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
    this.name = 'OrganizationAuthError'
  }
}

export function isOrganizationLoginMutationInProgress() {
  return organizationLoginMutationInProgress
}

function normalizeCnpj(value: string) {
  return value.replace(/\D/g, '')
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function resolveOrganizationEmail(identifier: string) {
  const trimmedIdentifier = identifier.trim()

  if (trimmedIdentifier.includes('@')) {
    return {
      email: trimmedIdentifier.toLowerCase(),
      isTemporaryAccess: false,
    }
  }

  const normalizedCnpj = normalizeCnpj(trimmedIdentifier)
  if (normalizedCnpj.length !== 14) {
    throw new OrganizationAuthError('invalid-identifier')
  }

  const isTemporaryAccess =
    import.meta.env.DEV && normalizedCnpj === TEMPORARY_CNPJ

  if (isTemporaryAccess) {
    return { email: TEMPORARY_EMAIL, isTemporaryAccess: true }
  }

  if (!auth.currentUser) {
    await signInAnonymously(auth)
  }

  const identifierSnapshot = await getDoc(
    doc(
      db,
      ORGANIZATION_IDENTIFIER_COLLECTION,
      await sha256(normalizedCnpj),
    ),
  )

  const email = identifierSnapshot.get('email')
  if (!email) {
    throw new OrganizationAuthError('not-found')
  }

  return { email, isTemporaryAccess: false }
}

export async function signInOrganization(
  identifier: string,
  password: string,
  rememberConnected: boolean,
): Promise<User> {
  organizationLoginMutationInProgress = true

  try {
    await setPersistence(
      auth,
      rememberConnected ? browserLocalPersistence : browserSessionPersistence,
    )

    const { email, isTemporaryAccess } =
      await resolveOrganizationEmail(identifier)
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const user = credential.user

    await user.reload()
    const tokenResult = await user.getIdTokenResult()
    const isAdmin =
      isConfiguredAdminEmail(user.email) ||
      tokenResult.claims.admin === true

    // As contas administrativas de teste não dependem de uma caixa de e-mail
    // real. Organizações continuam precisando confirmar o endereço.
    if (!isAdmin && !user.emailVerified) {
      await signOut(auth)
      throw new OrganizationAuthError('email-not-verified')
    }

    if (!isTemporaryAccess && !isAdmin) {
      const pendingSnapshot = await getDocs(
        query(
          collection(db, ORGANIZATION_VERIFICATION_COLLECTION),
          where('requesterId', '==', user.uid),
          where('status', '==', 'pending'),
          limit(1),
        ),
      )
      const accountSnapshot = await getDoc(
        doc(db, ORGANIZATION_ACCOUNTS_COLLECTION, user.uid),
      )
      const accountStatus = accountSnapshot.get('status')

      if (
        !pendingSnapshot.empty ||
        !accountSnapshot.exists() ||
        accountStatus !== 'approved'
      ) {
        await signOut(auth)
        throw new OrganizationAuthError('pending')
      }
    }

    return user
  } finally {
    organizationLoginMutationInProgress = false
  }
}
