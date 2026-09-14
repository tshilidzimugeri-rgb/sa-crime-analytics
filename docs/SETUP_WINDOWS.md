# Windows Setup

Exact commands used to build this project, for reference or rebuilding from
scratch. Assumes PowerShell.

## 1. Prerequisites

```powershell
winget install MongoDB.Server         # if not already installed
winget install MongoDB.Compass.Full   # free GUI, browses the sa_crime database
Get-Service MongoDB                   # confirm it's running (starts automatically as a service)
```

If `winget install MongoDB.Server` is unavailable or blocked, download the
free MSI installer directly from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).

Also required: [Git LFS](https://git-lfs.github.com/) (`git lfs install`, once
per machine) and Node.js.

**Python version note**: if this machine has more than one Python installed,
check with `py -0`. Always create the venv with an explicit, known-good
version (e.g. `py -3.14`) rather than bare `python`/`py` — a newer
alpha/pre-release Python may be the default and lack compiled wheels for
`geopandas`/`pyogrio`/`shapely`.

## 2. Project scaffold

```powershell
New-Item -ItemType Directory -Force C:\Users\<you>\projects\sa-crime-analytics
Set-Location C:\Users\<you>\projects\sa-crime-analytics
git init
git lfs install

py -3.14 -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r backend\requirements.txt

npm create vite@latest frontend -- --template react-ts
cd frontend; npm install; cd ..
```

## 3. Data acquisition and ETL

```powershell
# Downloads ~212MB via git-lfs, verifies the known SHA256, copies into data/raw/
bash scripts/fetch_data.sh   # or write/run scripts/fetch_data.ps1 equivalently

cd etl
..\backend\.venv\Scripts\python.exe inspect_source.py   # confirm real columns first
..\backend\.venv\Scripts\python.exe build_db.py          # loads MongoDB (a few minutes for ~3.5M rows)
..\backend\.venv\Scripts\python.exe build_geo.py
cd ..
```

## 4. Run

```powershell
# Terminal 1
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Verifying the database directly

MongoDB Compass: connect to `mongodb://localhost:27017`, open the `sa_crime`
database. Expect collections `stations` (1,167 docs), `categories` (44 docs),
`crime_monthly` (~3.5M docs), `geo_provinces` (9 docs), `geo_stations` (1,167 docs).

Or from the command line:
```powershell
backend\.venv\Scripts\python.exe -c "from pymongo import MongoClient; db=MongoClient().sa_crime; print(db.stations.count_documents({}), db.crime_monthly.count_documents({}))"
```
