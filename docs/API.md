# API Reference

Base URL in dev: `http://127.0.0.1:8000` (also proxied at `/api/*` through the
Vite dev server at `http://localhost:5173`).

The authoritative, always-current reference is FastAPI's auto-generated Swagger
UI, live at **`/docs`** (and ReDoc at `/redoc`) whenever the backend is running —
it reflects the real Pydantic response models in `backend/app/schemas.py`
directly from the code, so it can't drift out of date the way a hand-written
doc can. This page is a quick-glance summary.

| Method | Path | Purpose | Key params |
|---|---|---|---|
| GET | `/api/health` | Liveness check | - |
| GET | `/api/meta/provinces` | The 9 provinces, code + full name | - |
| GET | `/api/meta/categories` | All 44 crime categories with `kind`/`is_headline`/`parent_code` | - |
| GET | `/api/meta/stations` | Station list | `province` (optional) |
| GET | `/api/stats/summary` | KPI figures: total, prior-period total, YoY %, top 5 categories/stations | `province`, `station`, `category`, `year` (all optional) |
| GET | `/api/stats/trends` | Time series, monthly or yearly | `province`, `station`, `category`, `from`, `to` (YYYY-MM), `group_by` (`month`\|`year`) |
| GET | `/api/stats/compare-provinces` | Per-province totals for one category/year (choropleth values) | `category` (required), `year` (required) |
| GET | `/api/geo/provinces` | Dissolved province polygons, GeoJSON | - |
| GET | `/api/geo/stations` | Station polygons, GeoJSON | `province` (required — keeps payload small) |

## The `category` parameter

Pass a category `code` from `/api/meta/categories` (e.g. `"1"` for Murder,
`"Full 17"` for the official grand total, `"Cat 03"` for property-related
crime as a group). Omitting `category` on `/summary` or `/trends` does **not**
mean "sum every row" — it means "the 17 official headline categories only,"
matching SAPS's own `Full 17` total and avoiding the double-counting described
in [ARCHITECTURE.md](ARCHITECTURE.md). See `/api/meta/categories` for which
codes are breakdowns of another (`parent_code`) vs. standalone.

## Performance note

Requests scoped to one province and/or one year are fast (indexed, typically
under a second). A fully unfiltered `/api/stats/summary` or `/api/stats/trends`
call (no province, no year) aggregates a large share of the ~3.5M-document
collection and can take a few seconds — see the README's performance note.
