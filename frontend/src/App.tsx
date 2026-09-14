import { NavLink, Route, Routes } from 'react-router-dom'
import FilterBar from './components/FilterBar'
import Overview from './pages/Overview'
import ProvinceDetail from './pages/ProvinceDetail'
import CategoryTrends from './pages/CategoryTrends'
import MapExplorer from './pages/MapExplorer'
import StationDetail from './pages/StationDetail'

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">SA Crime Analytics</div>
        <nav>
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/map">Map Explorer</NavLink>
        </nav>
      </header>

      <div className="app-body">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <FilterBar />
                <Overview />
              </>
            }
          />
          <Route path="/province/:code" element={<ProvinceDetail />} />
          <Route path="/category/:code" element={<CategoryTrends />} />
          <Route path="/map" element={<MapExplorer />} />
          <Route path="/station/:code" element={<StationDetail />} />
        </Routes>
      </div>

      <footer className="app-footer">
        Data: <a href="https://github.com/afrith/crime-stats" target="_blank" rel="noreferrer">afrith/crime-stats</a> (SAPS quarterly reports, PDDL v1.0)
      </footer>
    </div>
  )
}
