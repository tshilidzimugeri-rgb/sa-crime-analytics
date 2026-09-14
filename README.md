# SA Crime Analytics

A full-stack analytics app for exploring South African Police Service (SAPS) crime
statistics by province, police station, crime category, and time (2020-2025).

- **Frontend**: React + TypeScript (Vite), Recharts, MapLibre GL
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (denormalized documents, aggregation-pipeline queries)
- **Data**: [afrith/crime-stats](https://github.com/afrith/crime-stats) — a public-domain
  (PDDL v1.0) compilation of SAPS quarterly reports, joined with Census 2022 station
  metadata and police district boundaries. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together and
[docs/API.md](docs/API.md) for the API reference.

## Prerequisites

- Python 3.14 (this machine also has a 3.15 alpha installed — always invoke `py -3.14`
  explicitly, not bare `python`/`py`, or data-science packages won't have wheels)
- Node.js 18+ and npm
- Git with [Git LFS](https://git-lfs.github.com/) installed (`git lfs install`)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running
  locally on the default port (27017), plus [MongoDB Compass](https://www.mongodb.com/products/compass)
  (free GUI, optional but recommended for browsing the data — same role SSMS plays for SQL Server)

Full setup commands: [docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md).

## Quick start

```powershell
# 1. Fetch the source data (one-time, ~212MB download)
bash scripts/fetch_data.sh   # or scripts/fetch_data.ps1 on native PowerShell

# 2. Build the database (also one-time; re-run after any taxonomy change)
cd etl
..\backend\.venv\Scripts\python.exe inspect_source.py   # sanity-check real columns first
..\backend\.venv\Scripts\python.exe build_db.py
..\backend\.venv\Scripts\python.exe build_geo.py
cd ..

# 3. Run in dev mode (two terminals)
cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
# -> http://localhost:5173 (proxies /api to the backend)
```

## Single-command demo mode

Once the database is built, you can also serve the whole app from one FastAPI
process (built frontend served as static files):

```powershell
cd frontend && npm run build
cd ../backend && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# -> http://127.0.0.1:8000 serves the full app, no Vite dev server needed
```

## Project layout

```
docs/       architecture, data sources, API reference, Windows setup guide
etl/        one-time scripts that load the source CSVs/gpkg into MongoDB
backend/    FastAPI app (routers: meta, stats, geo)
frontend/   React + Vite app
scripts/    data download scripts
data/       gitignored — regenerated locally by scripts/fetch_data.* + etl/
```

## A note on performance

Most filtered queries (single province + category + year) return in well under a
second thanks to compound MongoDB indexes matching the API's actual query shapes.
The one exception is a fully unfiltered "all provinces, all years" aggregate,
which scans a large share of the ~3.5M-document collection to compute descriptive
labels (station/category names) and takes a few seconds — a real, expected
characteristic of an ad-hoc aggregate at this scale, not a bug. Per-year and
per-province views (the common case) are fast.
