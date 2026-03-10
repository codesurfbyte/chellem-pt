'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notice } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function NoticeManager() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Notice | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchNotices()
  }, [])

  async function fetchNotices() {
    setLoading(true)
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setNotices(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditTarget(null)
    setTitle('')
    setContent('')
    setIsPinned(false)
    setShowForm(true)
  }

  function openEdit(notice: Notice) {
    setEditTarget(notice)
    setTitle(notice.title)
    setContent(notice.content)
    setIsPinned(notice.is_pinned)
    setShowForm(true)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)

    if (editTarget) {
      await supabase
        .from('notices')
        .update({ title, content, is_pinned: isPinned })
        .eq('id', editTarget.id)
    } else {
      await supabase.from('notices').insert({ title, content, is_pinned: isPinned })
    }

    setSaving(false)
    setShowForm(false)
    await fetchNotices()
  }

  async function handleDelete(id: string) {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    await supabase.from('notices').delete().eq('id', id)
    await fetchNotices()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary text-xs px-4 py-2">
          + 공지 작성
        </button>
      </div>

      {/* 작성/편집 폼 */}
      {showForm && (
        <div className="card-elevated p-5 space-y-4">
          <h3 className="font-medium text-ink text-sm">
            {editTarget ? '공지 수정' : '새 공지 작성'}
          </h3>

          <div>
            <label className="label">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목"
              className="input"
            />
          </div>

          <div>
            <label className="label">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              rows={4}
              className="input resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setIsPinned(!isPinned)}
              className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${
                isPinned ? 'bg-brand' : 'bg-sand border border-mist'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all ${
                  isPinned ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm text-slate group-hover:text-ink">
              상단 고정
            </span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 공지 목록 */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="card p-8 text-center text-slate text-sm">
          등록된 공지사항이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`card p-4 ${
                notice.is_pinned ? 'border-brand/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notice.is_pinned && (
                      <span className="badge-available text-[10px]">고정</span>
                    )}
                    <h3 className="text-ink font-medium text-sm">
                      {notice.title}
                    </h3>
                  </div>
                  <p className="text-slate text-xs mt-1 line-clamp-2">
                    {notice.content}
                  </p>
                  <p className="text-slate/70 text-xs mt-2">
                    {format(parseISO(notice.created_at), 'yyyy.MM.dd', {
                      locale: ko,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(notice)}
                    className="text-xs px-2 py-1.5 text-slate hover:text-ink hover:bg-sand rounded transition-all"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="text-xs px-2 py-1.5 text-red-600 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
