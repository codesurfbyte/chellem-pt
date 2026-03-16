'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { differenceInDays, differenceInHours, format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

type KakaoSharePayload = {
  objectType: 'text'
  text: string
  link: {
    mobileWebUrl: string
    webUrl: string
  }
  buttonTitle?: string
}

type KakaoSDK = {
  isInitialized: () => boolean
  init: (appKey: string) => void
  Share: {
    sendDefault: (payload: KakaoSharePayload) => void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoSDK
  }
}

export default function MemberManager() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editSessions, setEditSessions] = useState(0)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [editNote, setEditNote] = useState('')
  const [editFeedback, setEditFeedback] = useState('')
  const [kakaoReady, setKakaoReady] = useState(false)
  const supabase = createClient()
  const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? ''

  const formatLastActive = (value: string | null | undefined) => {
    if (!value) return '방문 기록 없음'
    const last = parseISO(value)
    const now = new Date()
    const hours = differenceInHours(now, last)
    if (hours < 24) {
      return format(last, 'yyyy.MM.dd HH:mm:ss', { locale: ko })
    }
    const days = Math.max(1, differenceInDays(now, last))
    return `${days}일 전`
  }

  const formatCreatedAt = (value: string) => {
    return format(parseISO(value), 'yyyy.MM.dd', { locale: ko })
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (!kakaoAppKey) return

    const initializeKakao = () => {
      if (!window.Kakao) return
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoAppKey)
      }
      setKakaoReady(true)
    }

    if (window.Kakao) {
      initializeKakao()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://developers.kakao.com/sdk/js/kakao.min.js'
    script.async = true
    script.onload = initializeKakao
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [kakaoAppKey])

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
    setEditNote(member.admin_note ?? '')
    setEditFeedback(member.coach_feedback ?? '')
    setEditPhone(member.phone ?? '')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        remaining_sessions: editSessions,
        name: editName || null,
        phone: editPhone || null,
        admin_note: editNote || null,
        coach_feedback: editFeedback || null,
      })
      .eq('id', id)
    setSaving(false)
    setEditId(null)
    await fetchMembers()
  }

  function shareFeedback(member: Profile) {
    const feedback = member.coach_feedback?.trim()
    if (!feedback) {
      alert('공유할 코치 피드백이 없습니다.')
      return
    }
    if (!kakaoAppKey) {
      alert('카카오 공유 키가 설정되지 않았습니다. NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY를 확인해주세요.')
      return
    }
    if (!kakaoReady || !window.Kakao) {
      alert('카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    const memberName = member.name ?? '회원'
    const baseUrl = window.location.origin

    window.Kakao.Share.sendDefault({
      objectType: 'text',
      text: `[코치 피드백]\n${memberName}님\n\n${feedback}`,
      link: {
        mobileWebUrl: `${baseUrl}/my`,
        webUrl: `${baseUrl}/my`,
      },
      buttonTitle: '피드백 확인',
    })
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
                  <div>
                    <label className="label">연락처</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="input"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <label className="label">관리자 메모</label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="input resize-none"
                      rows={3}
                      placeholder="회원 특이사항, 선호 시간대 등"
                    />
                  </div>
                  <div>
                    <label className="label">코치 피드백</label>
                    <textarea
                      value={editFeedback}
                      onChange={(e) => setEditFeedback(e.target.value)}
                      className="input resize-none"
                      rows={3}
                      placeholder="회원이 /my 화면에서 확인할 피드백"
                    />
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
                    <div className="min-w-0 space-y-2">
                      <p className="text-ink text-sm font-medium truncate">
                        {member.name ?? '이름 없음'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate/70">
                            연락처
                          </span>
                          <span className="font-medium text-ink/80">
                            {member.phone ?? '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate/70">
                            등록일
                          </span>
                          <span className="font-medium text-ink/80">
                            {formatCreatedAt(member.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate/70">
                            마지막 방문
                          </span>
                          <span className="font-medium text-ink/80">
                            {formatLastActive(member.last_active_at)}
                          </span>
                        </div>
                      </div>
                      {member.admin_note && (
                        <div className="rounded-md bg-sand/60 border border-mist px-3 py-2">
                          <p className="text-xs text-slate line-clamp-2 whitespace-pre-wrap">
                            {member.admin_note}
                          </p>
                        </div>
                      )}
                      {member.coach_feedback && (
                        <div className="rounded-md bg-brand/5 border border-brand/20 px-3 py-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[11px] text-brand font-medium">
                              코치 피드백
                            </p>
                            <button
                              onClick={() => shareFeedback(member)}
                              className="text-[11px] px-2 py-1 rounded-md border border-brand/30 text-brand hover:bg-brand/10 transition-colors"
                            >
                              카카오톡 공유
                            </button>
                          </div>
                          <p className="text-xs text-ink/80 line-clamp-2 whitespace-pre-wrap">
                            {member.coach_feedback}
                          </p>
                        </div>
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
