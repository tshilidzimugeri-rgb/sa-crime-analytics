import { useQueries } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useProvinces, useCategories, fetchTrends } from '../api/client'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#78716c']

export default function CategoryTrends() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { data: provinces } = useProvinces()
  const { data: categories } = useCategories()

  const categoryName = categories?.find((c) => c.code === code)?.name ?? code

  const queries = useQueries({
    queries: (provinces ?? []).map((p) => ({
      queryKey: ['trends', { province: p.prov_code, category: code, group_by: 'year' }],
      queryFn: () => fetchTrends({ province: p.prov_code, category: code, group_by: 'year' }),
      enabled: !!code,
    })),
  })

  const allYears = new Set<string>()
  queries.forEach((q) => q.data?.series.forEach((s) => allYears.add(s.period)))
  const years = Array.from(allYears).sort()

  const chartData = years.map((year) => {
    const row: Record<string, string | number> = { period: year }
    provinces?.forEach((p, i) => {
      const point = queries[i]?.data?.series.find((s) => s.period === year)
      row[p.prov_code] = point?.crime_count ?? 0
    })
    return row
  })

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate('/')}>
        &larr; Back to overview
      </button>
      <h1>{categoryName}</h1>
      <p className="subtitle">Yearly trend by province, 2020-2025.</p>

      <section className="panel">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7b8496' }} stroke="var(--chart-grid)" />
            <YAxis tick={{ fontSize: 11, fill: '#7b8496' }} width={50} stroke="var(--chart-grid)" />
            <Tooltip contentStyle={{ background: '#131a2b', border: '1px solid #2f3b52', borderRadius: 8, color: '#e7ecf5' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8b95a8' }} />
            {provinces?.map((p, i) => (
              <Line key={p.prov_code} type="monotone" dataKey={p.prov_code} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
