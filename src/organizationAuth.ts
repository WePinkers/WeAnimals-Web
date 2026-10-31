import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

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

  constructor(code: LoginErrorCode, message: string) {
    super(message)
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
    if (!trimmed.includes('@')) {
      const cleanCnpj = trimmed.replace(/\D/g, '')
      const mappingDoc = await getDoc(doc(db, 'cnpj_mapping', cleanCnpj))
      
      if (mappingDoc.exists()) {
        emailToUse = mappingDoc.data().email // Encontrou o e-mail associado a este CNPJ!
      } else {
        throw new OrganizationAuthError('not-found', 'CNPJ não encontrado no sistema.')
      }
    }

    // Faz o login no Firebase Authentication com o e-mail descoberto
    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password)
    const user = userCredential.user

    // Verifica dados complementares da ONG no Firestore
    const orgDocRef = doc(db, 'organizations', user.uid)
    const orgSnap = await getDoc(orgDocRef)
    
    if (orgSnap.exists()) {
      const orgData = orgSnap.data()
      if (orgData.disabled) {
        throw new OrganizationAuthError('disabled', 'Conta desativada.')
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