import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TopEntry } from '../api/client'

interface Props {
  data: TopEntry[]
  color?: string
}

const tickStyle = { fontSize: 11, fill: '#7b8496' }

export default function CategoryBarChart({ data, color = '#4f8dff' }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis type="number" tick={tickStyle} stroke="var(--chart-grid)" />
        <YAxis type="category" dataKey="label" width={160} tick={tickStyle} stroke="var(--chart-grid)" />
        <Tooltip
          cursor={{ fill: 'rgba(79, 141, 255, 0.08)' }}
          contentStyle={{ background: '#131a2b', border: '1px solid #2f3b52', borderRadius: 8, color: '#e7ecf5' }}
        />
        <Bar dataKey="crime_count" fill={color} name="Crime count" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
