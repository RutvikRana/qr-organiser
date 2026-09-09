import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { compressImage } from '../lib/imageCompression.js'
import { supabase } from '../lib/supabase.js'

export default function NewItem() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [id, setId] = useState(params.get('id') || '')
  const [label, setLabel] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
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

    let primaryImageUrl = null
    const itemId = id.trim()

    const { error: insertError } = await supabase
      .from('items')
      .insert({ id: itemId, label, location, notes, image_url: null })

    if (insertError) {
      setSaving(false)
      setError(insertError.message)
      return
    }

    if (selectedFiles.length > 0) {
      const uploadedRows = []

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index]
        const compressedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 })
        const path = `${itemId}-${Date.now()}-${index}-${compressedFile.name}`

        const { error: uploadError } = await supabase.storage.from('item-images').upload(path, compressedFile)
        if (uploadError) {
          setSaving(false)
          setError(`Image upload failed: ${uploadError.message}`)
          return
        }

        const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
        const imageUrl = urlData.publicUrl

        if (index === primaryIndex) {
          primaryImageUrl = imageUrl
        }

        uploadedRows.push({
          item_id: itemId,
          image_url: imageUrl,
          is_primary: index === primaryIndex,
        })
      }

      const { error: imagesError } = await supabase.from('item_images').insert(uploadedRows)
      if (imagesError) {
        setSaving(false)
        setError(imagesError.message)
        return
      }

      if (primaryImageUrl) {
        const { error: updateError } = await supabase
          .from('items')
          .update({ image_url: primaryImageUrl })
          .eq('id', itemId)

        if (updateError) {
          setSaving(false)
          setError(updateError.message)
          return
        }
      }
    }

    setSaving(false)
    navigate(`/item/${itemId}`)
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
          Photos
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              setSelectedFiles(files)
              setPrimaryIndex(files.length > 0 ? 0 : primaryIndex)
            }}
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>

        {selectedFiles.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Choose display image</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedFiles.map((file, index) => (
                <button
                  key={`${file.name}-${index}`}
                  type="button"
                  onClick={() => setPrimaryIndex(index)}
                  style={{
                    border: index === primaryIndex ? '2px solid var(--accent)' : '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '6px 8px',
                    background: index === primaryIndex ? 'rgba(94, 234, 212, 0.12)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {file.name.slice(0, 18)}{file.name.length > 18 ? '…' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save item'}
        </button>
      </form>
    </div>
  )
}
