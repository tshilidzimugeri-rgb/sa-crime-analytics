import { useNavigate, useParams } from 'react-router-dom'
import { useSummary, useTrends, useStations, useGeoStations } from '../api/client'
import { useFilters } from '../state/filters'
import KpiTile from '../components/KpiTile'
import TrendLineChart from '../components/TrendLineChart'
import CategoryBarChart from '../components/CategoryBarChart'
import ChoroplethMap from '../components/ChoroplethMap'
import DataTable from '../components/DataTable'

export default function ProvinceDetail() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { category, year } = useFilters()

  const summary = useSummary({ province: code, category, year })
  const trends = useTrends({ province: code, category, group_by: 'month' })
  const stations = useStations(code)
  const geoStations = useGeoStations(code)

  const emptyValues: Record<string, number> = {}

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate('/')}>
        &larr; Back to overview
      </button>
      <h1>{code}</h1>
      <p className="subtitle">{stations.data?.length ?? '...'} police stations in this province.</p>

      <div className="kpi-row">
        <KpiTile label="Total crime count" value={summary.data?.total ?? '...'} delta={summary.data?.yoy_pct_change} />
        <KpiTile label="Prior year total" value={summary.data?.prior_period_total ?? '...'} />
        <KpiTile label="Stations" value={stations.data?.length ?? '...'} />
      </div>

      <section className="panel">
        <h2>Monthly trend</h2>
        {trends.data && <TrendLineChart data={trends.data.series} />}
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Station boundaries</h2>
          {geoStations.data && (
            <ChoroplethMap
              geojson={geoStations.data}
              valueByKey={emptyValues}
              keyProp="code"
              onSelect={(stationCode) => navigate(`/station/${stationCode}`)}
              height={340}
              fitToData
            />
          )}
          <p className="hint">Click a station for its detail page.</p>
        </section>

        <section className="panel">
          <h2>Top categories</h2>
          {summary.data && <CategoryBarChart data={summary.data.top_categories} />}
        </section>
      </div>

      <section className="panel">
        <h2>Top stations by crime count</h2>
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
