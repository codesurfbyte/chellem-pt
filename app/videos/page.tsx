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

  const { data } = await supabase
    .from('exercise_videos')
    .select('*')
    .order('created_at', { ascending: false })

  const videos: ExerciseVideo[] = data ?? []

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          Exercise
        </span>
        <h1 className="font-display text-4xl font-bold text-ink mt-2 tracking-wide">
          운동 영상
        </h1>
      </div>
      <VideoList initialData={videos} />
    </div>
  )
}
