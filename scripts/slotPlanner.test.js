const assert = require('assert')
const { computeWeekChanges } = require('../lib/slotPlanner')

function slot(id, time, bookingsCount = 0) {
  return { id, slot_time: time, bookingsCount }
}

function run() {
  // Add to empty week
  {
    const existing = []
    const selected = ['2026-03-10T09:00:00.000Z', '2026-03-10T10:00:00.000Z']
    const { deletableSlotIds, insertTimes } = computeWeekChanges({
      selectedTimes: selected,
      existingSlots: existing,
    })
    assert.deepStrictEqual(deletableSlotIds, [])
    assert.deepStrictEqual(insertTimes.sort(), selected.sort())
  }

  // Remove unbooked, keep booked
  {
    const existing = [
      slot('a', '2026-03-10T09:00:00.000Z', 0),
      slot('b', '2026-03-10T10:00:00.000Z', 2),
      slot('c', '2026-03-10T11:00:00.000Z', 0),
    ]
    const selected = ['2026-03-10T10:00:00.000Z']
    const { deletableSlotIds, insertTimes } = computeWeekChanges({
      selectedTimes: selected,
      existingSlots: existing,
    })
    assert.deepStrictEqual(deletableSlotIds.sort(), ['a', 'c'].sort())
    assert.deepStrictEqual(insertTimes, [])
  }

  // Add new time while keeping existing
  {
    const existing = [slot('a', '2026-03-10T09:00:00.000Z', 0)]
    const selected = [
      '2026-03-10T09:00:00.000Z',
      '2026-03-10T10:00:00.000Z',
    ]
    const { deletableSlotIds, insertTimes } = computeWeekChanges({
      selectedTimes: selected,
      existingSlots: existing,
    })
    assert.deepStrictEqual(deletableSlotIds, [])
    assert.deepStrictEqual(insertTimes, ['2026-03-10T10:00:00.000Z'])
  }

  // Do not re-insert booked slot time
  {
    const existing = [slot('a', '2026-03-10T09:00:00.000Z', 1)]
    const selected = ['2026-03-10T09:00:00.000Z']
    const { deletableSlotIds, insertTimes } = computeWeekChanges({
      selectedTimes: selected,
      existingSlots: existing,
    })
    assert.deepStrictEqual(deletableSlotIds, [])
    assert.deepStrictEqual(insertTimes, [])
  }

  console.log('slotPlanner tests passed')
}

run()
