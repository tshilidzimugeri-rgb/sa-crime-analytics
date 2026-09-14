import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TopEntry } from '../api/client'

interface Props {
  data: TopEntry[]
  color?: string
}

export default function CategoryBarChart({ data, color = '#0ea5e9' }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="crime_count" fill={color} name="Crime count" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
