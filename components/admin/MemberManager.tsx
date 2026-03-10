'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function MemberManager() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editSessions, setEditSessions] = useState(0)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setMembers(data ?? [])
    setLoading(false)
  }

  function startEdit(member: Profile) {
    setEditId(member.id)
    setEditSessions(member.remaining_sessions)
    setEditName(member.name ?? '')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ remaining_sessions: editSessions, name: editName || null })
      .eq('id', id)
    setSaving(false)
    setEditId(null)
    await fetchMembers()
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse h-16" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate text-sm">총 {members.length}명</p>
      </div>

      {members.length === 0 ? (
        <div className="card p-8 text-center text-slate text-sm">
          등록된 회원이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="card p-4">
              {editId === member.id ? (
                // 편집 모드
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">이름</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input"
                        placeholder="이름"
                      />
                    </div>
                    <div>
                      <label className="label">잔여 횟수</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={editSessions}
                        onChange={(e) => setEditSessions(Number(e.target.value))}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(member.id)}
                      disabled={saving}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="btn-secondary text-xs px-4 py-2"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 표시 모드
                  <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-sand flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-slate">
                        {(member.name ?? '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink text-sm font-medium truncate">
                        {member.name ?? '이름 없음'}
                      </p>
                      {member.is_admin && (
                        <span className="text-[10px] text-brand font-medium">
                          관리자
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-brand font-display font-bold text-xl">
                        {member.remaining_sessions}
                      </p>
                      <p className="text-slate text-[10px]">잔여</p>
                    </div>
                    <button
                      onClick={() => startEdit(member)}
                      className="text-xs text-slate hover:text-ink transition-colors px-3 py-1.5 rounded-lg hover:bg-sand"
                    >
                      편집
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
