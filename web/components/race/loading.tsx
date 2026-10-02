import {useEffect, useState} from 'react'

// Start lights while the question loads; after a few seconds, explain why it's taking a while
export function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="mt-5" role="status">
      <div className="lights" aria-hidden="true">
        {Array.from({length: 5}, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <p className="display mt-6 text-3xl">{slow ? 'Writing a fresh question…' : 'Lights out and away we go…'}</p>
      <p className="mt-1 text-sm text-secondary">
        {slow
          ? 'Nobody has raced this one yet, so the race engineer is checking the answer against the data. Around 20 seconds.'
          : 'Getting your question from the race data.'}
      </p>
      <ul className="mt-8 flex flex-col gap-2.5" aria-hidden="true">
        {Array.from({length: 4}, (_, i) => (
          <li key={i} className="h-14 animate-pulse bg-surface" style={{animationDelay: `${i * 120}ms`}} />
        ))}
      </ul>
    </div>
  )
}
