import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader, { BackLink } from '../components/PageHeader.jsx'
import PhotoTile from '../components/PhotoTile.jsx'
import { BoxIcon, CameraIcon, EditIcon, StarIcon, TagIcon, PinIcon, NoteIcon } from '../components/icons.jsx'
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

function DetailRow({ icon, label, children }) {
  return (
    <div className="detail-row">
      <div className="detail-icon">{icon}</div>
      <div className="detail-content">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{children}</div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="stack-16" aria-hidden="true">
      <div className="skeleton" style={{ height: 24, width: 110 }} />
      <div className="skeleton" style={{ height: 30, width: '70%' }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      <div className="stack-8">
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
        <div className="skeleton" style={{ height: 14, width: '60%' }} />
      </div>
    </div>
  )
}

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Read-mode viewer: which image is displayed in the hero (defaults to main).
  const [viewerImage, setViewerImage] = useState('')

  // Edit-mode state
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [existingImages, setExistingImages] = useState([])
  // Snapshot of the item's images when editing started — used to detect removals on save.
  const [originalImages, setOriginalImages] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  // Which photo is currently chosen as main: { type: 'existing', value: url } | { type: 'new', value: index } | null
  const [mainChoice, setMainChoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const loadItem = useCallback(async () => {
    setLoading(true)
    const { data, error: itemError } = await supabase.from('items').select('*').eq('id', id).single()

    if (itemError) {
      setError(itemError.message)
      setItem(null)
      setLoading(false)
      return
    }

    setItem(data)
    setError(null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadItem()
  }, [loadItem])

  // Keep the hero viewer in sync with the loaded item (defaults to main image).
  useEffect(() => {
    setViewerImage(item?.image_url || '')
  }, [item])

  // ----- Edit mode -----

  function startEditing() {
    const images = Array.isArray(item.images) ? item.images.filter(Boolean) : []
    const imageList = images.length > 0 ? images : (item.image_url ? [item.image_url] : [])

    setLabel(item.label || '')
    setLocation(item.location || '')
    setNotes(item.notes || '')
    setOriginalImages(imageList)
    setExistingImages(imageList)
    setNewFiles([])
    setNewPreviews([])
    setMainChoice(item.image_url ? { type: 'existing', value: item.image_url } : (imageList[0] ? { type: 'existing', value: imageList[0] } : null))
    setError(null)
    setEditing(true)
  }

  function handleNewFilesChosen(e) {
    const chosen = Array.from(e.target.files || [])
    if (chosen.length === 0) return

    // APPEND to the current selection instead of replacing it.
    setNewFiles((prev) => [...prev, ...chosen])
    setNewPreviews((prev) => [...prev, ...chosen.map((file) => URL.createObjectURL(file))])

    if (!mainChoice) {
      setMainChoice({ type: 'new', value: 0 })
    }

    // Reset the input so picking the same file(s) again still fires onChange.
    e.target.value = ''
  }

  function removeNewPhoto(index) {
    URL.revokeObjectURL(newPreviews[index])
    const nextFiles = newFiles.filter((_, i) => i !== index)
    const nextPreviews = newPreviews.filter((_, i) => i !== index)
    setNewFiles(nextFiles)
    setNewPreviews(nextPreviews)

    if (mainChoice?.type === 'new') {
      if (mainChoice.value === index) {
        if (nextPreviews[index]) {
          setMainChoice({ type: 'new', value: index })
        } else if (nextPreviews.length > 0) {
          setMainChoice({ type: 'new', value: nextPreviews.length - 1 })
        } else if (existingImages[0]) {
          setMainChoice({ type: 'existing', value: existingImages[0] })
        } else {
          setMainChoice(null)
        }
      } else if (mainChoice.value > index) {
        setMainChoice({ type: 'new', value: mainChoice.value - 1 })
      }
    }
  }

  function removeExistingPhoto(imageUrl) {
    const nextImages = existingImages.filter((url) => url !== imageUrl)
    setExistingImages(nextImages)

    if (mainChoice?.type === 'existing' && mainChoice.value === imageUrl) {
      if (nextImages[0]) {
        setMainChoice({ type: 'existing', value: nextImages[0] })
      } else if (newPreviews[0]) {
        setMainChoice({ type: 'new', value: 0 })
      } else {
        setMainChoice(null)
      }
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const uploadedUrls = []
      for (let index = 0; index < newFiles.length; index += 1) {
        const file = newFiles[index]
        const compressedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 })
        const path = `${id}-${Date.now()}-${index}-${compressedFile.name}`

        const { error: uploadError } = await supabase.storage.from('item-images').upload(path, compressedFile)
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      }

      const finalImages = Array.from(new Set([...existingImages, ...uploadedUrls]))

      let primaryImage = null
      if (mainChoice?.type === 'new' && uploadedUrls[mainChoice.value]) {
        primaryImage = uploadedUrls[mainChoice.value]
      } else if (mainChoice?.type === 'existing' && finalImages.includes(mainChoice.value)) {
        primaryImage = mainChoice.value
      } else {
        primaryImage = finalImages[0] || null
      }

      const { error: updateError } = await supabase
        .from('items')
        .update({
          label,
          location,
          notes,
          image_url: primaryImage,
          images: finalImages,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Clean up storage: any originally-present image that is no longer in the
      // final list was removed by the user — delete its file from Supabase Storage.
      const removedUrls = originalImages.filter((url) => !finalImages.includes(url))
      for (const removedUrl of removedUrls) {
        const { error: storageError } = await deleteStorageImageIfAny(removedUrl)
        if (storageError) {
          console.warn('Row updated, but storage cleanup failed for an image:', storageError.message)
        }
      }

      newPreviews.forEach((url) => URL.revokeObjectURL(url))
      setNewFiles([])
      setNewPreviews([])
      setEditing(false)
      setSaving(false)
      await loadItem()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  async function handleSetMainFromViewer(imageUrl) {
    const { error: updateError } = await supabase.from('items').update({ image_url: imageUrl }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setItem((prev) => ({ ...prev, image_url: imageUrl }))
  }

  async function handleDelete() {
    setConfirmingDelete(false)

    const images = Array.isArray(item.images) ? item.images : []
    const urlsToDelete = [...new Set([...images, item.image_url].filter(Boolean))]
    for (const imageUrl of urlsToDelete) {
      const { error: storageError } = await deleteStorageImageIfAny(imageUrl)
      if (storageError) {
        setError(`Could not delete the image from storage: ${storageError.message}`)
        return
      }
    }

    const { error: deleteError } = await supabase.from('items').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }

    navigate('/')
  }

  // ----- Render states -----

  if (loading) {
    return (
      <div>
        <BackLink />
        <DetailSkeleton />
      </div>
    )
  }

  if (error && !item) {
    return (
      <div>
        <BackLink />
        <div className="state-block">
          <div className="state-title">Couldn't load this item</div>
          <p className="state-text">{error}</p>
          <div className="state-actions">
            <button type="button" className="btn" onClick={loadItem}>Try again</button>
            <BackLink />
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div>
        <BackLink />
        <div className="state-block">
          <div className="state-icon"><BoxIcon /></div>
          <div className="state-title">Item not found</div>
          <p className="state-text">No item is registered with sticker ID <span className="tape">#{id}</span>.</p>
          <div className="state-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/item/new?id=${encodeURIComponent(id)}`)}>
              Register it
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- Edit mode render -----

  if (editing) {
    const totalNew = newPreviews.length

    return (
      <div>
        <PageHeader back={`/item/${id}`} backLabel="Discard" title="Edit item" />

        <form onSubmit={handleSave} className="stack-16">
          <div className="field-group">
            <span className="field-label">Photos</span>
            <div className="field-hint">Tap a photo to set it as the main image · ✕ removes it</div>

            <div className="photo-grid">
              {existingImages.map((imageUrl) => (
                <PhotoTile
                  key={imageUrl}
                  src={imageUrl}
                  alt="Existing photo"
                  isMain={mainChoice?.type === 'existing' && mainChoice.value === imageUrl}
                  onSetMain={() => setMainChoice({ type: 'existing', value: imageUrl })}
                  onRemove={() => removeExistingPhoto(imageUrl)}
                />
              ))}
              {newPreviews.map((previewUrl, index) => (
                <PhotoTile
                  key={previewUrl}
                  src={previewUrl}
                  alt={`New photo ${index + 1}`}
                  isMain={mainChoice?.type === 'new' && mainChoice.value === index}
                  onSetMain={() => setMainChoice({ type: 'new', value: index })}
                  onRemove={() => removeNewPhoto(index)}
                />
              ))}
            </div>

            {totalNew > 0 && (
              <div className="field-hint" style={{ marginTop: 6 }}>
                {totalNew} new photo{totalNew > 1 ? 's' : ''} will be uploaded when you save
              </div>
            )}

            <div className="upload-zone" style={{ marginTop: 10 }}>
              <span className="small muted">Add more photos</span>
              <label className="btn btn-sm" style={{ marginTop: 8, cursor: 'pointer' }}>
                <CameraIcon /> Choose photos
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleNewFilesChosen}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="edit-label">Label</label>
            <input
              id="edit-label"
              className="field"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="edit-location">Location</label>
            <input
              id="edit-location"
              className="field"
              placeholder="e.g. Garage shelf B"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="edit-notes">Notes</label>
            <textarea
              id="edit-notes"
              className="field"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="error-banner">
              <div>{error}</div>
            </div>
          )}

          <div className="action-bar" style={{ marginTop: 4 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                newPreviews.forEach((url) => URL.revokeObjectURL(url))
                setEditing(false)
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ----- Read mode render -----

  const images = Array.isArray(item.images) ? item.images.filter(Boolean) : []
  const allImages = images.length > 0 ? images : (item.image_url ? [item.image_url] : [])
  const heroImage = viewerImage || item.image_url || allImages[0] || ''
  const heroIsMain = heroImage === item.image_url

  return (
    <div>
      <PageHeader
        back="/"
        title={item.label}
        sub={item.location || 'No location set'}
        action={<span className="tape">#{item.id}</span>}
      />

      {error && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          <div>{error}</div>
        </div>
      )}

      {heroImage ? (
        <div className="hero-wrap" style={{ marginBottom: 14 }}>
          <img className="detail-hero" src={heroImage} alt={item.label} />
          <button
            type="button"
            className="hero-main-btn"
            onClick={() => handleSetMainFromViewer(heroImage)}
            disabled={heroIsMain}
          >
            <StarIcon /> {heroIsMain ? 'Main photo' : 'Set as main'}
          </button>
        </div>
      ) : (
        <div className="state-block" style={{ padding: 32, marginBottom: 16 }}>
          <div className="state-icon"><BoxIcon /></div>
          <div className="state-title">No photos yet</div>
          <p className="state-text">Add a photo so you can recognise this box at a glance.</p>
        </div>
      )}

      {allImages.length > 1 && (
        <div className="thumb-strip" style={{ marginBottom: 16 }}>
          {allImages.map((imageUrl) => (
            <button
              key={imageUrl}
              type="button"
              className={`thumb-btn${imageUrl === heroImage ? ' is-active' : ''}`}
              onClick={() => setViewerImage(imageUrl)}
              aria-label="View photo"
            >
              <img src={imageUrl} alt="" />
              {imageUrl === item.image_url && <span className="photo-badge">Main</span>}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '4px 16px' }}>
        <DetailRow icon={<TagIcon />} label="Sticker ID">
          <span className="tape">#{item.id}</span>
        </DetailRow>
        <DetailRow icon={<PinIcon />} label="Location">
          {item.location || <span className="faint">Not set</span>}
        </DetailRow>
        <DetailRow icon={<NoteIcon />} label="Notes">
          {item.notes || <span className="faint">No notes</span>}
        </DetailRow>
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-primary" onClick={startEditing}>
          <EditIcon /> Edit
        </button>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
          Delete
        </button>
      </div>

      {confirmingDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmingDelete(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="delete-title">Delete “{item.label}”?</h2>
            <p>
              This removes the item and its photos permanently. The sticker on the box won't be linked to anything afterwards.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-sm" onClick={() => setConfirmingDelete(false)}>
                Keep item
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
