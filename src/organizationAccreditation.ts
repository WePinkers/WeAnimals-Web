import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

let authMutationInProgress = false

export function isOrganizationAuthMutationInProgress() {
  return authMutationInProgress
}

export async function submitOrganizationAccreditation(data: {
  cnpj: string
  legalName: string
  responsibleName: string
  institutionalEmail: string
  password: string
  documentName: string
  documentSizeBytes: number
  documentContentType: string
  pixKey: string
}) {
  authMutationInProgress = true

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.institutionalEmail,
      data.password
    )
    const user = userCredential.user

    // MANTÉM O FLUXO REAL: Novas contas entram como não verificadas
    await setDoc(doc(db, 'organizations', user.uid), {
      name: data.legalName,
      cnpj: data.cnpj,
      email: data.institutionalEmail,
      pixKey: data.pixKey,
      responsibleName: data.responsibleName,
      verifiedAt: 'Aguardando moderação',
      isVerified: false,
    })

    // Salva o mapeamento de CNPJ para E-mail
    const cleanCnpj = data.cnpj.replace(/\D/g, '')
    await setDoc(doc(db, 'cnpj_mapping', cleanCnpj), {
      email: data.institutionalEmail
    })

    await signInWithEmailAndPassword(auth, data.institutionalEmail, data.password)

    return user
  } catch (error) {
    console.error('Erro no credenciamento:', error)
    throw error
  } finally {
    authMutationInProgress = false
  }
}