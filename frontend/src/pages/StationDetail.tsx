import { useNavigate, useParams } from 'react-router-dom'
import { useStations, useSummary, useTrends } from '../api/client'
import { useFilters } from '../state/filters'
import KpiTile from '../components/KpiTile'
import TrendLineChart from '../components/TrendLineChart'
import CategoryBarChart from '../components/CategoryBarChart'

export default function StationDetail() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { category, year } = useFilters()

  const { data: allStations } = useStations(null)
  const station = allStations?.find((s) => s.code === code)

  const summary = useSummary({ station: code, category, year })
  const trends = useTrends({ station: code, category, group_by: 'year' })

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate(-1 as unknown as string)}>
        &larr; Back
      </button>
      <h1>{station?.name ?? code}</h1>
      {station && (
        <p className="subtitle">
          {station.prov_code} &middot; population {station.population.toLocaleString()} &middot; {station.area_km2.toLocaleString()} km&sup2;
        </p>
      )}

      <div className="kpi-row">
        <KpiTile label="Total crime count" value={summary.data?.total ?? '...'} delta={summary.data?.yoy_pct_change} />
        <KpiTile label="Prior year total" value={summary.data?.prior_period_total ?? '...'} />
      </div>

      <section className="panel">
        <h2>Yearly trend</h2>
        {trends.data && <TrendLineChart data={trends.data.series} />}
      </section>

      <section className="panel">
        <h2>Top categories at this station</h2>
        {summary.data && <CategoryBarChart data={summary.data.top_categories} />}
      </section>
    </div>
  )
}
