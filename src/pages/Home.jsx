import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { supabase } from '../lib/supabase.js'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function Thumb({ item }) {
  if (item.image_url) {
    return <img className="item-thumb" src={item.image_url} alt="" loading="lazy" />
  }
  return (
    <div className="item-thumb item-thumb-empty">
      <BoxIcon />
    </div>
  )
}

function ItemCard({ item }) {
  return (
    <Link to={`/item/${item.id}`} className="card item-card">
      <Thumb item={item} />
      <div className="item-meta">
        <div className="item-label">{item.label}</div>
        <div className="item-sub">
          <span>{item.location || 'No location set'}</span>
        </div>
      </div>
      <span className="tape">#{item.id}</span>
    </Link>
  )
}

function SkeletonList() {
  return (
    <div className="stack-12" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton" style={{ width: 56, height: 56 }} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: '55%' }} />
            <div className="skeleton" style={{ height: 11, width: '35%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('items')
        .select('id, label, location, image_url, created_at')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (error) {
        setError(error.message)
      } else {
        setItems(data || [])
        setError(null)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.label?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        String(item.id).toLowerCase().includes(q)
    )
  }, [items, query])

  return (
    <div>
      <PageHeader
        title="Your items"
        sub="Everything you've logged, newest first"
        action={
          <Link to="/item/new" className="btn btn-sm btn-ghost" style={{ alignSelf: 'center' }}>
            <PlusIcon /> Add
          </Link>
        }
      />

      {error ? (
        <div className="error-banner">
          <div>
            Couldn't load your items. Check that Supabase is configured and the <code>items</code> table exists.
            <div className="small" style={{ marginTop: 4 }}>{error}</div>
          </div>
        </div>
      ) : loading ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <div className="state-block">
          <div className="state-icon"><BoxIcon /></div>
          <div className="state-title">Nothing logged yet</div>
          <p className="state-text">Scan the QR sticker on a box to add your first item, or register one by hand.</p>
          <div className="state-actions">
            <Link to="/scan" className="btn btn-primary"><CameraIcon /> Scan a sticker</Link>
            <Link to="/item/new" className="btn">Add manually</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <div className="search-wrap" style={{ flex: 1 }}>
              <span className="search-icon"><SearchIcon /></span>
              <input
                className="field search-input"
                type="search"
                placeholder="Search label, location or ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search items"
              />
            </div>
            <span className="chip count-chip">{filtered.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="state-block">
              <div className="state-icon"><SearchIcon /></div>
              <div className="state-title">No matches</div>
              <p className="state-text">Nothing matches “{query}”. Try a label, location or item ID.</p>
            </div>
          ) : (
            <div className="stack-12">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
