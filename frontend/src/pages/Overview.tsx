import { useNavigate } from 'react-router-dom'
import { useSummary, useTrends, useCompareProvinces, useGeoProvinces } from '../api/client'
import { useFilters, HEADLINE_TOTAL_CATEGORY } from '../state/filters'
import KpiTile from '../components/KpiTile'
import TrendLineChart from '../components/TrendLineChart'
import CategoryBarChart from '../components/CategoryBarChart'
import ChoroplethMap from '../components/ChoroplethMap'
import DataTable from '../components/DataTable'

export default function Overview() {
  const navigate = useNavigate()
  const { province, category, year } = useFilters()

  const summary = useSummary({ province, category, year })
  const trends = useTrends({ province, category, group_by: 'month' })
  const compare = useCompareProvinces(category ?? HEADLINE_TOTAL_CATEGORY, year)
  const geoProvinces = useGeoProvinces()

  const valueByKey: Record<string, number> = {}
  compare.data?.totals.forEach((t) => {
    valueByKey[t.prov_code] = t.crime_count
  })

  return (
    <div className="page">
      <h1>National Overview</h1>
      <p className="subtitle">South African crime trends, {year ?? '2020-2025'}. Source: SAPS quarterly reports.</p>

      <div className="kpi-row">
        <KpiTile label="Total crime count" value={summary.data?.total ?? '...'} delta={summary.data?.yoy_pct_change} />
        <KpiTile label="Prior year total" value={summary.data?.prior_period_total ?? '...'} />
        <KpiTile label="Provinces reporting" value={9} />
      </div>

      <section className="panel">
        <h2>Monthly trend (full history)</h2>
        {trends.data && <TrendLineChart data={trends.data.series} />}
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Crime by province {year ? `(${year})` : ''}</h2>
          {geoProvinces.data && (
            <ChoroplethMap
              geojson={geoProvinces.data}
              valueByKey={valueByKey}
              keyProp="prov_code"
              onSelect={(code) => navigate(`/province/${code}`)}
            />
          )}
          <p className="hint">Click a province to drill down.</p>
        </section>

        <section className="panel">
          <h2>Top categories {year ? `(${year})` : ''}</h2>
          {summary.data && <CategoryBarChart data={summary.data.top_categories} />}
        </section>
      </div>

      <section className="panel">
        <h2>Top stations by crime count {year ? `(${year})` : ''}</h2>
        {summary.data && (
          <DataTable
            keyField="key"
            columns={[
              { key: 'label', label: 'Station' },
              { key: 'crime_count', label: 'Crime count', align: 'right' },
            ]}
            rows={summary.data.top_stations}
          />
        )}
      </section>
    </div>
  )
}
