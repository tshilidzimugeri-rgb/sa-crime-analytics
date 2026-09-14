import { useProvinces, useCategories } from '../api/client'
import { useFilters, AVAILABLE_YEARS, HEADLINE_TOTAL_CATEGORY } from '../state/filters'

export default function FilterBar() {
  const { data: provinces } = useProvinces()
  const { data: categories } = useCategories()
  const { province, category, year, setProvince, setCategory, setYear } = useFilters()

  return (
    <div className="filter-bar">
      <label>
        Province
        <select value={province ?? ''} onChange={(e) => setProvince(e.target.value || null)}>
          <option value="">All provinces</option>
          {provinces?.map((p) => (
            <option key={p.prov_code} value={p.prov_code}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Category
        <select value={category ?? ''} onChange={(e) => setCategory(e.target.value || null)}>
          <option value="">Total crime ({HEADLINE_TOTAL_CATEGORY})</option>
          {categories
            ?.filter((c) => c.kind !== 'breakdown')
            .map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
        </select>
      </label>

      <label>
        Year
        <select value={year ?? ''} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}>
          <option value="">All years</option>
          {AVAILABLE_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
