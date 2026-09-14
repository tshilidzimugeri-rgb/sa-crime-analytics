from fastapi import APIRouter, Query
from typing import Optional
from app.db import db

router = APIRouter(prefix="/api/meta", tags=["meta"])

PROVINCE_NAMES = {
    "EC": "Eastern Cape",
    "FS": "Free State",
    "GP": "Gauteng",
    "KZN": "KwaZulu-Natal",
    "LP": "Limpopo",
    "MP": "Mpumalanga",
    "NC": "Northern Cape",
    "NW": "North West",
    "WC": "Western Cape",
}


@router.get("/provinces")
def list_provinces():
    codes = db.stations.distinct("prov_code")
    return [{"prov_code": c, "name": PROVINCE_NAMES.get(c, c)} for c in sorted(codes)]


@router.get("/categories")
def list_categories():
    docs = list(db.categories.find({}, {"_id": 0}).sort("code", 1))
    return docs


@router.get("/stations")
def list_stations(province: Optional[str] = Query(None)):
    query = {"prov_code": province} if province else {}
    docs = list(
        db.stations.find(query, {"_id": 0}).sort("name", 1)
    )
    return docs
