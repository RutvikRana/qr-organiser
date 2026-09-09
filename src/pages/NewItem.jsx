import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function NewItem() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [id, setId] = useState(params.get('id') || '')
  const [label, setLabel] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!id.trim()) {
      setError('An ID is required — this should match the QR sticker.')
      return
    }
    setSaving(true)
    setError(null)

    let image_url = null
    if (file) {
      const path = `${id.trim()}-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(path, file)
      if (uploadError) {
        setSaving(false)
        setError(`Image upload failed: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }

    const { error: insertError } = await supabase
      .from('items')
      .insert({ id: id.trim(), label, location, notes, image_url })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    navigate(`/item/${id.trim()}`)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem' }}>New item</h1>
      {params.get('id') && (
        <p style={{ color: 'var(--ink-soft)' }}>
          This sticker isn't linked to anything yet — <span className="tape">{id}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
        <label>
          ID
          <input
            className="field"
            placeholder="e.g. 12300"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={!!params.get('id')}
            required
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          Label
          <input
            className="field"
            placeholder="e.g. Winter mugs"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          Location
          <input
            className="field"
            placeholder="e.g. Garage shelf B"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          Notes
          <textarea
            className="field"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ marginTop: 4, resize: 'vertical' }}
          />
        </label>
        <label>
          Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save item'}
        </button>
      </form>
    </div>
  )
}
