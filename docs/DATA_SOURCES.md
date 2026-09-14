# Data Sources

## Primary source

**[afrith/crime-stats](https://github.com/afrith/crime-stats)** — a public-domain
compilation of South African Police Service (SAPS) quarterly crime reports,
Census 2022 station population/area data, and police district boundaries.

- **License**: [Open Data Commons Public Domain Dedication and License (PDDL) v1.0](https://opendatacommons.org/licenses/pddl/1-0/).
  The underlying SAPS/StatsSA source data carries no explicit license per the
  compiler's own documentation.
- **Coverage**: January 2020 - September 2025, all 1,167 police stations across
  South Africa's 9 provinces.
- **Files used**: `crime-stats.csv` (crime counts by station/category/month, Git LFS,
  ~212MB), `police_stations.csv` (station metadata), `police_stations.gpkg`
  (station boundary polygons, Git LFS).

## Known caveats (inherited from the source, not introduced by this app)

**Station renames.** Several stations were renamed during the reporting period
(e.g. Cradock -> Nxuba, Grahamstown -> Makhanda in the Eastern Cape). The source
repository already normalizes these to current names throughout, so this app's
station-level trends do not break across a rename — no reconciliation logic was
needed here.

**New stations without boundary data.** Two stations established during the
period — Phaudi (Limpopo, Jan 2025) and Majola (Eastern Cape, Feb 2025) — have
no official boundary polygon yet. Their incidents are folded into their parent
districts in the source data, so they won't appear as separate shapes on the map.

**Category double-counting.** SAPS's own published statistics include both
granular crime categories and several pre-computed rollups (category-group
subtotals and a grand total) as separate rows for the same station/month. See
[ARCHITECTURE.md](ARCHITECTURE.md#the-double-counting-problem-and-how-its-solved)
for how this app avoids multiply-counting the same incidents. In short: when no
specific category is selected, "total crime" figures are restricted to the 17
official headline categories (`is_headline: true` in `etl/category_taxonomy.json`),
never a raw sum of every row.

## Attribution

Data compiled from South African Police Service (SAPS) quarterly crime
statistics and Statistics South Africa (StatsSA) Census 2022, via
[afrith/crime-stats](https://github.com/afrith/crime-stats), used here under the
PDDL v1.0 public domain dedication.
