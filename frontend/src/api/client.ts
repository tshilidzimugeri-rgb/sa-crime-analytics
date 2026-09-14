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

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const usable = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (usable.length === 0) return ''
  return '?' + usable.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
}

export function useProvinces() {
  return useQuery({ queryKey: ['provinces'], queryFn: () => getJSON<Province[]>('/api/meta/provinces') })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => getJSON<Category[]>('/api/meta/categories') })
}

export function useStations(province?: string | null) {
  return useQuery({
    queryKey: ['stations', province],
    queryFn: () => getJSON<Station[]>(`/api/meta/stations${qs({ province })}`),
  })
}

export function useSummary(params: { province?: string | null; station?: string | null; category?: string | null; year?: number | null }) {
  return useQuery({
    queryKey: ['summary', params],
    queryFn: () => getJSON<SummaryResponse>(`/api/stats/summary${qs(params)}`),
  })
}

export function useTrends(params: {
  province?: string | null
  station?: string | null
  category?: string | null
  from?: string
  to?: string
  group_by?: 'month' | 'year'
}) {
  return useQuery({
    queryKey: ['trends', params],
    queryFn: () => getJSON<TrendsResponse>(`/api/stats/trends${qs(params)}`),
  })
}

export function useCompareProvinces(category: string | null | undefined, year: number | null | undefined) {
  return useQuery({
    queryKey: ['compare-provinces', category, year],
    enabled: !!category && !!year,
    queryFn: () => getJSON<CompareProvincesResponse>(`/api/stats/compare-provinces${qs({ category, year })}`),
  })
}

export function useGeoProvinces() {
  return useQuery({ queryKey: ['geo-provinces'], queryFn: () => getJSON<GeoFeatureCollection>('/api/geo/provinces') })
}

export function useGeoStations(province?: string | null) {
  return useQuery({
    queryKey: ['geo-stations', province],
    enabled: !!province,
    queryFn: () => getJSON<GeoFeatureCollection>(`/api/geo/stations${qs({ province })}`),
  })
}
