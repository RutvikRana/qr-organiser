import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Home() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('items')
        .select('id, label, location, image_url, created_at')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (error) setError(error.message)
      else setItems(data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Your items</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0, marginBottom: 24 }}>
        Scan a sticker to open an item, or browse what's already logged.
      </p>

      {loading && <p>Loading…</p>}
      {error && (
        <p style={{ color: 'var(--danger)' }}>
          Couldn't reach Supabase: {error}. Check your .env values and that the `items` table exists.
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="card">
          <p style={{ marginTop: 0 }}>Nothing logged yet.</p>
          <Link to="/scan" className="btn btn-primary">Scan your first QR code</Link>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/item/${item.id}`}
            className="card"
            style={{ textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'center' }}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 48, height: 48, borderRadius: 'var(--radius)', flexShrink: 0,
                  background: 'var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: 'var(--ink-soft)'
                }}
              >
                no photo
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                {item.location || 'No location set'}
              </div>
            </div>
            <span className="tape">{item.id}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
