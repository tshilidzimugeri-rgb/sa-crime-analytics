import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { GeoFeatureCollection } from '../api/client'

interface Props {
  geojson: GeoFeatureCollection
  valueByKey: Record<string, number>
  keyProp: string
  onSelect?: (key: string) => void
  height?: number
  fitToData?: boolean
}

function bboxOf(geojson: GeoFeatureCollection): [[number, number], [number, number]] | null {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function visit(coords: any): void {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number]
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    } else {
      coords.forEach(visit)
    }
  }

  geojson.features.forEach((f) => {
    const geom = f.geometry as { coordinates?: unknown } | null
    if (geom?.coordinates) visit(geom.coordinates)
  })

  if (!isFinite(minLng)) return null
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

export default function ChoroplethMap({ geojson, valueByKey, keyProp, onSelect, height = 420, fitToData = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [24.99, -29.0],
      zoom: 4.4,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map: maplibregl.Map = mapRef.current

    const values = Object.values(valueByKey)
    const max = values.length ? Math.max(...values, 1) : 1

    const enriched: GeoFeatureCollection = {
      ...geojson,
      features: geojson.features.map((f) => ({
        ...f,
        properties: { ...f.properties, __value: valueByKey[String(f.properties[keyProp])] ?? 0 },
      })),
    }

    const fillColorExpr = ['interpolate', ['linear'], ['get', '__value'], 0, '#16233a', max, '#4f8dff']

    function applyData() {
      const src = map.getSource('choropleth') as maplibregl.GeoJSONSource | undefined
      if (src) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        src.setData(enriched as any)
        // The color scale's `max` stop is data-dependent (valueByKey may be
        // empty on first mount before the totals query resolves) -- it must
        // be refreshed on every data change, not just baked in once at layer
        // creation, or every province clamps to the same end-of-scale color
        // once real data arrives after an initial empty/zero render.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.setPaintProperty('choropleth-fill', 'fill-color', fillColorExpr as any)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource('choropleth', { type: 'geojson', data: enriched as any })
      map.addLayer({
        id: 'choropleth-fill',
        type: 'fill',
        source: 'choropleth',
        paint: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'fill-color': fillColorExpr as any,
          'fill-opacity': 0.8,
        },
      })
      map.addLayer({
        id: 'choropleth-outline',
        type: 'line',
        source: 'choropleth',
        paint: { 'line-color': '#4f8dff', 'line-width': 0.6, 'line-opacity': 0.5 },
      })
      map.on('click', 'choropleth-fill', (e: maplibregl.MapLayerMouseEvent) => {
        const feat = e.features?.[0]
        if (feat && onSelect) onSelect(String(feat.properties?.[keyProp]))
      })
      map.on('mouseenter', 'choropleth-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'choropleth-fill', () => {
        map.getCanvas().style.cursor = ''
      })
    }

    function applyDataAndFit() {
      applyData()
      if (fitToData) {
        const bbox = bboxOf(geojson)
        if (bbox) map.fitBounds(bbox, { padding: 24, duration: 0 })
      }
    }

    if (map.isStyleLoaded()) applyDataAndFit()
    else map.once('load', applyDataAndFit)
  }, [geojson, valueByKey, keyProp, onSelect, fitToData])

  return <div ref={containerRef} style={{ height, borderRadius: 8, overflow: 'hidden' }} />
}
