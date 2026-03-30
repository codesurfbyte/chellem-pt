import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 503 })
  }

  const { exercise, reps } = await request.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `헬스 트레이너입니다. 순수 JSON만 반환하세요:
{"encouragements":[{"rep":숫자,"text":"추임새"}],"restTip":"팁"}
운동: ${exercise}, 횟수: ${reps}회
- rep 1~${reps} 각각 짧은 한국어 추임새 (3~8자, 전부 포함)
- 초반(1~2): 시작 격려, 중반(${Math.ceil(reps / 2)}): 강한 격려, 후반(${reps - 1}): 마무리, 마지막(${reps}): 폭발적
- restTip: ${exercise} 주요 자극 근육 + 자세 팁 2문장 (구체적으로)`,
      }],
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'AI service error' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
