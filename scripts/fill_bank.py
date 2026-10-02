"""Fill every completed round and tyre to at least 3 stored questions, through the running app.

    APP_URL=http://localhost:3000 python3 scripts/fill_bank.py

Run it after importing new race data so players never wait for a fresh question.
Each new question is one agent run (roughly 2 US cents with gpt-5.4-mini).
"""
import json, os, time, urllib.parse, urllib.request

Q = 'https://hptt7wjq.api.sanity.io/v2025-02-19/data/query/production?query='
APP = os.environ.get('APP_URL', 'http://localhost:3000') + '/api/question'
GOAL = 3

def groq(q):
    return json.load(urllib.request.urlopen(Q + urllib.parse.quote(q), timeout=60))['result']

rounds = groq('*[_type=="race" && year==2026 && completed] | order(round asc).round')
for r in rounds:
    for t in ('soft', 'medium', 'hard'):
        for attempt in range(6):
            ids = groq(f'*[_type=="quizQuestion" && round=={r} && tyre=="{t}"]._id')
            if len(ids) >= GOAL:
                break
            body = json.dumps({'round': r, 'tyre': t, 'seen': ids}).encode()
            req = urllib.request.Request(APP, body, {'Content-Type': 'application/json'})
            t0 = time.time()
            try:
                out = json.load(urllib.request.urlopen(req, timeout=180))
                print(f'R{r} {t}: {len(ids)}->+1 in {time.time()-t0:.0f}s  {out.get("question","")[:70]}', flush=True)
            except Exception as e:
                print(f'R{r} {t}: error {e}', flush=True)
                time.sleep(20)
        stored = len(groq(f'*[_type=="quizQuestion" && round=={r} && tyre=="{t}"]._id'))
        print(f'R{r} {t}: done ({stored} stored)', flush=True)
print('ALL DONE', flush=True)
