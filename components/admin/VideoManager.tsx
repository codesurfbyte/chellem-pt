'use client'

import { useState } from 'react'
import type { ExerciseVideo } from '@/lib/types'
import {
  useExerciseVideos,
  useCreateVideo,
  useUpdateVideo,
  useDeleteVideo,
} from '@/lib/hooks/query-hooks'

const CATEGORIES = ['전체', '코어', '하체', '상체', '유산소', '스트레칭', '기타']
const MAX_CONTENT_LENGTH = 500

type FormState = {
  title: string
  content: string
  urls: string[]
  category: string
}

const emptyForm = (): FormState => ({
  title: '',
  content: '',
  urls: [''],
  category: '코어',
})

export default function VideoManager() {
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [filterCategory, setFilterCategory] = useState('전체')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: videos = [], isLoading } = useExerciseVideos()
  const createVideo = useCreateVideo()
  const updateVideo = useUpdateVideo()
  const deleteVideo = useDeleteVideo()

  const isSaving = createVideo.isPending || updateVideo.isPending
  const saveError = createVideo.error || updateVideo.error
  const deleteError = deleteVideo.error

  function startCreate() {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function startEdit(video: ExerciseVideo) {
    setEditId(video.id)
    setForm({
      title: video.title,
      content: video.content ?? '',
      urls: video.urls.length > 0 ? video.urls : [''],
      category: video.category,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm())
  }

  function setUrl(index: number, value: string) {
    setForm((f) => {
      const urls = [...f.urls]
      urls[index] = value
      return { ...f, urls }
    })
  }

  function addUrl() {
    setForm((f) => ({ ...f, urls: [...f.urls, ''] }))
  }

  function removeUrl(index: number) {
    setForm((f) => ({ ...f, urls: f.urls.filter((_, i) => i !== index) }))
  }

  async function save() {
    const title = form.title.trim()
    const content = form.content.trim()
    const urls = form.urls.map((u) => u.trim()).filter(Boolean)

    if (!title || content.length > MAX_CONTENT_LENGTH) return

    const payload = {
      title,
      content: content || null,
      urls,
      category: form.category,
    }

    if (editId) {
      await updateVideo.mutateAsync({ id: editId, ...payload })
    } else {
      await createVideo.mutateAsync(payload)
    }

    cancelForm()
  }

  async function handleDelete(id: string) {
    await deleteVideo.mutateAsync(id)
    setDeleteConfirmId(null)
  }

  const filtered =
    filterCategory === '전체'
      ? videos
      : videos.filter((v) => v.category === filterCategory)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse h-16" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-slate text-sm">총 {videos.length}개</p>
        <button onClick={startCreate} className="btn-primary text-sm px-4 py-2">
          + 영상 추가
        </button>
      </div>

      {/* 에러 표시 */}
      {(saveError || deleteError) && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
          {(saveError || deleteError)?.message ?? '오류가 발생했습니다'}
        </div>
      )}

      {/* 추가/수정 폼 */}
      {showForm && (
        <div className="card p-5 space-y-4 border-brand/30 border">
          <h3 className="text-sm font-medium text-ink">
            {editId ? '영상 수정' : '새 영상 추가'}
          </h3>

          <div>
            <label className="label">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="영상 제목"
            />
          </div>

          <div>
            <label className="label">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input"
            >
              {CATEGORIES.filter((c) => c !== '전체').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              설명
              <span className="ml-2 text-slate font-normal">
                ({form.content.length}/{MAX_CONTENT_LENGTH})
              </span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="input resize-none"
              rows={3}
              placeholder="운동 설명, 주의사항 등"
              maxLength={MAX_CONTENT_LENGTH}
            />
          </div>

          <div>
            <label className="label">영상 URL</label>
            <div className="space-y-2">
              {form.urls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(i, e.target.value)}
                    className="input flex-1"
                    placeholder="https://youtube.com/..."
                  />
                  {form.urls.length > 1 && (
                    <button
                      onClick={() => removeUrl(i)}
                      className="text-xs text-red-500 hover:text-red-400 px-2"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addUrl}
                className="text-xs text-brand hover:text-brand/80"
              >
                + URL 추가
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={isSaving || !form.title.trim()}
              className="btn-primary text-xs px-4 py-2"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button onClick={cancelForm} className="btn-secondary text-xs px-4 py-2">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              filterCategory === c
                ? 'bg-brand text-white border-brand'
                : 'text-slate border-mist hover:border-brand/50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate text-sm">
          등록된 영상이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((video) => (
            <div key={video.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                      {video.category}
                    </span>
                    <p className="text-sm font-medium text-ink truncate">{video.title}</p>
                  </div>
                  {video.content && (
                    <p className="text-xs text-slate line-clamp-2 whitespace-pre-wrap">
                      {video.content}
                    </p>
                  )}
                  <p className="text-xs text-slate/60">영상 {video.urls.length}개</p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(video)}
                    className="text-xs text-slate hover:text-ink px-3 py-1.5 rounded-lg hover:bg-sand transition-colors"
                  >
                    편집
                  </button>

                  {deleteConfirmId === video.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(video.id)}
                        disabled={deleteVideo.isPending}
                        className="text-xs text-white bg-red-500 hover:bg-red-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {deleteVideo.isPending ? '삭제 중...' : '확인'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-slate hover:text-ink px-2 py-1.5 rounded-lg hover:bg-sand transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(video.id)}
                      className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
