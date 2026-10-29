import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

// Variável para evitar múltiplos cliques / carregamentos
let authMutationInProgress = false

export function isOrganizationAuthMutationInProgress() {
  return authMutationInProgress
}

export async function submitOrganizationAccreditation(data: {
  cnpj: string
  legalName: string
  institutionalEmail: string
  password: string
  documentName: string
  documentSizeBytes: number
  documentContentType: string
  pixKey: string
}) {
  authMutationInProgress = true

  try {
    // 1. Criar o utilizador no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.institutionalEmail,
      data.password
    )
    const user = userCredential.user

    // 2. Salvar os dados da ONG no Firestore 
    // Nota: isVerified entra como FALSE para bloquear a navegação!
    await setDoc(doc(db, 'organizations', user.uid), {
      name: data.legalName,
      cnpj: data.cnpj,
      email: data.institutionalEmail,
      pixKey: data.pixKey,
      responsibleName: 'Responsável (Pendente)',
      verifiedAt: 'Aguardando moderação',
      isVerified: false, // <-- Isto tranca o painel da ONG!
    })

    // (Opcional) Aqui entraria o upload dos PDFs/Imagens para o Firebase Storage.
    // Para fins do TCC, gravar os nomes dos ficheiros no Firestore ou apenas simular já é suficiente!
    console.log('Documentos recebidos para análise:', data.documentName)

    return user
  } catch (error) {
    console.error('Erro no credenciamento:', error)
    throw error
  } finally {
    authMutationInProgress = false
  }
}