function toIso(value) {
  return new Date(value).toISOString()
}

function computeWeekChanges({ selectedTimes, existingSlots }) {
  const normalizedSelected = selectedTimes.map(toIso)
  const selectedSet = new Set(normalizedSelected)
  const existingTimeSet = new Set(existingSlots.map((s) => toIso(s.slot_time)))
  const bookedTimeSet = new Set(
    existingSlots
      .filter((s) => s.bookingsCount > 0)
      .map((s) => toIso(s.slot_time))
  )

  const deletableSlotIds = existingSlots
    .filter((s) => !bookedTimeSet.has(toIso(s.slot_time)))
    .filter((s) => !selectedSet.has(toIso(s.slot_time)))
    .map((s) => s.id)

  const insertTimes = normalizedSelected.filter(
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
