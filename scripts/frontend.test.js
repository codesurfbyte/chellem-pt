const assert = require('assert')
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

function run() {
  const login = read('app/login/page.tsx')
  assert(
    login.includes('window.location.href'),
    'login redirect should use full page navigation'
  )

  const weekly = read('components/WeeklyCalendar.tsx')
  assert(
    weekly.includes("book_slot"),
    'WeeklyCalendar should call book_slot RPC'
  )
  assert(
    weekly.includes("cancel_booking"),
    'WeeklyCalendar should call cancel_booking RPC'
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
    slotManager.includes('isSameDayKST'),
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
