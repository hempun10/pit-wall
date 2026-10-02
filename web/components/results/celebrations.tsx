// Finish-line effects. All decorative, and switched off with reduced motion (see globals.css).

export function ChequeredFlag() {
  return <div className="chequered" aria-hidden="true" />
}

// Podium (3+ correct): a fan of champagne droplets from the score
export function Champagne() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {Array.from({length: 28}, (_, i) => {
        const angle = ((-165 + (i * 150) / 27) * Math.PI) / 180
        const reach = 110 + (i % 5) * 28
        const style = {'--dx': `${Math.cos(angle) * reach}px`, '--dy': `${Math.sin(angle) * reach}px`, animationDelay: `${700 + (i % 4) * 40}ms`}
        return <span key={i} className="spray" style={style as React.CSSProperties} />
      })}
    </div>
  )
}

// Perfect race: tyre smoke from the winner's donuts
export function Smoke() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({length: 7}, (_, i) => (
        <span key={i} className="smoke" style={{left: `${8 + i * 13}%`, animationDelay: `${i * 160}ms`}} />
      ))}
    </div>
  )
}
