import { expect, type Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login?redirect=/my')
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()

  await page.getByLabel('이메일 *').fill(email)
  await page.getByLabel('비밀번호 *').fill(password)
  await page.getByRole('button', { name: '로그인' }).click()

  await expect(page).toHaveURL(/\/my/)
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole('button', { name: '로그아웃' }).first()
  await expect(logoutButton).toBeVisible()
  await logoutButton.click()
  await expect(page).toHaveURL('/')
}
