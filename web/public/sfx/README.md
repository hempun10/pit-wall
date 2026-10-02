# Sounds

The big moments use real recordings; short UI sounds (start-light beeps, clicks, correct and wrong tones) are synthesised in `lib/sfx.ts`.

## Credits

All files were trimmed, faded and loudness-normalised for Pit Wall.

| File | Plays at | Source | Licence |
|---|---|---|---|
| `cc-lights-out.mp3` | lights out | [Formula 1 Whoosh Zip Flyby 6](https://freesound.org/s/745819/) by Geoff-Bremner-Audio | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `cc-crowd.mp3` | chequered flag | [Crowd Cheering](https://freesound.org/s/365132/) by SoundsExciting | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `cc-champagne.mp3` | podium finish | [Champagne Cork](https://freesound.org/s/392624/) by KenRT | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Adding your own

Put `<file>.mp3` here and map it to a sound name in `SAMPLES` in `lib/sfx.ts`
(`light`, `lights-out`, `radio`, `correct`, `wrong`, `crowd`, `champagne`).
Files not starting with `cc-` are git-ignored, so local-only recordings stay out of the repo.
