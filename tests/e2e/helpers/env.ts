export type E2ECredentials = {
  adminEmail: string
  adminPassword: string
  memberEmail: string
  memberPassword: string
}

export function readE2ECredentials(): E2ECredentials | null {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  const memberEmail = process.env.E2E_MEMBER_EMAIL
  const memberPassword = process.env.E2E_MEMBER_PASSWORD

  if (!adminEmail || !adminPassword || !memberEmail || !memberPassword) {
    return null
  }

  return {
    adminEmail,
    adminPassword,
    memberEmail,
    memberPassword,
  }
}
