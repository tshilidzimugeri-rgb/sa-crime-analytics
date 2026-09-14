interface Props {
  label: string
  value: string | number
  delta?: number | null
  deltaGoodDirection?: 'down' | 'up'
}

export default function KpiTile({ label, value, delta, deltaGoodDirection = 'down' }: Props) {
  const hasDelta = delta !== undefined && delta !== null
  const isGood = hasDelta ? (deltaGoodDirection === 'down' ? delta! < 0 : delta! > 0) : null

  return (
    <div className="kpi-tile">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {hasDelta && (
        <div className={`kpi-delta ${isGood ? 'good' : 'bad'}`}>
          {delta! > 0 ? '+' : ''}
          {delta}% vs prior year
        </div>
      )}
    </div>
  )
}
