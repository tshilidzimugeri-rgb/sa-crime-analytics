import { useQuery } from '@tanstack/react-query'

export interface Province {
  prov_code: string
  name: string
}

export interface Category {
  code: string
  name: string
  kind: 'headline' | 'breakdown' | 'other' | 'police_detected' | 'rollup'
  is_headline: boolean
  parent_code: string | null
}

export interface Station {
  code: string
  name: string
  prov_code: string
  population: number
  area_km2: number
}

export interface TrendPoint {
  period: string
  crime_count: number
}

export interface TrendsResponse {
  filters: Record<string, unknown>
  series: TrendPoint[]
}

export interface ProvinceTotal {
  prov_code: string
  crime_count: number
}

export interface CompareProvincesResponse {
  filters: Record<string, unknown>
  totals: ProvinceTotal[]
}

export interface TopEntry {
  key: string
  label: string
  crime_count: number
  [key: string]: unknown
}

export interface SummaryResponse {
  filters: Record<string, unknown>
  total: number
  prior_period_total: number
  yoy_pct_change: number | null
  top_categories: TopEntry[]
  top_stations: TopEntry[]
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: unknown
    properties: Record<string, unknown>
  }>
}

// --- Static data source ---------------------------------------------------
// This app ships as a pure static site (no backend, no database). The
// source data is fixed historical SAPS reporting (2020-2025) that will never
// change, so etl/export_static.py precomputes two compact fact tables that
// can answer every filter combination the UI needs, entirely client-side:
//   factsA: [prov_code, crime_code, year, month, crime_count]  (province x category x month)
//   factsB: [station_code, crime_code, year, crime_count]      (station x category x year, no month --
//     the UI only ever shows yearly granularity at station scope)
// See docs/ARCHITECTURE.md for why this two-table design covers 100% of the
// original REST API's functionality without a live aggregation backend.

type FactA = [string, string, number, number, number]
type FactB = [string, string, number, number]

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

let _provinces: Promise<Province[]> | null = null
const loadProvinces = () => (_provinces ??= fetchJSON<Province[]>('/data/provinces.json'))

let _categories: Promise<Category[]> | null = null
const loadCategories = () => (_categories ??= fetchJSON<Category[]>('/data/categories.json'))

let _stations: Promise<Station[]> | null = null
const loadStations = () => (_stations ??= fetchJSON<Station[]>('/data/stations.json'))

let _factsA: Promise<FactA[]> | null = null
const loadFactsA = () => (_factsA ??= fetchJSON<FactA[]>('/data/facts_province_category_month.json'))

let _factsB: Promise<FactB[]> | null = null
const loadFactsB = () => (_factsB ??= fetchJSON<FactB[]>('/data/facts_station_category_year.json'))

let _geoProvinces: Promise<GeoFeatureCollection> | null = null
const loadGeoProvinces = () => (_geoProvinces ??= fetchJSON<GeoFeatureCollection>('/data/geo_provinces.json'))

const _geoStationsCache = new Map<string, Promise<GeoFeatureCollection>>()
function loadGeoStations(province: string): Promise<GeoFeatureCollection> {
  let p = _geoStationsCache.get(province)
  if (!p) {
    p = fetchJSON<GeoFeatureCollection>(`/data/geo_stations/${province}.json`)
    _geoStationsCache.set(province, p)
  }
  return p
}

async function isHeadlineLookup(): Promise<(code: string) => boolean> {
  const categories = await loadCategories()
  const map = new Map(categories.map((c) => [c.code, c.is_headline]))
  return (code: string) => map.get(code) ?? false
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function topN(totals: Map<string, number>, n: number): Array<[string, number]> {
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

// --- Computed queries -------------------------------------------------------

async function computeSummary(params: { province?: string | null; station?: string | null; category?: string | null; year?: number | null }): Promise<SummaryResponse> {
  const { province, station, category, year } = params
  const [categories, stations, isHeadline] = await Promise.all([loadCategories(), loadStations(), isHeadlineLookup()])
  const catName = (code: string) => categories.find((c) => c.code === code)?.name ?? code
  const catMatch = (code: string) => (category ? code === category : isHeadline(code))

  if (station) {
    const factsB = await loadFactsB()
    const inScope = factsB.filter((r) => r[0] === station && catMatch(r[1]))
    const total = inScope.filter((r) => year == null || r[2] === year).reduce((s, r) => s + r[3], 0)
    const prior = year != null ? inScope.filter((r) => r[2] === year - 1).reduce((s, r) => s + r[3], 0) : 0
    const yoy = year != null && prior ? round1(((total - prior) / prior) * 100) : null

    const catTotals = new Map<string, number>()
    for (const r of inScope) {
      if (year == null || r[2] === year) catTotals.set(r[1], (catTotals.get(r[1]) ?? 0) + r[3])
    }
    const stationMeta = stations.find((s) => s.code === station)

    return {
      filters: { province: null, station, category: category ?? null, year: year ?? null },
      total,
      prior_period_total: prior,
      yoy_pct_change: yoy,
      top_categories: topN(catTotals, 5).map(([code, n]) => ({ key: code, label: catName(code), crime_count: n })),
      top_stations: total > 0 ? [{ key: station, label: stationMeta?.name ?? station, crime_count: total }] : [],
    }
  }

  const factsA = await loadFactsA()
  const inScope = factsA.filter((r) => (province ? r[0] === province : true) && catMatch(r[1]))
  const total = inScope.filter((r) => year == null || r[2] === year).reduce((s, r) => s + r[4], 0)
  const prior = year != null ? inScope.filter((r) => r[2] === year - 1).reduce((s, r) => s + r[4], 0) : 0
  const yoy = year != null && prior ? round1(((total - prior) / prior) * 100) : null

  const catTotals = new Map<string, number>()
  for (const r of inScope) {
    if (year == null || r[2] === year) catTotals.set(r[1], (catTotals.get(r[1]) ?? 0) + r[4])
  }

  const factsB = await loadFactsB()
  const stationProv = new Map(stations.map((s) => [s.code, s.prov_code]))
  const stTotals = new Map<string, number>()
  for (const r of factsB) {
    if (!catMatch(r[1])) continue
    if (province && stationProv.get(r[0]) !== province) continue
    if (year != null && r[2] !== year) continue
    stTotals.set(r[0], (stTotals.get(r[0]) ?? 0) + r[3])
  }
  const stationName = (code: string) => stations.find((s) => s.code === code)?.name ?? code

  return {
    filters: { province: province ?? null, category: category ?? null, year: year ?? null },
    total,
    prior_period_total: prior,
    yoy_pct_change: yoy,
    top_categories: topN(catTotals, 5).map(([code, n]) => ({ key: code, label: catName(code), crime_count: n })),
    top_stations: topN(stTotals, 5).map(([code, n]) => ({ key: code, label: stationName(code), crime_count: n })),
  }
}

async function computeTrends(params: {
  province?: string | null
  station?: string | null
  category?: string | null
  from?: string
  to?: string
  group_by?: 'month' | 'year'
}): Promise<TrendsResponse> {
  const { province, station, category, from = '2020-01', to = '2025-09', group_by = 'month' } = params
  const isHeadline = await isHeadlineLookup()
  const catMatch = (code: string) => (category ? code === category : isHeadline(code))

  if (station) {
    const factsB = await loadFactsB()
    const byYear = new Map<number, number>()
    for (const r of factsB) {
      if (r[0] === station && catMatch(r[1])) byYear.set(r[2], (byYear.get(r[2]) ?? 0) + r[3])
    }
    const series = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, n]) => ({ period: String(y), crime_count: n }))
    return { filters: { province: null, station, category: category ?? null, from, to, group_by: 'year' }, series }
  }

  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  const fromVal = fy * 12 + fm
  const toVal = ty * 12 + tm

  const factsA = await loadFactsA()
  const byMonth = new Map<string, number>()
  for (const r of factsA) {
    if (province && r[0] !== province) continue
    if (!catMatch(r[1])) continue
    const val = r[2] * 12 + r[3]
    if (val < fromVal || val > toVal) continue
    const key = `${r[2]}-${r[3]}`
    byMonth.set(key, (byMonth.get(key) ?? 0) + r[4])
  }

  let series: TrendPoint[]
  if (group_by === 'year') {
    const byYear = new Map<number, number>()
    for (const [key, n] of byMonth) {
      const y = Number(key.split('-')[0])
      byYear.set(y, (byYear.get(y) ?? 0) + n)
    }
    series = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, n]) => ({ period: String(y), crime_count: n }))
  } else {
    series = [...byMonth.entries()]
      .map(([key, n]) => {
        const [y, m] = key.split('-').map(Number)
        return { y, m, n }
      })
      .sort((a, b) => a.y - b.y || a.m - b.m)
      .map(({ y, m, n }) => ({ period: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`, crime_count: n }))
  }

  return { filters: { province: province ?? null, station: null, category: category ?? null, from, to, group_by }, series }
}

async function computeCompareProvinces(category: string, year: number): Promise<CompareProvincesResponse> {
  const factsA = await loadFactsA()
  const totals = new Map<string, number>()
  for (const r of factsA) {
    if (r[1] === category && r[2] === year) totals.set(r[0], (totals.get(r[0]) ?? 0) + r[4])
  }
  const list = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([prov_code, crime_count]) => ({ prov_code, crime_count }))
  return { filters: { category, year }, totals: list }
}

// --- Public hooks (unchanged signatures -- pages don't need to change) ----

export function useProvinces() {
  return useQuery({ queryKey: ['provinces'], queryFn: loadProvinces })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: loadCategories })
}

export function useStations(province?: string | null) {
  return useQuery({
    queryKey: ['stations', province],
    queryFn: async () => {
      const stations = await loadStations()
      return province ? stations.filter((s) => s.prov_code === province) : stations
    },
  })
}

export function useSummary(params: { province?: string | null; station?: string | null; category?: string | null; year?: number | null }) {
  return useQuery({ queryKey: ['summary', params], queryFn: () => computeSummary(params) })
}

// Exported for callers that need to fan out multiple trend queries at once
// (e.g. CategoryTrends comparing all 9 provinces) via useQueries rather than
// this hook.
export const fetchTrends = computeTrends

export function useTrends(params: {
  province?: string | null
  station?: string | null
  category?: string | null
  from?: string
  to?: string
  group_by?: 'month' | 'year'
}) {
  return useQuery({ queryKey: ['trends', params], queryFn: () => computeTrends(params) })
}

export function useCompareProvinces(category: string | null | undefined, year: number | null | undefined) {
  return useQuery({
    queryKey: ['compare-provinces', category, year],
    enabled: !!category && !!year,
    queryFn: () => computeCompareProvinces(category as string, year as number),
  })
}

export function useGeoProvinces() {
  return useQuery({ queryKey: ['geo-provinces'], queryFn: loadGeoProvinces })
}

export function useGeoStations(province?: string | null) {
  return useQuery({
    queryKey: ['geo-stations', province],
    enabled: !!province,
    queryFn: () => loadGeoStations(province as string),
  })
}
