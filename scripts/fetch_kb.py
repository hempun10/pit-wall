"""Fetch the rules explainers for the Knowledge Base from English Wikipedia (CC BY-SA 4.0).

    python3 scripts/fetch_kb.py     # writes kb/*.md, each with its source URL and revision
"""
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

KB = Path(__file__).resolve().parent.parent / "kb"
UA = {"User-Agent": "pit-wall-hackathon/0.1 (F1 quiz knowledge base builder)"}
API = "https://en.wikipedia.org/w/api.php?"

# (title, revision id or None for current)
ARTICLES = [
    ("List of Formula One points systems", None),
    ("Formula One race weekend", None),
    ("Formula One regulations", None),
    ("Formula One tyres", None),
    ("2026 Formula One World Championship", None),
    ("Safety car", None),
    ("Drag reduction system", None),
    ("Glossary of motorsport terms", None),
    # June 2023 revision: still says "one additional point is awarded ... with the fastest lap",
    # a rule abolished from 2025. Kept on purpose so the Knowledge Base has a real stale source to reconcile.
    ("Formula One race weekend", 1162690995),
]


def get(params):
    req = urllib.request.Request(API + urllib.parse.urlencode({**params, "format": "json"}), headers=UA)
    return json.load(urllib.request.urlopen(req))


def fetch(title, revid=None):
    if revid:
        # the extracts API only serves the current revision, so old ones come from rendered HTML paragraphs
        page = get({"action": "parse", "oldid": revid, "prop": "text", "formatversion": 2})["parse"]
        paras = re.findall(r"<p>(.*?)</p>", page["text"], flags=re.S)
        text = "\n\n".join(re.sub(r"\[[^\]]*\]", "", html.unescape(re.sub(r"<[^>]+>", "", x))).strip() for x in paras)
        return page["title"], text, revid
    params = {"action": "query", "prop": "extracts|info", "explaintext": 1, "inprop": "url", "titles": title, "redirects": 1}
    page = next(iter(get(params)["query"]["pages"].values()))
    return page["title"], page["extract"], page["lastrevid"]


def save(title, text, revid, suffix=""):
    url = f"https://en.wikipedia.org/w/index.php?title={urllib.parse.quote(title.replace(' ', '_'))}&oldid={revid}"
    # Wikipedia plaintext marks headings as "== Heading =="; turn them into markdown
    body = re.sub(r"^(=+) (.+?) =+$", lambda m: "#" * len(m.group(1)) + " " + m.group(2), text, flags=re.M)
    name = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") + suffix + ".md"
    (KB / name).write_text(
        f"# {title}{' (older revision)' if suffix else ''}\n\n"
        f"Source: {url}\nLicence: CC BY-SA 4.0, Wikipedia contributors. Revision {revid}.\n\n{body}\n"
    )
    return name


if __name__ == "__main__":
    KB.mkdir(exist_ok=True)
    for title, revid in ARTICLES:
        real_title, text, rev = fetch(title, revid)
        print(f"{save(real_title, text, rev, '-old' if revid else '')}: {len(text)} chars, revision {rev}")
