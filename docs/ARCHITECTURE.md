# Architecture

## Data flow

```
afrith/crime-stats (GitHub, Git LFS)
        |  scripts/fetch_data.ps1|.sh  (git clone + git lfs pull, SHA256-verified)
        v
data/raw/  (crime-stats.csv, police_stations.csv, police_stations.gpkg)
        |  etl/inspect_source.py  (verify real columns before trusting anything)
        |  etl/build_db.py        (-> MongoDB: stations, categories, crime_monthly)
        |  etl/build_geo.py       (-> MongoDB: geo_provinces, geo_stations)
        v
MongoDB (sa_crime database, local)
        |  pymongo, aggregation pipelines
        v
FastAPI backend (backend/app)
        |  JSON over HTTP (/api/meta, /api/stats, /api/geo)
        v
React frontend (frontend/src)
```

The GitHub source is a static historical dataset (SAPS quarterly reports through
Sep 2025), not a live API, so it's fetched once and loaded into a local database.
The dashboard never talks to GitHub at runtime.

## Why MongoDB, and why denormalized

The database choice was a deliberate departure from a normalized relational
design most similar structured, heavily-joined datasets would use. MongoDB was
picked because the project owner (a student) already wanted practice with it,
and it is genuinely usable here via its aggregation pipeline. To make that
pipeline fast without `$lookup` joins, each `crime_monthly` document carries its
station name, province code, and category name inline (denormalized) rather
than just foreign keys:

```js
{
  station_code: "PD199043", station_name: "Cape Town Central", prov_code: "WC",
  crime_code: "1", crime_name: "Murder", is_headline: true,
  year: 2024, month: 3, crime_count: 17
}
```

This means every dashboard query is a single `$match` + `$group` stage over one
collection — no cross-collection joins on the hot path. The tradeoff (standard
for denormalized designs): if `etl/category_taxonomy.json` is ever corrected,
`etl/build_db.py` must be re-run from scratch so the denormalized fields stay
consistent — there's no in-place patch path.

## The double-counting problem (and how it's solved)

SAPS's own published crime-stats.csv includes **both** granular categories and
several pre-computed rollups as separate rows for the same station/month:

- `4` "Robbery with aggravating circumstances" **and** its breakdown children
  (`34` Carjacking, `35` Truck hijacking, `36` Robbery of cash in transit,
  `37` Bank robbery, `38`/`42` Robbery at residential/non-residential premises)
- `A 01` "Sexual Offences" **and** its children (`9` Rape, `12` Sexual assault,
  `47` Attempted sexual offences, `48` Contact sexual offences, `49` Sexual
  offences detected by police action)
- `Cat 01`-`Cat 05` and `Full 17`, SAPS's own category-group and grand-total
  rollups, each summing several other rows

Naively summing "every row for a station/month" therefore multiply-counts the
same incidents. `etl/category_taxonomy.json` classifies every one of the 44
real category codes (verified against the full downloaded dataset, not
guessed) by `kind` (`headline` / `breakdown` / `rollup` / `other` /
`police_detected`) and an `is_headline` flag marking exactly the 17 official
community-reported serious crime categories. The API's rule
(`backend/app/routers/stats.py::build_base_match`):

- A specific category is requested -> match that exact code, whatever kind it is.
- No category is requested ("total crime") -> match `is_headline: true` only,
  which is exactly the 17 categories that sum to SAPS's own `Full 17` total.

## Backend query performance

A lone `(year, month)` index was not selective enough for the API's actual
query shapes (equality on category/province plus a year range) — MongoDB fell
back to scanning the whole `crime_monthly` collection (33s for one query,
confirmed via `.explain()` during development). The fix was compound indexes
that lead with the equality fields actually used
(`crime_code`/`is_headline` + `prov_code`/`station_code` + `year` + `month`,
some also including `crime_count` so aggregate sums can be answered from the
index alone without fetching full documents). See the indexes created in
`etl/build_db.py` and the comment there for the measured before/after.

An `$expr` predicate used for precise month-level range trimming similarly
defeated index-only scans (forced a document FETCH even when every other field
was covered) — replaced with a plain `year` range in the query plus exact
month-level trimming done in Python after the aggregation groups by month.

## Known limitation: choropleth map doesn't render in production builds

The map works correctly in `npm run dev`, but in a real production build
(`npm run build` + `vite preview`, and the same on the deployed Netlify site)
the choropleth panels render as an empty dark rectangle with no country
shapes or colors.

Diagnosed, not guessed: every network request succeeds (style.json, sprite,
tiles.json, and the worker script all return 200), and `map.getContainer()`
reports the correct size -- but `map.isStyleLoaded()` stays `false`
indefinitely and no `error` event ever fires. This points to MapLibre GL's
main-thread/worker "actor" message-passing protocol breaking silently once
its code is bundled into the production chunk graph alongside the rest of
the app, rather than any problem with our map setup, the CARTO style, or the
data. `src/components/ChoroplethMap.tsx` already works around one real,
confirmed instance of this class of bug (the worker's own script 404ing
under Rollup, fixed via the `?url` import + `setWorkerUrl()`), but a second,
deeper instance of the same underlying issue remains unresolved. Forcing
`maplibre-gl` into its own Rollup chunk (`manualChunks`) was tried and did
not fix it either.

Everything else in the app (all pages, all filters, all charts, all data) is
unaffected and confirmed correct in production builds -- this is isolated to
the map's tile rendering specifically. If revisiting this, worthwhile next
steps: try `maplibre-gl`'s CSP-safe worker build variant, or an older
`maplibre-gl` major version, to narrow down whether this is a regression in
6.x specifically.

## Folder guide

| Path | Purpose |
|---|---|
| `etl/` | One-time/rerunnable scripts: inspect source, build MongoDB collections, build geo collections |
| `backend/app/routers/meta.py` | Provinces, categories, stations lookups |
| `backend/app/routers/stats.py` | Trends, summary, province comparison — the aggregation-pipeline logic |
| `backend/app/routers/geo.py` | GeoJSON for the choropleth map |
| `frontend/src/api/client.ts` | Typed fetch wrappers + React Query hooks |
| `frontend/src/state/filters.ts` | Global filter state (province/category/year) shared across pages |
| `frontend/src/components/ChoroplethMap.tsx` | MapLibre GL wrapper, colors polygons by a value lookup |
