import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TrendPoint } from '../api/client'

interface Props {
  data: TrendPoint[]
  color?: string
}

export default function TrendLineChart({ data, color = '#2563eb' }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} minTickGap={20} />
        <YAxis tick={{ fontSize: 11 }} width={50} />
        <Tooltip />
        <Line type="monotone" dataKey="crime_count" stroke={color} strokeWidth={2} dot={false} name="Crime count" isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
