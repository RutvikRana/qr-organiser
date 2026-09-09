import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import PhotoTile from '../components/PhotoTile.jsx'
import { CameraIcon } from '../components/icons.jsx'
import { compressImage } from '../lib/imageCompression.js'
import { supabase } from '../lib/supabase.js'

function friendlyError(message) {
  if (message?.includes('duplicate key')) {
    return 'An item with this sticker ID already exists. Scan or look it up from the scan page.'
  }
  if (message?.includes('row-level security')) {
    return 'The database refused this write (row-level security). Check your Supabase policies.'
  }
  return message
}

export default function NewItem() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const scannedId = params.get('id') || ''
  const [id, setId] = useState(scannedId)
  const [label, setLabel] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleFilesChosen(e) {
    const chosen = Array.from(e.target.files || [])
    if (chosen.length === 0) return

    // APPEND to the current selection instead of replacing it.
    setSelectedFiles((prev) => [...prev, ...chosen])
    setPreviews((prev) => [...prev, ...chosen.map((file) => URL.createObjectURL(file))])

    // Reset the input so picking the same file(s) again still fires onChange.
    e.target.value = ''
  }

  function removePhoto(index) {
    URL.revokeObjectURL(previews[index])
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))

    if (primaryIndex === index) {
      // Re-point main to the next remaining photo.
      setPrimaryIndex((prev) => (previews[prev + 1] ? prev : Math.max(0, previews.length - 2)))
    } else if (primaryIndex > index) {
      setPrimaryIndex((prev) => prev - 1)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!id.trim()) {
      setError('An ID is required — this should match the QR sticker.')
      return
    }

    setSaving(true)
    setError(null)

    const itemId = id.trim()
    const uploadedUrls = []

    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index]
        const compressedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 })
        const path = `${itemId}-${Date.now()}-${index}-${compressedFile.name}`

        const { error: uploadError } = await supabase.storage.from('item-images').upload(path, compressedFile)
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      }

      const primaryImageUrl = uploadedUrls[primaryIndex] || uploadedUrls[0] || null

      const { error: insertError } = await supabase
        .from('items')
        .insert({
          id: itemId,
          label,
          location,
          notes,
          image_url: primaryImageUrl,
          images: uploadedUrls,
        })

      if (insertError) throw insertError

      previews.forEach((url) => URL.revokeObjectURL(url))
      navigate(`/item/${itemId}`)
    } catch (err) {
      setError(friendlyError(err.message))
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader back="/" title="New item" sub={scannedId ? 'Register this sticker' : 'Register an item by hand'} />

      {scannedId && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Sticker scanned</div>
            <div className="small muted">This sticker isn't linked to an item yet — fill in the details below.</div>
          </div>
          <span className="tape">{scannedId}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack-16">
        <div className="field-group">
          <label className="field-label" htmlFor="item-id">Sticker ID</label>
          <input
            id="item-id"
            className="field"
            placeholder="e.g. 12300"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={!!scannedId}
            required
          />
          <span className="field-hint">
            {scannedId ? 'Locked to the scanned sticker' : 'Must match the value encoded in the QR sticker'}
          </span>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="item-label">Label</label>
          <input
            id="item-label"
            className="field"
            placeholder="e.g. Winter mugs"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="item-location">Location</label>
          <input
            id="item-location"
            className="field"
            placeholder="e.g. Garage shelf B"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <span className="field-hint">Optional — where the box lives</span>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="item-notes">Notes</label>
          <textarea
            id="item-notes"
            className="field"
            rows={3}
            placeholder="What's inside, condition, anything future-you should know…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="field-group">
          <span className="field-label">Photos</span>
          <div className="field-hint">Tap a photo to set it as the main image · ✕ removes it</div>

          {previews.length > 0 && (
            <div className="photo-grid" style={{ marginTop: 10 }}>
              {previews.map((previewUrl, index) => (
                <PhotoTile
                  key={previewUrl}
                  src={previewUrl}
                  alt={`Preview ${index + 1}`}
                  isMain={index === primaryIndex}
                  onSetMain={() => setPrimaryIndex(index)}
                  onRemove={() => removePhoto(index)}
                />
              ))}
            </div>
          )}

          <div className="upload-zone" style={{ marginTop: 10 }}>
            <span className="small muted">Add photos — the first one becomes the main image</span>
            <label className="btn btn-sm" style={{ marginTop: 8, cursor: 'pointer' }}>
              <CameraIcon /> Choose photos
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFilesChosen}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <div>{error}</div>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Saving…' : 'Save item'}
        </button>
      </form>
    </div>
  )
}
