interface Column<T> {
  key: keyof T
  label: string
  align?: 'left' | 'right'
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  keyField: keyof T
}

export default function DataTable<T extends Record<string, unknown>>({ columns, rows, keyField }: Props<T>) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={String(c.key)} style={{ textAlign: c.align ?? 'left' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[keyField])}>
            {columns.map((c) => (
              <td key={String(c.key)} style={{ textAlign: c.align ?? 'left' }}>
                {typeof row[c.key] === 'number' ? (row[c.key] as number).toLocaleString() : String(row[c.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
