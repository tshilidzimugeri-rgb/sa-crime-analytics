import { useNavigate } from 'react-router-dom'
import { useCompareProvinces, useGeoProvinces, useCategories } from '../api/client'
import { useFilters, HEADLINE_TOTAL_CATEGORY } from '../state/filters'
import ChoroplethMap from '../components/ChoroplethMap'
import FilterBar from '../components/FilterBar'

export default function MapExplorer() {
  const navigate = useNavigate()
  const { category, year } = useFilters()
  const { data: categories } = useCategories()
  const geoProvinces = useGeoProvinces()
  const compare = useCompareProvinces(category ?? HEADLINE_TOTAL_CATEGORY, year)

  const categoryName = categories?.find((c) => c.code === (category ?? HEADLINE_TOTAL_CATEGORY))?.name ?? 'Total crime'

  const valueByKey: Record<string, number> = {}
  compare.data?.totals.forEach((t) => {
    valueByKey[t.prov_code] = t.crime_count
  })

  return (
    <div className="page">
      <h1>Map Explorer</h1>
      <p className="subtitle">
        {categoryName} {year ? `- ${year}` : ''}
      </p>
      <FilterBar />
      <section className="panel">
        {geoProvinces.data && (
          <ChoroplethMap
            geojson={geoProvinces.data}
            valueByKey={valueByKey}
            keyProp="prov_code"
            onSelect={(code) => navigate(`/province/${code}`)}
            height={560}
          />
        )}
      </section>
    </div>
  )
}
