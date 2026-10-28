import { type User } from 'firebase/auth'

// E-mails autorizados para o painel administrativo.
// As senhas continuam somente no Firebase Authentication e nunca no frontend.
export const ADMIN_EMAILS = [
  'alissa.novais@weanimals.com.br',
  'carol.ornelas@weanimals.com.br',
  'mayara.borges@weanimals.com.br',
  'tamer.issa@weanimals.com.br',
  'felipe.menegazzi@weanimals.com.br',
] as const

export function isConfiguredAdminEmail(email: string | null) {
  return Boolean(
    email &&
      ADMIN_EMAILS.includes(
        email.trim().toLowerCase() as (typeof ADMIN_EMAILS)[number],
      ),
  )
}

export async function hasAdminAccess(user: User | null) {
  if (!user || user.isAnonymous) return false

  if (isConfiguredAdminEmail(user.email)) {
    return true
  }

  try {
    const tokenResult = await user.getIdTokenResult()
    return tokenResult.claims.admin === true
  } catch {
    return false
  }
}
