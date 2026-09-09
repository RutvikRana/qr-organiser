import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { compressImage } from '../lib/imageCompression.js'
import { supabase } from '../lib/supabase.js'

function getStoragePathFromUrl(imageUrl) {
  if (!imageUrl) return null

  try {
    const pathname = new URL(imageUrl).pathname
    const match = pathname.match(/\/object\/public\/[^/]+\/(.+)$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

async function deleteStorageImageIfAny(imageUrl) {
  if (!imageUrl) return { error: null }

  const storagePath = getStoragePathFromUrl(imageUrl)
  if (!storagePath) return { error: null }

  const { error } = await supabase.storage.from('item-images').remove([storagePath])
  if (error) {
    console.warn('Could not delete old image from storage:', error.message)
  }

  return { error }
}

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [itemImages, setItemImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [newFiles, setNewFiles] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    setLoading(true)
    const { data, error: itemError } = await supabase.from('items').select('*').eq('id', id).single()
    const { data: imagesData, error: imagesError } = await supabase.from('item_images').select('*').eq('item_id', id).order('created_at', { ascending: true })

    if (itemError) setError(itemError.message)
    else {
      setItem(data)
      setLabel(data.label || '')
      setLocation(data.location || '')
      setNotes(data.notes || '')
    }

    if (imagesError) {
      setError(imagesError.message)
    } else {
      setItemImages(imagesData || [])
    }

    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const primaryImage = itemImages.find((image) => image.is_primary) || itemImages[0]
    let image_url = item.image_url || primaryImage?.image_url || null

    if (newFiles.length > 0) {
      const rows = []
      for (let index = 0; index < newFiles.length; index += 1) {
        const file = newFiles[index]
        const compressedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 })
        const path = `${id}-${Date.now()}-${index}-${compressedFile.name}`

        const { error: uploadError } = await supabase.storage.from('item-images').upload(path, compressedFile)
        if (uploadError) {
          setSaving(false)
          setError(`Image upload failed: ${uploadError.message}`)
          return
        }

        const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
        const imageUrl = urlData.publicUrl

        rows.push({
          item_id: id,
          image_url: imageUrl,
          is_primary: itemImages.length === 0 && index === 0,
        })

        if (itemImages.length === 0 && index === 0) {
          image_url = imageUrl
        }
      }

      const { error: insertError } = await supabase.from('item_images').insert(rows)
      if (insertError) {
        setSaving(false)
        setError(insertError.message)
        return
      }
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

    setNewFiles([])
    setEditing(false)
    load()
  }

  async function handlePrimarySelect(imageId) {
    const selected = itemImages.find((image) => image.id === imageId)
    if (!selected) return

    const { error: clearError } = await supabase.from('item_images').update({ is_primary: false }).eq('item_id', id)
    if (clearError) {
      setError(clearError.message)
      return
    }

    const { error: setErrorResult } = await supabase.from('item_images').update({ is_primary: true }).eq('id', imageId)
    if (setErrorResult) {
      setError(setErrorResult.message)
      return
    }

    const { error: itemUpdateError } = await supabase.from('items').update({ image_url: selected.image_url }).eq('id', id)
    if (itemUpdateError) {
      setError(itemUpdateError.message)
      return
    }

    load()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.label}"? This can't be undone.`)) return

    const { error: storageError } = await deleteStorageImageIfAny(item.image_url)
    if (storageError) {
      setError(`Could not delete the image from storage: ${storageError.message}`)
      return
    }

    const { data: imageRows } = await supabase.from('item_images').select('*').eq('item_id', id)
    if (imageRows && imageRows.length > 0) {
      for (const imageRow of imageRows) {
        await deleteStorageImageIfAny(imageRow.image_url)
      }
      await supabase.from('item_images').delete().eq('item_id', id)
    }

    await supabase.from('items').delete().eq('id', id)
    navigate('/')
  }

  const allImages = itemImages.length > 0
    ? itemImages
    : item && item.image_url
      ? [{ id: 'legacy', image_url: item.image_url, is_primary: true }]
      : []

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
            Add more photos
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
              style={{ display: 'block', marginTop: 4 }}
            />
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

      {allImages.length > 0 && (
        <div style={{ display: 'grid', gap: 12, margin: '12px 0' }}>
          <img
            src={allImages.find((image) => image.is_primary)?.image_url || allImages[0].image_url}
            alt={item.label}
            style={{ width: '100%', maxWidth: 320, borderRadius: 'var(--radius)', display: 'block' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
            {allImages.map((image) => (
              <div key={image.id} style={{ display: 'grid', gap: 6 }}>
                <img
                  src={image.image_url}
                  alt=""
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: image.is_primary ? '2px solid var(--accent)' : '1px solid var(--line)' }}
                />
                <button type="button" className="btn" onClick={() => handlePrimarySelect(image.id)}>
                  {image.is_primary ? 'Display image' : 'Use as display'}
                </button>
              </div>
            ))}
          </div>
        </div>
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
