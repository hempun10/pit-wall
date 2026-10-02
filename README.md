# Pit Wall

An F1 2026 quiz for people just getting into Formula 1. Pick a Grand Prix and a tyre, race five laps of questions, and learn the sport's terms as you go. Every answer is checked against the real race results stored in Sanity, never decided by the AI.

Built for the [DEV.to Sanity Challenge](https://dev.to/challenges/sanity-2026-09-16) (Path 1: an agent that queries real content through Sanity Context).

## How it works

```
                        ┌──────────────── Sanity ────────────────┐
  F1DB release ──────▶  │ Dataset: race, raceResult, driver,     │
  (scripts/)            │ team, circuit, standings               │
                        │   ▲ GROQ                               │
  Wikipedia rules ───▶  │ Knowledge Base "F1 rules for newcomers"│
  (scripts/fetch_kb.py) │   (conflicts flagged and resolved)     │
                        │                                        │
                        │ quizQuestion  ◀── stored, verified Qs  │
                        │ quizRun       ◀── finished races       │
                        └───────▲──────────────────▲─────────────┘
                     Context MCP│ pit-wall-data    │ pit-wall-rules
                                │ (GROQ mode)      │ (Knowledge Base mode)
                        ┌───────┴──────────────────┴─────────────┐
                        │ Agent (OpenAI via Vercel AI SDK)       │
                        │ writes a question + the GROQ that      │
                        │ answers it, explains one term from KB  │
                        └───────────────────┬────────────────────┘
                                            │
                     server runs the GROQ itself, keeps the result,
                     encrypts it into the question (no storage)
                                            │
                        ┌───────────────────▼────────────────────┐
                        │ Next.js app: menu, race, team radio,   │
                        │ results, standings                     │
                        └────────────────────────────────────────┘
```

- **The model never grades.** The agent proposes a question and a GROQ query; the server runs that query against the dataset and stores the value it returns as the answer. If the query doesn't return a single value, the agent tries again.
- **Two Context endpoints.** One serves the race dataset in GROQ mode, the other serves the rules Knowledge Base. (An endpoint with both sources silently ignores the Knowledge Base, so they are kept apart.)
- **Question bank.** Verified questions are saved as `quizQuestion` documents, so most plays are instant and cost nothing. The agent only writes live when a round and tyre has nothing new for the player, up to 6 per round and tyre.
- **Team radio.** After each answer you can ask the race engineer a question. A live agent answers from both endpoints and lists exactly what it looked up.
- **Championship.** A finished race scores F1 points (25, 18, 15, 12, 10 for 5 to 1 correct). The score travels inside an encrypted token from answer to answer, so the browser can't invent it. Finished races are `quizRun` documents.

## Repository

```
web/                         Next.js app
  app/                       routes only: page, layout, styles, fonts, api/*
  components/
    pit-wall.tsx             which screen is showing (intro, code, menu, race, standings)
    screens/                 intro, menu, onboarding (driver code), standings
    race/                    race screen, answers, verdict panel, team radio, timing tower,
                             start lights, loading, lap progress
    results/                 results, championship points, finish-line celebrations
    ui/                      wordmark, icons, flags, answer art, sound toggle
  hooks/                     use-race (all race logic), use-keydown, use-driver-code
  lib/                       f1 constants, shared types, browser helpers, Sanity reads, sounds
    server/                  agent, question bank, answer options, encrypted tokens, standings
studio/                      Sanity Studio; one schema file per document type in schemaTypes/
scripts/                     f1db_to_ndjson.py (race data), fetch_kb.py (rules), fill_bank.py
kb/                          the rules articles as imported (CC BY-SA 4.0)
```

## Run it yourself

You need Node 20+, Python 3, a Sanity account and an OpenAI API key.

1. **Sanity project.** Create one at sanity.io, then set its ID in `studio/sanity.cli.ts`, `studio/sanity.config.ts`, `web/lib/sanity.ts` and `scripts/fill_bank.py`. Make the `production` dataset public.
2. **Race data.**
   ```bash
   mkdir -p data && cd data
   curl -LO https://github.com/f1db/f1db/releases/latest/download/f1db-sqlite.zip && unzip f1db-sqlite.zip && cd ..
   python3 scripts/f1db_to_ndjson.py
   cd studio && npm install
   npx sanity schema deploy && npx sanity deploy
   npx sanity datasets import ../data/f1.ndjson -d production --replace
   ```
   The Context data endpoint needs a deployed Studio (v5.1+), which `sanity deploy` provides.
3. **Rules Knowledge Base.** Turn on Knowledge Bases in your organization's Labs settings, then:
   ```bash
   python3 scripts/fetch_kb.py
   npx sanity context create --organization <org-id> --title "F1 rules for newcomers" --description "..."
   for f in ../kb/*.md; do npx sanity context imports create <kb-id> --file "$f"; done
   npx sanity context build <kb-id> --watch
   ```
   Review the flagged conflicts in the Context app in the Sanity Dashboard.
4. **Context endpoints.** In the Context app, create `pit-wall-data` (source: your dataset) and `pit-wall-rules` (source: the Knowledge Base). Create an organization token with the Context Viewer role, and a project token with the Editor role.
5. **App.**
   ```bash
   cd web && npm install
   cp .env.example .env.local   # fill it in
   npm run dev
   ```
6. Optional: `python3 scripts/fill_bank.py` while the app runs, so every round starts instantly.

## Credits and licences

The code is MIT licensed (see `LICENSE`). Everything else keeps its own licence:

| What | Source | Licence |
|---|---|---|
| Race data | [F1DB](https://github.com/f1db/f1db) | CC BY 4.0 |
| Rules text in `kb/` and the Knowledge Base | Wikipedia contributors | CC BY-SA 4.0 |
| Pixel font | [Departure Mono](https://departuremono.com) by Helena Zhang | SIL Open Font License (`web/app/fonts/`) |
| Serif font | [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | SIL Open Font License |
| F1 car recording | [Geoff-Bremner-Audio](https://freesound.org/people/Geoff-Bremner-Audio/) on Freesound | CC BY 4.0 (`web/public/sfx/README.md`) |
| Crowd and champagne sounds | Freesound | CC0 |
| Flags | [country-flag-icons](https://github.com/catamphetamine/country-flag-icons) | MIT (`web/public/flags/LICENSE.txt`) |

Other sounds are synthesised in the browser. Driver helmets and team cars are drawn in code; no team, driver or Formula 1 imagery is used.

Pit Wall is a fan project and is not affiliated with Formula 1, the FIA or any team.
