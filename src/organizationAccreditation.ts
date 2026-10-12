import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase'

const REQUESTS_COLLECTION = 'organization_verification_requests'
const IDENTIFIERS_COLLECTION = 'organization_identifiers'
const ORGANIZATION_ACCOUNTS_COLLECTION = 'organization_accounts'
const LEGAL_VERSION = '2026-10-04'

let authMutationInProgress = false

export type OrganizationAccreditationPayload = {
  cnpj: string
  legalName: string
  institutionalEmail: string
  password: string
  documentName: string
  documentSizeBytes: number
  documentContentType: string
  pixKey: string
}

export class OrganizationAccreditationError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
    this.name = 'OrganizationAccreditationError'
  }
}

export function isOrganizationAuthMutationInProgress() {
  return authMutationInProgress
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function getRequester(email: string, password: string): Promise<User> {
  const requester = auth.currentUser

  if (!requester) {
    try {
      return (await createUserWithEmailAndPassword(auth, email, password)).user
    } catch (failure) {
      const code = (failure as { code?: string }).code
      if (code !== 'auth/email-already-in-use') {
        throw failure
      }

      try {
        return (await signInWithEmailAndPassword(auth, email, password)).user
      } catch (failure) {
        const signInCode = (failure as { code?: string }).code
        if (
          signInCode === 'auth/invalid-credential' ||
          signInCode === 'auth/wrong-password'
        ) {
          throw new OrganizationAccreditationError('invalid-existing-password')
        }
        throw new OrganizationAccreditationError('email-already-in-use')
      }
    }
  }

  if (!requester) {
    throw new OrganizationAccreditationError('requester-not-created')
  }

  if (!requester.isAnonymous) {
    if (requester.email?.toLowerCase() !== email) {
      throw new OrganizationAccreditationError('active-session')
    }
    return requester
  }

  const credential = EmailAuthProvider.credential(email, password)
  try {
    return (await linkWithCredential(requester, credential)).user
  } catch (failure) {
    const code = (failure as { code?: string }).code
    if (code !== 'auth/email-already-in-use') {
      throw failure
    }

    try {
      return (await signInWithEmailAndPassword(auth, email, password)).user
    } catch {
      throw new OrganizationAccreditationError('email-already-in-use')
    }
  }
}

export async function submitOrganizationAccreditation(
  payload: OrganizationAccreditationPayload,
) {
  authMutationInProgress = true

  try {
    await setPersistence(auth, browserLocalPersistence)

    const email = payload.institutionalEmail.trim().toLowerCase()
    const normalizedCnpj = payload.cnpj.replace(/\D/g, '')
    const user = await getRequester(email, payload.password)

    await user.reload()
    if (!user.emailVerified) {
      auth.languageCode = 'pt-BR'
      await sendEmailVerification(user)
      throw new OrganizationAccreditationError('email-verification-required')
    }

    const requestReference = doc(collection(db, REQUESTS_COLLECTION))
    const identifierReference = doc(
      db,
      IDENTIFIERS_COLLECTION,
      await hash(normalizedCnpj),
    )
    const organizationAccountReference = doc(
      db,
      ORGANIZATION_ACCOUNTS_COLLECTION,
      user.uid,
    )
    const [identifierSnapshot, organizationAccountSnapshot] = await Promise.all([
      getDoc(identifierReference),
      getDoc(organizationAccountReference),
    ])

    const batch = writeBatch(db)
    batch.set(requestReference, {
      requesterId: user.uid,
      cnpj: normalizedCnpj,
      legalName: payload.legalName.trim(),
      institutionalEmail: email,
      documentName: payload.documentName,
      documentSizeBytes: payload.documentSizeBytes,
      documentContentType: payload.documentContentType,
      pixKey: payload.pixKey.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
      termsAcceptedAt: serverTimestamp(),
      privacyAcceptedAt: serverTimestamp(),
      legalVersion: LEGAL_VERSION,
    })

    if (!identifierSnapshot.exists()) {
      batch.set(identifierReference, {
        email,
        userId: user.uid,
        status: 'pending',
        requestId: requestReference.id,
        cnpj: normalizedCnpj,
      })
    }

    if (!organizationAccountSnapshot.exists()) {
      batch.set(organizationAccountReference, {
        userId: user.uid,
        email,
        identifierId: identifierReference.id,
        status: 'pending',
        requestId: requestReference.id,
        createdAt: serverTimestamp(),
      })
    }

    await batch.commit()
    await signOut(auth)
  } catch (failure) {
    await signOut(auth).catch(() => undefined)

    if (failure instanceof OrganizationAccreditationError) {
      throw failure
    }

    const code = (failure as { code?: string }).code
    if (code === 'auth/weak-password') {
      throw new OrganizationAccreditationError('weak-password')
    }
    if (code === 'auth/invalid-email') {
      throw new OrganizationAccreditationError('invalid-email')
    }
    if (code === 'auth/operation-not-allowed') {
      throw new OrganizationAccreditationError('operation-not-allowed')
    }
    if (code === 'auth/network-request-failed') {
      throw new OrganizationAccreditationError('network-request-failed')
    }
    if (code === 'auth/too-many-requests') {
      throw new OrganizationAccreditationError('too-many-requests')
    }
    if (code === 'failed-precondition') {
      throw new OrganizationAccreditationError('failed-precondition')
    }
    if (code === 'unavailable') {
      throw new OrganizationAccreditationError('unavailable')
    }
    if (code === 'auth/permission-denied' || code === 'permission-denied') {
      throw new OrganizationAccreditationError('permission-denied')
    }
    throw new OrganizationAccreditationError('generic')
  } finally {
    authMutationInProgress = false
  }
}
