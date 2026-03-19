import { test, expect } from '@playwright/test'
import { login, logout } from './helpers/auth'
import { readE2ECredentials } from './helpers/env'

const credentials = readE2ECredentials()

test.describe('Public Entry Flows', () => {
  test('회원가입에서 이름/전화번호 필수 필드를 확인한다', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: '계정이 없으신가요? 회원가입' }).click()

    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible()
    await expect(page.getByPlaceholder('홍길동')).toBeVisible()
    await expect(page.getByPlaceholder('01012345678')).toBeVisible()

    const phoneInput = page.getByPlaceholder('01012345678')
    await phoneInput.fill('010-12ab34')
    await expect(phoneInput).toHaveValue('0101234')
  })

  test('비밀번호 찾기 페이지로 이동할 수 있다', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: '비밀번호를 잊으셨나요?' }).click()
    await expect(page).toHaveURL('/forgot-password')
    await expect(page.getByRole('heading', { name: '비밀번호 찾기' })).toBeVisible()
  })
})

test.describe('Member Authenticated Flows', () => {
  test.skip(!credentials, 'E2E 로그인 계정 환경변수가 필요합니다.')

  test('회원은 /my, /book 페이지에 접근할 수 있다', async ({ page }) => {
    await login(page, credentials!.memberEmail, credentials!.memberPassword)

    await expect(page.getByRole('heading', { name: '내 예약' })).toBeVisible()
    await expect(page.getByText('코치 피드백')).toBeVisible()

    await page.goto('/book')
    await expect(page.getByRole('heading', { name: '예약하기' })).toBeVisible()
    await expect(page.getByText('정책 안내')).toBeVisible()

    await logout(page)
  })
})

test.describe('Admin Dashboard Flows', () => {
  test.skip(!credentials, 'E2E 로그인 계정 환경변수가 필요합니다.')

  test('관리자는 모든 관리자 탭에 접근할 수 있다', async ({ page }) => {
    await login(page, credentials!.adminEmail, credentials!.adminPassword)

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible()

    await page.getByRole('button', { name: /시간 슬롯/ }).click()
    await expect(page.getByText('주간 시간 편집')).toBeVisible()

    await page.getByRole('button', { name: /회원/ }).click()
    await expect(page.getByText(/^총 \d+명$/)).toBeVisible()

    const firstEditButton = page.getByRole('button', { name: '편집' }).first()
    await firstEditButton.click()
    const feedbackInput = page.getByLabel('코치 피드백').first()
    await feedbackInput.fill('E2E 코치 피드백 테스트 메시지')
    await page.getByRole('button', { name: '저장' }).first().click()
    await expect(page.getByText('E2E 코치 피드백 테스트 메시지').first()).toBeVisible()

    await page.getByRole('button', { name: /공지사항/ }).click()
    await expect(page.getByRole('button', { name: '+ 공지 작성' })).toBeVisible()

    await page.getByRole('button', { name: /정책/ }).click()
    await expect(page.getByText('예약/취소 정책')).toBeVisible()

    await page.getByRole('button', { name: /통계/ }).click()
    await expect(page.getByRole('button', { name: '주간' })).toBeVisible()
    await expect(page.getByRole('button', { name: '월간' })).toBeVisible()

    await logout(page)
  })
})
