"""
Loads the raw SAPS CSVs into MongoDB (database: sa_crime), denormalized for
fast aggregation-pipeline queries (station name / province / category name
inlined into every crime_monthly document -- no $lookup needed on hot paths).

Run after etl/inspect_source.py has confirmed the source columns, and after
scripts/fetch_data.ps1 (or .sh) has populated data/raw/.
"""
import json
import pandas as pd
from pymongo import MongoClient, ASCENDING

RAW = "../data/raw"
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "sa_crime"
BATCH_SIZE = 8000


def load_taxonomy():
    with open("category_taxonomy.json", encoding="utf-8") as f:
        raw = json.load(f)
    raw.pop("_comment", None)
    return raw


def build_stations(db, stations_df):
    db.stations.drop()
    docs = [
        {
            "_id": row["code"],
            "code": row["code"],
            "name": row["name"],
            "muni_code": row["muni_code"],
            "dc_code": row["dc_code"],
            "prov_code": row["prov_code"],
            "population": int(row["population"]),
            "area_km2": float(row["area_km2"]),
        }
        for _, row in stations_df.iterrows()
    ]
    db.stations.insert_many(docs)
    db.stations.create_index([("prov_code", ASCENDING)])
    print(f"stations: inserted {len(docs)} documents")


def build_categories(db, taxonomy, crime_df):
    db.categories.drop()
    real_names = crime_df[["crime_code", "crime_name"]].drop_duplicates().set_index("crime_code")["crime_name"].to_dict()

    missing = set(real_names) - set(taxonomy)
    if missing:
        raise SystemExit(f"category_taxonomy.json is missing codes present in the data: {missing}")

    docs = []
    for code, meta in taxonomy.items():
        docs.append({
            "_id": code,
            "code": code,
            "name": meta["name"],
            "kind": meta["kind"],
            "is_headline": meta["is_headline"],
            "parent_code": meta.get("parent_code"),
            "rollup_of": meta.get("rollup_of", []),
        })
    db.categories.insert_many(docs)
    print(f"categories: inserted {len(docs)} documents")


def build_crime_monthly(db, crime_df, stations_df, taxonomy):
    db.crime_monthly.drop()

    station_lookup = stations_df.set_index("code")["prov_code"].to_dict()
    # crime-stats.csv already has a province column, but derive independently
    # from police_stations.csv too and assert they agree, since crime_monthly
    # denormalizes prov_code and it must be trustworthy for province filters.
    mismatches = 0

    records = crime_df.to_dict("records")
    batch = []
    total = 0
    for r in records:
        code = r["crime_code"]
        meta = taxonomy[code]
        prov_from_stations = station_lookup.get(r["station_code"])
        if prov_from_stations != r["province"]:
            mismatches += 1
        batch.append({
            "station_code": r["station_code"],
            "station_name": r["station_name"],
            "prov_code": r["province"],
            "crime_code": code,
            "crime_name": r["crime_name"],
            "is_headline": meta["is_headline"],
            "kind": meta["kind"],
            "year": int(r["year"]),
            "month": int(r["month"]),
            "crime_count": int(r["crime_count"]),
        })
        if len(batch) >= BATCH_SIZE:
            db.crime_monthly.insert_many(batch)
            total += len(batch)
            batch = []
            print(f"  ...{total} rows inserted", end="\r")
    if batch:
        db.crime_monthly.insert_many(batch)
        total += len(batch)

    print(f"\ncrime_monthly: inserted {total} documents ({mismatches} province mismatches between the two source files)")

    # Compound indexes matching the API's actual query shapes (category or
    # is_headline equality, combined with optional province/station and a
    # year/month range). A lone (year, month) index forced a full collection
    # scan for these queries since year alone isn't selective -- confirmed via
    # .explain() during development (33s for 3.5M docs vs <100ms with these).
    db.crime_monthly.create_index([("crime_code", ASCENDING), ("prov_code", ASCENDING), ("year", ASCENDING), ("month", ASCENDING)])
    db.crime_monthly.create_index([("is_headline", ASCENDING), ("prov_code", ASCENDING), ("year", ASCENDING), ("month", ASCENDING)])
    db.crime_monthly.create_index([("crime_code", ASCENDING), ("station_code", ASCENDING), ("year", ASCENDING), ("month", ASCENDING)])
    db.crime_monthly.create_index([("is_headline", ASCENDING), ("station_code", ASCENDING), ("year", ASCENDING), ("month", ASCENDING)])
    print("crime_monthly: indexes created")


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    print("Loading CSVs...")
    crime_df = pd.read_csv(f"{RAW}/crime-stats.csv")
    stations_df = pd.read_csv(f"{RAW}/police_stations.csv")
    taxonomy = load_taxonomy()

    build_stations(db, stations_df)
    build_categories(db, taxonomy, crime_df)
    build_crime_monthly(db, crime_df, stations_df, taxonomy)

    print("\nDone. Verify with etl/inspect_source.py counts or MongoDB Compass.")


if __name__ == "__main__":
    main()
