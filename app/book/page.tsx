import WeeklyCalendar from '@/components/WeeklyCalendar'

export default function BookPage() {
  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold tracking-[0.2em] text-[#C8FF00] uppercase">
          Schedule
        </span>
        <h1 className="font-display text-4xl font-bold text-white mt-2 tracking-wide">
          예약하기
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          원하는 시간대를 선택해 예약하세요
        </p>
      </div>

      <WeeklyCalendar />
    </div>
  )
}
