import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single()
    if (error) setError(error.message)
    else {
      setItem(data)
      setLabel(data.label || '')
      setLocation(data.location || '')
      setNotes(data.notes || '')
    }
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    let image_url = item.image_url
    if (file) {
      const path = `${id}-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('item-images').upload(path, file)
      if (uploadError) {
        setSaving(false)
        setError(`Image upload failed: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({ label, location, notes, image_url })
      .eq('id', id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setFile(null)
    setEditing(false)
    load()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.label}"? This can't be undone.`)) return
    await supabase.from('items').delete().eq('id', id)
    navigate('/')
  }

  if (loading) return <p>Loading…</p>
  if (error && !item) return <p style={{ color: 'var(--danger)' }}>{error}</p>
  if (!item) return <p>Item not found.</p>

  if (editing) {
    return (
      <div>
        <span className="tape">{item.id}</span>
        <h1 style={{ fontSize: '1.4rem', margin: '8px 0' }}>Edit item</h1>
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
          <label>
            Label
            <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} required style={{ marginTop: 4 }} />
          </label>
          <label>
            Location
            <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} style={{ marginTop: 4 }} />
          </label>
          <label>
            Notes
            <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginTop: 4, resize: 'vertical' }} />
          </label>
          <label>
            Replace photo
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      <span className="tape">{item.id}</span>
      <h1 style={{ fontSize: '1.5rem', margin: '8px 0 2px' }}>{item.label}</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>{item.location}</p>

      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.label}
          style={{ width: '100%', maxWidth: 320, borderRadius: 'var(--radius)', margin: '12px 0', display: 'block' }}
        />
      )}

      {item.notes && (
        <p style={{ whiteSpace: 'pre-wrap', margin: '12px 0' }}>{item.notes}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>
        <button
          onClick={handleDelete}
          style={{ border: '1.5px solid var(--danger)', background: 'transparent', color: 'var(--danger)', padding: '12px 18px', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
