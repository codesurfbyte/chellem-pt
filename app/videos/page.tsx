import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ExerciseVideo } from '@/lib/types'
import VideoList from '@/components/VideoList'

export default async function VideosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/videos')

  const { data, error } = await supabase
    .from('exercise_videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('exercise_videos fetch error:', error)
  }

  const videos: ExerciseVideo[] = Array.isArray(data)
    ? data.filter((item) => Array.isArray(item.urls))
    : []

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Exercise</p>
        <h1 className="page-title mt-2">운동 영상</h1>
        <p className="mt-1.5 text-sm text-slate">트레이너가 업로드한 운동 영상을 확인하세요</p>
      </div>
      <VideoList initialData={videos} />
    </div>
  )
}
