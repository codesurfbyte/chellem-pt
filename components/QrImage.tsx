'use client'

import { useState } from 'react'

export default function QrImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="h-36 w-36 rounded-lg border border-mist bg-page flex items-center justify-center text-xs text-slate text-center p-3">
        QR을 불러올 수 없습니다
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-36 w-36 rounded-lg border border-mist bg-white"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
