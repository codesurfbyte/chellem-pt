function computeWeekChanges({ selectedTimes, existingSlots }) {
  const selectedSet = new Set(selectedTimes)
  const existingTimeSet = new Set(existingSlots.map((s) => s.slot_time))
  const bookedTimeSet = new Set(
    existingSlots.filter((s) => s.bookingsCount > 0).map((s) => s.slot_time)
  )

  const deletableSlotIds = existingSlots
    .filter((s) => !bookedTimeSet.has(s.slot_time))
    .filter((s) => !selectedSet.has(s.slot_time))
    .map((s) => s.id)

  const insertTimes = selectedTimes.filter(
    (t) => !existingTimeSet.has(t) && !bookedTimeSet.has(t)
  )

  return {
    deletableSlotIds,
    insertTimes,
    bookedTimeSet,
  }
}

module.exports = {
  computeWeekChanges,
}
