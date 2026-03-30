const assert = require('assert')
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

function run() {
  const login = read('app/login/page.tsx')
  assert(
    login.includes('signInWithOAuth'),
    'login should use Kakao OAuth'
  )
  assert(
    login.includes("'kakao'"),
    'login OAuth provider should be kakao'
  )
  assert(
    login.includes('/auth/callback'),
    'login should redirect to auth callback'
  )

  const bookingApi = read('app/api/booking/route.ts')
  assert(
    bookingApi.includes("book_slot"),
    'Booking API should call book_slot RPC'
  )
  assert(
    bookingApi.includes("cancel_booking"),
    'Booking API should call cancel_booking RPC'
  )

  const myPage = read('app/my/page.tsx')
  assert(
    myPage.includes('formatInTimeZone'),
    'My page should render times in a fixed timezone'
  )

  const slotManager = read('components/admin/SlotManager.tsx')
  assert(
    slotManager.includes('주간 시간 편집'),
    'SlotManager should contain weekly editor UI'
  )
  assert(
    slotManager.includes('getKstDayIndex'),
    'SlotManager should use KST day matching for weekly sync'
  )

  const utils = read('lib/utils.ts')
  assert(
    utils.includes("TIME_ZONE = 'Asia/Seoul'"),
    'Utils should define KST timezone constant'
  )

  console.log('frontend tests passed')
}

run()
