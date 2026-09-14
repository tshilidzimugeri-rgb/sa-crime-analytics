"""
Step 0 of the ETL pipeline: inspect the real downloaded source files before
writing any transform code. Run this first and eyeball the output against
docs/DATA_SOURCES.md before trusting etl/category_taxonomy.json.
"""
import pandas as pd

RAW = "../data/raw"


def inspect_crime_stats():
    print("=== crime-stats.csv ===")
    df = pd.read_csv(f"{RAW}/crime-stats.csv")
    print("shape:", df.shape)
    print("dtypes:\n", df.dtypes)
    print("\nfirst rows:\n", df.head())
    print("\nyear range:", df["year"].min(), "-", df["year"].max())
    print("provinces:", sorted(df["province"].unique()))
    print("distinct stations:", df["station_code"].nunique())

    cats = df[["crime_code", "crime_name"]].drop_duplicates().sort_values("crime_code")
    print(f"\ndistinct categories: {len(cats)}")
    with pd.option_context("display.max_rows", None):
        print(cats.to_string(index=False))
    cats.to_csv("category_list_raw.csv", index=False)
    print("\nWrote full category list to etl/category_list_raw.csv")
    return df


def inspect_stations():
    print("\n=== police_stations.csv ===")
    df = pd.read_csv(f"{RAW}/police_stations.csv")
    print("shape:", df.shape)
    print("dtypes:\n", df.dtypes)
    print("\nfirst rows:\n", df.head())
    print("provinces:", sorted(df["prov_code"].unique()))
    return df


if __name__ == "__main__":
    crime_df = inspect_crime_stats()
    stations_df = inspect_stations()

    orphan_codes = set(crime_df["station_code"]) - set(stations_df["code"])
    print(f"\nstation codes in crime-stats.csv with no match in police_stations.csv: {len(orphan_codes)}")
    if orphan_codes:
        print(sorted(orphan_codes))
