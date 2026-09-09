import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import PageHeader from '../components/PageHeader.jsx'
import { QrIcon } from '../components/icons.jsx'
import { supabase } from '../lib/supabase.js'

const SCANNER_ID = 'qr-reader'

function ScanIdleState({ onRetry }) {
  return (
    <div className="state-block">
      <div className="state-icon"><QrIcon size={26} /></div>
      <div className="state-title">Camera isn't running</div>
      <p className="state-text">
        Allow camera access in your browser to scan a sticker — or register one by typing its ID below.
      </p>
      <div className="state-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button>
      </div>
    </div>
  )
}

export default function Scan() {
  const navigate = useNavigate()

  // Single scanner instance, plus promises tracking its async lifecycle so
  // start/stop can never interleave (React StrictMode double-mounts effects
  // in dev, which would otherwise create two camera streams).
  const instanceRef = useRef(null)
  const startPromiseRef = useRef(null)
  const stopPromiseRef = useRef(null)

  const handledRef = useRef(false)
  const [cameraState, setCameraState] = useState('starting') // starting | running | failed
  const [status, setStatus] = useState('Starting camera…')
  const [error, setError] = useState(null)
  const [manualId, setManualId] = useState('')

  const stopScanner = useCallback(() => {
    const scanner = instanceRef.current
    const startPromise = startPromiseRef.current
    instanceRef.current = null
    startPromiseRef.current = null

    const doStop = async () => {
      try {
        // If a start is still in flight, wait for it to settle — otherwise
        // stop() would be skipped while the camera silently keeps running.
        if (startPromise) await startPromise.catch(() => {})
        if (scanner?.isScanning) await scanner.stop()
        scanner?.clear()
      } catch {
        // already stopped or camera released — nothing to do
      }
    }

    stopPromiseRef.current = doStop()
    return stopPromiseRef.current
  }, [])

  const startScanner = useCallback(async () => {
    // Wait for any in-flight stop so we never have two instances at once.
    if (stopPromiseRef.current) {
      await stopPromiseRef.current
      stopPromiseRef.current = null
    }
    if (instanceRef.current || startPromiseRef.current) return

    const mount = document.getElementById(SCANNER_ID)
    if (!mount) {
      setCameraState('failed')
      return
    }
    mount.innerHTML = ''

    handledRef.current = false
    setError(null)
    setCameraState('starting')
    setStatus('Starting camera…')

    const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false })
    instanceRef.current = scanner

    const startPromise = scanner.start(
      { facingMode: 'environment' }, // rear camera on phones
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      () => {} // ignore per-frame "not found" noise
    )
    startPromiseRef.current = startPromise

    startPromise
      .then(() => {
        setCameraState('running')
        setStatus('Point the camera at a sticker')
      })
      .catch((err) => {
        console.error(err)
        setCameraState('failed')
      })
      .finally(() => {
        if (startPromiseRef.current === startPromise) startPromiseRef.current = null
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    startScanner()
    return () => {
      stopScanner()
    }
  }, [startScanner, stopScanner])

  async function onScanSuccess(decodedText) {
    if (handledRef.current) return
    handledRef.current = true
    const scannedId = decodedText.trim()
    setStatus(`Scanned: ${scannedId}`)

    await stopScanner()

    const { data, error } = await supabase
      .from('items')
      .select('id')
      .eq('id', scannedId)
      .maybeSingle()

    if (error) {
      setError(error.message)
      return
    }

    if (data) {
      navigate(`/item/${data.id}`)
    } else {
      navigate(`/item/new?id=${encodeURIComponent(scannedId)}`)
    }
  }

  async function handleManualLookup(e) {
    e.preventDefault()
    const scannedId = manualId.trim()
    if (!scannedId) return

    const { data, error } = await supabase
      .from('items')
      .select('id')
      .eq('id', scannedId)
      .maybeSingle()

    if (error) {
      setError(error.message)
      return
    }

    if (data) {
      navigate(`/item/${data.id}`)
    } else {
      navigate(`/item/new?id=${encodeURIComponent(scannedId)}`)
    }
  }

  function handleRetry() {
    stopScanner()
    startScanner()
  }

  return (
    <div>
      <PageHeader title="Scan an item" sub="Aim at the QR sticker on the box" />

      {/* Always mounted so the scanner target exists even in the failed state. */}
      <div className="scanner-frame" style={cameraState === 'failed' ? { display: 'none' } : undefined}>
        <div id={SCANNER_ID} />
      </div>

      {cameraState === 'failed' && <ScanIdleState onRetry={handleRetry} />}

      {cameraState !== 'failed' && (
        <p className="center" style={{ marginTop: 16 }}>
          <span className="status-pill">
            <span className={`status-dot${cameraState === 'running' ? ' pulse' : ''}`} />
            {status}
          </span>
        </p>
      )}

      {error && (
        <div className="error-banner" style={{ marginTop: 16 }}>
          <div>
            Lookup failed.
            <div className="small" style={{ marginTop: 4 }}>{error}</div>
          </div>
        </div>
      )}

      <div className="stack-12" style={{ marginTop: 28 }}>
        <div className="center faint small">No sticker handy?</div>
        <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: 8 }}>
          <input
            className="field"
            placeholder="Type the sticker ID, e.g. 12300"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            aria-label="Sticker ID"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn" disabled={!manualId.trim()}>Look up</button>
        </form>
      </div>
    </div>
  )
}
