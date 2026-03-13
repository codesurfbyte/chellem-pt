'use client'

import { useState } from 'react'
import SlotManager from './SlotManager'
import MemberManager from './MemberManager'
import NoticeManager from './NoticeManager'
import BookingOverview from './BookingOverview'
import PolicyManager from './PolicyManager'
import StatsDashboard from './StatsDashboard'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: '예약 현황', icon: '👀' },
  { id: 'slots',    label: '시간 슬롯', icon: '📅' },
  { id: 'stats',    label: '통계',     icon: '📈' },
  { id: 'members',  label: '회원',     icon: '👥' },
  { id: 'notices',  label: '공지사항', icon: '📢' },
  { id: 'policy',   label: '정책',     icon: '⚙️' },
] as const

type TabId = typeof TABS[number]['id']

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="space-y-5">
      {/* 탭 네비게이션 */}
      <div className="flex gap-1 bg-sand border border-mist rounded-2xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-surface text-ink shadow-sm'
                : 'text-slate hover:text-ink'
            )}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div>
        {activeTab === 'overview' && <BookingOverview />}
        {activeTab === 'slots'    && <SlotManager />}
        {activeTab === 'stats'    && <StatsDashboard />}
        {activeTab === 'members'  && <MemberManager />}
        {activeTab === 'notices'  && <NoticeManager />}
        {activeTab === 'policy'   && <PolicyManager />}
      </div>
    </div>
  )
}
