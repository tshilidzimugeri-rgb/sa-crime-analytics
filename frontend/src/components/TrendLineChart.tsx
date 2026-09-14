import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TrendPoint } from '../api/client'

interface Props {
  data: TrendPoint[]
  color?: string
}

const tickStyle = { fontSize: 11, fill: '#7b8496' }

export default function TrendLineChart({ data, color = '#4f8dff' }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="period" tick={tickStyle} minTickGap={20} stroke="var(--chart-grid)" />
        <YAxis tick={tickStyle} width={50} stroke="var(--chart-grid)" />
        <Tooltip contentStyle={{ background: '#131a2b', border: '1px solid #2f3b52', borderRadius: 8, color: '#e7ecf5' }} />
        <Line type="monotone" dataKey="crime_count" stroke={color} strokeWidth={2} dot={false} name="Crime count" isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
