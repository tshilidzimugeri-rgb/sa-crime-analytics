from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.db import db

router = APIRouter(prefix="/api/stats", tags=["stats"])

DEFAULT_FROM = "2020-01"
DEFAULT_TO = "2025-09"


def parse_period(s: str) -> tuple[int, int]:
    try:
        y, m = s.split("-")
        return int(y), int(m)
    except Exception:
        raise HTTPException(400, f"Invalid period '{s}', expected YYYY-MM")


def ym_range_match(frm: str, to: str) -> dict:
    """Plain year range only (no $expr) so this stays a covered index scan --
    an $expr predicate on (year, month) forced a FETCH of every document even
    when the equality+range fields were otherwise fully indexed, which is what
    made the unfiltered national trend query take ~12s. Precise month-level
    trimming happens in Python after grouping instead."""
    fy, _ = parse_period(frm)
    ty, _ = parse_period(to)
    return {"year": {"$gte": fy, "$lte": ty}}


def build_base_match(province: Optional[str], station: Optional[str], category: Optional[str]) -> dict:
    """category given -> match that exact code (any kind). Otherwise restrict to
    is_headline categories so an 'all crime' total doesn't double-count SAPS's
    own breakdown/rollup rows."""
    match: dict = {}
    if province:
        match["prov_code"] = province
    if station:
        match["station_code"] = station
    if category:
        match["crime_code"] = category
    else:
        match["is_headline"] = True
    return match


@router.get("/trends")
def trends(
    province: Optional[str] = None,
    station: Optional[str] = None,
    category: Optional[str] = None,
    frm: str = Query(DEFAULT_FROM, alias="from"),
    to: str = Query(DEFAULT_TO),
    group_by: str = Query("month", pattern="^(month|year)$"),
):
    match = build_base_match(province, station, category)
    match.update(ym_range_match(frm, to))

    fy, fm = parse_period(frm)
    ty, tm = parse_period(to)
    from_val, to_val = fy * 12 + fm, ty * 12 + tm

    pipeline = [
        {"$match": match},
        {"$group": {"_id": {"y": "$year", "m": "$month"}, "crime_count": {"$sum": "$crime_count"}}},
        {"$sort": {"_id.y": 1, "_id.m": 1}},
    ]
    rows = list(db.crime_monthly.aggregate(pipeline))
    rows = [r for r in rows if from_val <= r["_id"]["y"] * 12 + r["_id"]["m"] <= to_val]

    if group_by == "year":
        yearly: dict[int, int] = {}
        for r in rows:
            yearly[r["_id"]["y"]] = yearly.get(r["_id"]["y"], 0) + r["crime_count"]
        series = [{"period": f"{y:04d}", "crime_count": c} for y, c in sorted(yearly.items())]
    else:
        series = [{"period": f"{r['_id']['y']:04d}-{r['_id']['m']:02d}", "crime_count": r["crime_count"]} for r in rows]

    return {
        "filters": {"province": province, "station": station, "category": category, "from": frm, "to": to, "group_by": group_by},
        "series": series,
    }


@router.get("/compare-provinces")
def compare_provinces(category: str, year: int):
    match = {"crime_code": category, "year": year}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$prov_code", "crime_count": {"$sum": "$crime_count"}}},
        {"$sort": {"crime_count": -1}},
    ]
    rows = list(db.crime_monthly.aggregate(pipeline))
    return {
        "filters": {"category": category, "year": year},
        "totals": [{"prov_code": r["_id"], "crime_count": r["crime_count"]} for r in rows],
    }


@router.get("/summary")
def summary(province: Optional[str] = None, station: Optional[str] = None, category: Optional[str] = None, year: Optional[int] = None):
    base = build_base_match(province, station, category)

    def total_for(y: Optional[int]) -> int:
        m = dict(base)
        if y is not None:
            m["year"] = y
        result = list(db.crime_monthly.aggregate([{"$match": m}, {"$group": {"_id": None, "t": {"$sum": "$crime_count"}}}]))
        return result[0]["t"] if result else 0

    total = total_for(year)
    prior_total = total_for(year - 1) if year is not None else 0
    yoy = round((total - prior_total) / prior_total * 100, 1) if year is not None and prior_total else None

    period_match = dict(base)
    if year is not None:
        period_match["year"] = year

    top_categories = list(db.crime_monthly.aggregate([
        {"$match": period_match},
        {"$group": {"_id": {"code": "$crime_code", "name": "$crime_name"}, "crime_count": {"$sum": "$crime_count"}}},
        {"$sort": {"crime_count": -1}},
        {"$limit": 5},
    ]))
    top_stations = list(db.crime_monthly.aggregate([
        {"$match": period_match},
        {"$group": {"_id": {"code": "$station_code", "name": "$station_name"}, "crime_count": {"$sum": "$crime_count"}}},
        {"$sort": {"crime_count": -1}},
        {"$limit": 5},
    ]))

    return {
        "filters": {"province": province, "station": station, "category": category, "year": year},
        "total": total,
        "prior_period_total": prior_total,
        "yoy_pct_change": yoy,
        "top_categories": [{"key": c["_id"]["code"], "label": c["_id"]["name"], "crime_count": c["crime_count"]} for c in top_categories],
        "top_stations": [{"key": s["_id"]["code"], "label": s["_id"]["name"], "crime_count": s["crime_count"]} for s in top_stations],
    }
