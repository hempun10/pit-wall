"""Convert the F1DB SQLite release (CC BY 4.0, https://github.com/f1db/f1db) to Sanity NDJSON.

    python3 scripts/f1db_to_ndjson.py            # writes data/f1.ndjson
    cd studio && npx sanity datasets import ../data/f1.ndjson -d production --replace
"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FROM_YEAR = 2014  # ponytail: hybrid era only keeps us under the 10k-document free plan; widen if the plan changes


def ref(kind, key):
    return {"_type": "reference", "_ref": f"{kind}-{key}"}


def clean(doc):
    return {k: v for k, v in doc.items() if v is not None}


def build(db):
    db.row_factory = sqlite3.Row
    q = lambda sql, *a: db.execute(sql, a).fetchall()
    docs = []

    results = q(
        """select rd.*, r.year, r.round from race_data rd join race r on r.id = rd.race_id
           where rd.type = 'RACE_RESULT' and r.year >= ? order by r.year, r.round, rd.position_display_order""",
        FROM_YEAR,
    )
    d_stand = q("select * from season_driver_standing where year >= ?", FROM_YEAR)
    c_stand = q("select * from season_constructor_standing where year >= ?", FROM_YEAR)
    races = q("select r.*, g.name gp from race r join grand_prix g on g.id = r.grand_prix_id where r.year >= ?", FROM_YEAR)
    completed = {(r["year"], r["round"]) for r in results}

    driver_ids = {r["driver_id"] for r in results} | {r["driver_id"] for r in d_stand}
    team_ids = {r["constructor_id"] for r in results} | {r["constructor_id"] for r in c_stand}
    circuit_ids = {r["circuit_id"] for r in races}
    country = {r["id"]: r["name"] for r in q("select id, name from country")}
    alpha2 = {r["id"]: r["alpha2_code"] for r in q("select id, alpha2_code from country")}

    for d in q("select * from driver"):
        if d["id"] in driver_ids:
            docs.append(clean({
                "_id": f"driver-{d['id']}", "_type": "driver",
                "name": d["name"], "fullName": d["full_name"], "abbreviation": d["abbreviation"],
                "permanentNumber": int(d["permanent_number"]) if d["permanent_number"] else None,
                "dateOfBirth": d["date_of_birth"], "nationality": country.get(d["nationality_country_id"]),
                "totalRaceStarts": d["total_race_starts"], "totalRaceWins": d["total_race_wins"],
                "totalPodiums": d["total_podiums"], "totalPolePositions": d["total_pole_positions"],
                "totalChampionshipWins": d["total_championship_wins"],
            }))
    for c in q("select * from constructor"):
        if c["id"] in team_ids:
            docs.append(clean({
                "_id": f"team-{c['id']}", "_type": "team",
                "name": c["name"], "fullName": c["full_name"], "country": country.get(c["country_id"]),
                "totalRaceWins": c["total_race_wins"], "totalChampionshipWins": c["total_championship_wins"],
            }))
    for c in q("select * from circuit"):
        if c["id"] in circuit_ids:
            docs.append(clean({
                "_id": f"circuit-{c['id']}", "_type": "circuit",
                "name": c["name"], "fullName": c["full_name"], "placeName": c["place_name"],
                "country": country.get(c["country_id"]), "countryCode": alpha2.get(c["country_id"]), "circuitType": c["type"],
                "lengthKm": c["length"], "turns": c["turns"],
            }))
    for r in races:
        docs.append(clean({
            "_id": f"race-{r['year']}-{r['round']}", "_type": "race",
            "year": r["year"], "round": r["round"], "date": r["date"], "grandPrix": r["gp"],
            "officialName": r["official_name"], "circuit": ref("circuit", r["circuit_id"]),
            "laps": r["laps"], "distanceKm": r["distance"],
            "hasSprint": r["sprint_race_date"] is not None,
            "completed": (r["year"], r["round"]) in completed,
        }))
    for r in results:
        docs.append(clean({
            "_id": f"result-{r['year']}-{r['round']}-{r['driver_id']}", "_type": "raceResult",
            "race": ref("race", f"{r['year']}-{r['round']}"),
            "driver": ref("driver", r["driver_id"]), "team": ref("team", r["constructor_id"]),
            "year": r["year"], "round": r["round"],
            "positionOrder": r["position_display_order"], "position": r["position_number"],
            "positionText": r["position_text"],
            "gridPosition": r["race_grid_position_number"], "gridText": r["race_grid_position_text"],
            "qualifyingPosition": r["race_qualification_position_number"],
            "positionsGained": r["race_positions_gained"], "points": r["race_points"] or 0,
            "laps": r["race_laps"], "time": r["race_time"], "gap": r["race_gap"],
            "reasonRetired": r["race_reason_retired"], "pitStops": r["race_pit_stops"],
            "polePosition": bool(r["race_pole_position"]), "fastestLap": bool(r["race_fastest_lap"]),
            "driverOfTheDay": bool(r["race_driver_of_the_day"]),
        }))
    for s in d_stand:
        docs.append(clean({
            "_id": f"driverStanding-{s['year']}-{s['position_display_order']}", "_type": "driverStanding",
            "year": s["year"], "position": s["position_number"], "driver": ref("driver", s["driver_id"]),
            "points": s["points"], "champion": bool(s["championship_won"]),
        }))
    # keyed by row order: Force India appears twice in 2018 (excluded, then re-entered)
    for s in c_stand:
        docs.append(clean({
            "_id": f"teamStanding-{s['year']}-{s['position_display_order']}", "_type": "teamStanding",
            "year": s["year"], "position": s["position_number"],
            "team": ref("team", s["constructor_id"]),
            "points": s["points"], "champion": bool(s["championship_won"]),
        }))
    return docs


def check(docs):
    ids = [d["_id"] for d in docs]
    dupes = {i for i in ids if ids.count(i) > 1} if len(ids) != len(set(ids)) else set()
    assert not dupes, f"duplicate ids: {sorted(dupes)[:5]}"
    # Sanity does not serve documents with a dot in the id to anonymous readers
    assert not [i for i in ids if "." in i], "dotted ids"
    assert len(docs) < 10_000, f"{len(docs)} documents exceeds the free plan"
    known = set(ids)
    for d in docs:
        for v in d.values():
            if isinstance(v, dict) and v.get("_type") == "reference":
                assert v["_ref"] in known, f"{d['_id']} -> missing {v['_ref']}"
    baku = [d for d in docs if d["_type"] == "raceResult" and d["year"] == 2026 and d["round"] == 15]
    assert baku[0]["driver"]["_ref"] == "driver-george-russell" and baku[0]["points"] == 25, baku[0]


if __name__ == "__main__":
    docs = build(sqlite3.connect(ROOT / "data" / "f1db.db"))
    check(docs)
    out = ROOT / "data" / "f1.ndjson"
    out.write_text("".join(json.dumps(d, ensure_ascii=False) + "\n" for d in docs))
    counts = {}
    for d in docs:
        counts[d["_type"]] = counts.get(d["_type"], 0) + 1
    print(f"{len(docs)} documents -> {out}")
    for t, n in sorted(counts.items()):
        print(f"  {t}: {n}")
