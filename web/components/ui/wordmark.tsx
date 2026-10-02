// Five red squares for the start lights, then the name in pixel type
export function Wordmark({large = false}: {large?: boolean}) {
  return (
    <p className={`pixel flex items-center uppercase ${large ? 'gap-4 text-4xl' : 'gap-2.5 text-sm'}`} aria-label="Pit Wall">
      <span className={`flex ${large ? 'gap-1' : 'gap-[3px]'}`} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={`block bg-accent ${large ? 'size-3' : 'size-1.5'}`} />
        ))}
      </span>
      Pit Wall
    </p>
  )
}
