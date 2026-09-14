"""
Reads police_stations.gpkg, simplifies geometry, dissolves to province level,
and loads both province- and station-level features into MongoDB as GeoJSON
documents (geo_provinces / geo_stations collections) for the map view.
"""
import json
import geopandas as gpd
from pymongo import MongoClient

RAW = "../data/raw"
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "sa_crime"
SIMPLIFY_TOLERANCE = 0.001  # degrees; tightened/loosened based on printed sizes below


def to_feature(row, geometry_col="geometry"):
    return {
        "type": "Feature",
        "geometry": json.loads(gpd.GeoSeries([row[geometry_col]]).to_json())["features"][0]["geometry"],
        "properties": {k: row[k] for k in row.index if k != geometry_col},
    }


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    print("Reading police_stations.gpkg...")
    gdf = gpd.read_file(f"{RAW}/police_stations.gpkg")
    gdf = gdf.to_crs(epsg=4326)
    print("columns:", list(gdf.columns))
    print("rows:", len(gdf))

    gdf["geometry"] = gdf["geometry"].simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)

    # Station-level GeoJSON, one document per station feature
    db.geo_stations.drop()
    station_docs = []
    for _, row in gdf.iterrows():
        feat = to_feature(row)
        station_docs.append({
            "_id": row.get("code", row.get("station_code")),
            "prov_code": row.get("prov_code"),
            "feature": feat,
        })
    db.geo_stations.insert_many(station_docs)
    db.geo_stations.create_index([("prov_code", 1)])
    print(f"geo_stations: inserted {len(station_docs)} documents")

    # Province-level dissolve for the national choropleth
    prov_gdf = gdf.dissolve(by="prov_code", as_index=False)
    prov_gdf["geometry"] = prov_gdf["geometry"].simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)

    db.geo_provinces.drop()
    prov_docs = []
    for _, row in prov_gdf.iterrows():
        feat = {
            "type": "Feature",
            "geometry": json.loads(gpd.GeoSeries([row["geometry"]]).to_json())["features"][0]["geometry"],
            "properties": {"prov_code": row["prov_code"]},
        }
        prov_docs.append({"_id": row["prov_code"], "feature": feat})
    db.geo_provinces.insert_many(prov_docs)
    print(f"geo_provinces: inserted {len(prov_docs)} documents")

    import sys
    approx_size = len(json.dumps(station_docs, default=str))
    print(f"\napprox geo_stations payload size: {approx_size / 1_000_000:.1f} MB "
          f"(increase SIMPLIFY_TOLERANCE and re-run if this is too large for the frontend)")


if __name__ == "__main__":
    main()
