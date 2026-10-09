import {
  browserLocalPersistence,
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

const ORGANIZATION_IDENTIFIER_COLLECTION = 'organization_identifiers'
const ORGANIZATION_VERIFICATION_COLLECTION =
  'organization_verification_requests'
const TEMPORARY_CNPJ = '90702678000109'
const TEMPORARY_EMAIL = 'alissanovais@gmail.com'

export class OrganizationAuthError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
    this.name = 'OrganizationAuthError'
  }
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
): Promise<User> {
  await setPersistence(auth, browserLocalPersistence)

  const { email, isTemporaryAccess } =
    await resolveOrganizationEmail(identifier)
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await user.reload()
  if (!user.emailVerified) {
    await signOut(auth)
    throw new OrganizationAuthError('email-not-verified')
  }

  if (!isTemporaryAccess) {
    const pendingSnapshot = await getDocs(
      query(
        collection(db, ORGANIZATION_VERIFICATION_COLLECTION),
        where('requesterId', '==', user.uid),
        where('status', '==', 'pending'),
        limit(1),
      ),
    )

    if (!pendingSnapshot.empty) {
      await signOut(auth)
      throw new OrganizationAuthError('pending')
    }
  }

  return user
}
