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

  // Coach feedback URL link rendering
  assert(
    myPage.includes('https?:\\/\\/'),
    'My page coach_feedback should detect URLs using https? regex'
  )
  assert(
    myPage.includes('split('),
    'My page coach_feedback should split text to extract URLs'
  )
  assert(
    myPage.includes('target="_blank"'),
    'My page coach_feedback links should open in a new tab'
  )
  assert(
    myPage.includes('rel="noopener noreferrer"'),
    'My page coach_feedback links should have noopener noreferrer for security'
  )
  assert(
    myPage.includes('href={part}'),
    'My page coach_feedback links should use the URL part as href'
  )
  assert(
    myPage.includes('아직 등록된 피드백이 없습니다'),
    'My page should show fallback message when coach_feedback is absent'
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