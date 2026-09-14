from fastapi import APIRouter, HTTPException
from app.db import db

router = APIRouter(prefix="/api/geo", tags=["geo"])


@router.get("/provinces")
def geo_provinces():
    docs = list(db.geo_provinces.find({}, {"_id": 0, "feature": 1}))
    return {"type": "FeatureCollection", "features": [d["feature"] for d in docs]}


@router.get("/stations")
def geo_stations(province: str):
    if not province:
        raise HTTPException(400, "province is required")
    docs = list(db.geo_stations.find({"prov_code": province}, {"_id": 0, "feature": 1}))
    return {"type": "FeatureCollection", "features": [d["feature"] for d in docs]}
