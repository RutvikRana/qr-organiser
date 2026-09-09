import { Navigate, Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import NewItem from './pages/NewItem.jsx'
import Login from './pages/Login.jsx'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { QrIcon, LogOutIcon } from './components/icons.jsx'

function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand">
          <span className="tape">QR</span>
          <strong>Organiser</strong>
        </Link>
        <div className="topbar-actions">
          <Link to="/scan" className="btn btn-sm btn-primary">
            <QrIcon /> Scan
          </Link>
          <button
            className="btn btn-sm btn-ghost signout-btn"
            onClick={handleSignOut}
            title={user?.email ? `Signed in as ${user.email}` : 'Sign out'}
          >
            <LogOutIcon /> Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

function Shell({ children }) {
  return (
    <div className="shell">
      <Header />
      <main className="page">{children}</main>
      <footer className="app-footer">
        Made with <span className="heart" aria-hidden="true">❤</span> by CryliaSoft
      </footer>
    </div>
  )
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="shell auth-boot">
        <div className="status-pill"><span className="status-dot pulse" /> Checking sign-in&hellip;</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Shell>{children}</Shell>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/scan" element={<RequireAuth><Scan /></RequireAuth>} />
        <Route path="/item/new" element={<RequireAuth><NewItem /></RequireAuth>} />
        <Route path="/item/:id" element={<RequireAuth><ItemDetail /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
