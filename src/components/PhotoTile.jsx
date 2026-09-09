import { CloseIcon } from './icons.jsx'

/**
 * A photo tile used in edit/add flows.
 * Tap the photo to set it as main. Delete is an ✕ icon in the top-right corner.
 */
export default function PhotoTile({ src, alt = '', isMain = false, onSetMain, onRemove }) {
  return (
    <div className="photo-tile">
      <button
        type="button"
        className={`photo-tile-btn${isMain ? ' is-main' : ''}`}
        onClick={onSetMain}
        disabled={isMain}
        aria-label={isMain ? 'Main photo' : 'Set as main photo'}
      >
        <img src={src} alt={alt} />
        {isMain && <span className="photo-badge">Main</span>}
      </button>
      {onRemove && (
        <button
          type="button"
          className="photo-remove"
          onClick={onRemove}
          aria-label="Remove photo"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}
