import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
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
import { auth, db } from '../../firebase'
import { isConfiguredAdminEmail } from '../../admin/adminAccess'

const ORGANIZATION_VERIFICATION_COLLECTION =
  'organization_verification_requests'
const ORGANIZATION_ACCOUNTS_COLLECTION = 'organization_accounts'
const TEMPORARY_CNPJ = '62075431000174'
const TEMPORARY_EMAIL = 'alissanovais@gmail.com'

function normalizedApprovalStatus(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function isApprovedStatus(value: unknown) {
  return new Set([
    'approved',
    'aprovado',
    'aprovada',
    'credenciado',
    'credenciada',
    'active',
    'ativo',
    'ativa',
  ]).has(normalizedApprovalStatus(value))
}

export type LoginErrorCode =
  | 'invalid-identifier'
  | 'not-found'
  | 'invalid-credential'
  | 'email-not-verified'
  | 'pending'
  | 'too-many-requests'
  | 'disabled'
  | 'generic'

export class OrganizationAuthError extends Error {
  code: LoginErrorCode

  constructor(code: LoginErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

let loginMutationInProgress = false

export function isOrganizationLoginMutationInProgress() {
  return loginMutationInProgress
}

export async function signInOrganization(
  identifier: string,
  password: string,
  rememberConnected: boolean
): Promise<User> {
  loginMutationInProgress = true
  const trimmed = identifier.trim()

  try {
    const persistenceType = rememberConnected ? browserLocalPersistence : browserSessionPersistence
    await setPersistence(auth, persistenceType)

    let emailToUse = trimmed

    // NOVO: Se o identificador não tiver '@', assume que é um CNPJ
    const cleanCnpj = trimmed.replace(/\D/g, '')
    // A conta fake de teste precisa funcionar tanto no Vite local quanto no
    // build publicado que usamos para a demonstração.
    const isTemporaryAccess =
      cleanCnpj === TEMPORARY_CNPJ
      || trimmed.toLowerCase() === TEMPORARY_EMAIL

    if (!trimmed.includes('@') && !isTemporaryAccess) {
      const cleanCnpj = trimmed.replace(/\D/g, '')
      const mappingDoc = await getDoc(doc(db, 'cnpj_mapping', cleanCnpj))
      
      if (mappingDoc.exists()) {
        emailToUse = mappingDoc.data().email // Encontrou o e-mail associado a este CNPJ!
      } else {
        throw new OrganizationAuthError('not-found', 'CNPJ não encontrado no sistema.')
      }
    } else if (isTemporaryAccess) {
      emailToUse = TEMPORARY_EMAIL
    }

    // Faz o login no Firebase Authentication com o e-mail descoberto
    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password)
    const user = userCredential.user

    await user.reload()
    const tokenResult = await user.getIdTokenResult()
    const isAdmin =
      isConfiguredAdminEmail(user.email) || tokenResult.claims.admin === true

    if (!isAdmin && !isTemporaryAccess && !user.emailVerified) {
      await signOut(auth)
      throw new OrganizationAuthError('email-not-verified')
    }

    // Verifica dados complementares da ONG no Firestore
    const orgDocRef = doc(db, 'organizations', user.uid)
    const orgSnap = await getDoc(orgDocRef)
    
    const orgData = orgSnap.exists() ? orgSnap.data() : {}
    if (orgSnap.exists()) {
      if (orgData.disabled) {
        await signOut(auth)
        throw new OrganizationAuthError('disabled', 'Conta desativada.')
      }
    }

    if (!isAdmin && !isTemporaryAccess) {
      const verificationSnapshot = await getDocs(
        query(
          collection(db, ORGANIZATION_VERIFICATION_COLLECTION),
          where('requesterId', '==', user.uid),
          limit(1),
        ),
      )
      const accountSnapshot = await getDoc(
        doc(db, ORGANIZATION_ACCOUNTS_COLLECTION, user.uid),
      )
      const verificationData = verificationSnapshot.docs[0]?.data() ?? {}
      const accountData = accountSnapshot.exists() ? accountSnapshot.data() : {}
      const isApproved = [
        orgData.isVerified === true,
        orgData.approved === true,
        isApprovedStatus(orgData.status),
        isApprovedStatus(orgData.verificationStatus),
        isApprovedStatus(verificationData.status),
        verificationData.approved === true,
        isApprovedStatus(accountData.status),
        accountData.approved === true,
      ].some(Boolean)

      if (!isApproved) {
        await signOut(auth)
        throw new OrganizationAuthError('pending')
      }
    }

    return user
  } catch (error: any) {
    console.error('Erro no login da organização:', error)
    
    if (error instanceof OrganizationAuthError) {
      throw error
    }

    const code = error.code
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      throw new OrganizationAuthError('invalid-credential', 'E-mail, CNPJ ou senha incorretos.')
    } else if (code === 'auth/too-many-requests') {
      throw new OrganizationAuthError('too-many-requests', 'Muitas tentativas. Tente mais tarde.')
    } else {
      throw new OrganizationAuthError('generic', error.message || 'Erro ao entrar.')
    }
  } finally {
    loginMutationInProgress = false
  }
}
