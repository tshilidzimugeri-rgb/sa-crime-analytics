"""
Exports the MongoDB data as a small set of static JSON files the frontend can
load and query entirely client-side -- no backend, no database, deployable to
a plain static host (Netlify). The source data is fixed historical SAPS
reporting (2020-2025, won't be updated), so precomputing is safe and doesn't
sacrifice functionality: two compact fact tables (province x category x
month, and station x category x year) can answer every filter combination the
UI's REST API supported.

Run after etl/build_db.py and etl/build_geo.py. Writes into
frontend/public/data/.
"""
import json
from pymongo import MongoClient

OUT_DIR = "../frontend/public/data"
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "sa_crime"


def write_json(name: str, data) -> None:
    path = f"{OUT_DIR}/{name}"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    import os
    size_kb = os.path.getsize(path) / 1024
    print(f"wrote {path} ({size_kb:.1f} KB)")


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # --- metadata: direct copies ---
    stations = list(db.stations.find({}, {"_id": 0}))
    write_json("stations.json", stations)

    categories = list(db.categories.find({}, {"_id": 0}))
    write_json("categories.json", categories)

    PROVINCE_NAMES = {
        "EC": "Eastern Cape", "FS": "Free State", "GP": "Gauteng",
        "KZN": "KwaZulu-Natal", "LP": "Limpopo", "MP": "Mpumalanga",
        "NC": "Northern Cape", "NW": "North West", "WC": "Western Cape",
    }
    provinces = sorted({s["prov_code"] for s in stations})
    write_json("provinces.json", [{"prov_code": p, "name": PROVINCE_NAMES.get(p, p)} for p in provinces])

    # --- geo: direct copies (already small) ---
    geo_provinces = list(db.geo_provinces.find({}, {"_id": 0, "feature": 1}))
    write_json("geo_provinces.json", {"type": "FeatureCollection", "features": [d["feature"] for d in geo_provinces]})

    geo_stations_by_prov: dict[str, list] = {p: [] for p in provinces}
    for doc in db.geo_stations.find({}, {"_id": 0, "prov_code": 1, "feature": 1}):
        geo_stations_by_prov.setdefault(doc["prov_code"], []).append(doc["feature"])
    os.makedirs(f"{OUT_DIR}/geo_stations", exist_ok=True)
    for p, features in geo_stations_by_prov.items():
        write_json(f"geo_stations/{p}.json", {"type": "FeatureCollection", "features": features})

    # --- fact table A: (prov_code, crime_code, year, month) -> crime_count ---
    # Answers: monthly/yearly trends for any province (or national, summed
    # client-side) and any category (or headline-total, summed client-side),
    # plus compare-provinces and category-level summaries.
    print("Aggregating fact table A (province x category x month)...")
    pipeline_a = [
        {"$group": {
            "_id": {"p": "$prov_code", "c": "$crime_code", "y": "$year", "m": "$month"},
            "n": {"$sum": "$crime_count"},
        }},
    ]
    rows_a = []
    for r in db.crime_monthly.aggregate(pipeline_a, allowDiskUse=True):
        i = r["_id"]
        rows_a.append([i["p"], i["c"], i["y"], i["m"], r["n"]])
    write_json("facts_province_category_month.json", rows_a)
    print(f"  {len(rows_a)} rows")

    # --- fact table B: (station_code, crime_code, year) -> crime_count ---
    # Answers: station-level summary/trends (yearly granularity, as the UI
    # only ever shows yearly trends at station level) and "top stations".
    print("Aggregating fact table B (station x category x year)...")
    pipeline_b = [
        {"$group": {
            "_id": {"s": "$station_code", "c": "$crime_code", "y": "$year"},
            "n": {"$sum": "$crime_count"},
        }},
    ]
    rows_b = []
    for r in db.crime_monthly.aggregate(pipeline_b, allowDiskUse=True):
        i = r["_id"]
        rows_b.append([i["s"], i["c"], i["y"], r["n"]])
    write_json("facts_station_category_year.json", rows_b)
    print(f"  {len(rows_b)} rows")

    print("\nDone. These files are consumed by frontend/src/api/staticData.ts")


if __name__ == "__main__":
    main()
