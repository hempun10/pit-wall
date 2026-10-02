// Country flags are local SVGs from country-flag-icons (MIT, see public/flags/LICENSE.txt)
export function Flag({code, size = 20}: {code: string; size?: number}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local SVGs, nothing for next/image to optimise
    <img src={`/flags/${code.toLowerCase()}.svg`} alt="" width={size} height={(size * 2) / 3} className="inline-block shrink-0 rounded-[3px] align-[-2px]" />
  )
}
