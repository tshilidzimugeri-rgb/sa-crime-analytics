from typing import Optional
from pydantic import BaseModel


class Province(BaseModel):
    prov_code: str
    name: str


class Category(BaseModel):
    code: str
    name: str
    kind: str
    is_headline: bool
    parent_code: Optional[str] = None


class Station(BaseModel):
    code: str
    name: str
    prov_code: str
    population: int
    area_km2: float


class TrendPoint(BaseModel):
    period: str
    crime_count: int


class TrendsResponse(BaseModel):
    filters: dict
    series: list[TrendPoint]


class ProvinceTotal(BaseModel):
    prov_code: str
    crime_count: int


class CompareProvincesResponse(BaseModel):
    filters: dict
    totals: list[ProvinceTotal]


class TopEntry(BaseModel):
    key: str
    label: str
    crime_count: int


class SummaryResponse(BaseModel):
    filters: dict
    total: int
    prior_period_total: int
    yoy_pct_change: Optional[float]
    top_categories: list[TopEntry]
    top_stations: list[TopEntry]
