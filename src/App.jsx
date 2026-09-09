import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import NewItem from './pages/NewItem.jsx'

export default function App() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '18px 20px',
          borderBottom: '1.5px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span className="tape">BOX / 001</span>{' '}
          <strong style={{ marginLeft: 8 }}>Organiser</strong>
        </Link>
        <Link to="/scan" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
          Scan
        </Link>
      </header>

      <main style={{ flex: 1, padding: '20px', maxWidth: 640, width: '100%', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/item/new" element={<NewItem />} />
          <Route path="/item/:id" element={<ItemDetail />} />
        </Routes>
      </main>
    </div>
  )
}
