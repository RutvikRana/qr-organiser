import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabase.js'

const SCANNER_ID = 'qr-reader'

export default function Scan() {
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('Starting camera…')
  const [error, setError] = useState(null)
  const handledRef = useRef(false)

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(SCANNER_ID)
    scannerRef.current = html5QrCode

    html5QrCode
      .start(
        { facingMode: 'environment' }, // rear camera on phones
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {} // ignore per-frame "not found" noise
      )
      .then(() => setStatus('Point the camera at a sticker'))
      .catch((err) => {
        setError('Could not access the camera. Check browser permissions.')
        console.error(err)
      })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onScanSuccess(decodedText) {
    if (handledRef.current) return
    handledRef.current = true
    const scannedId = decodedText.trim()
    setStatus(`Scanned: ${scannedId}`)

    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
    }

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

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem' }}>Scan an item</h1>
      <div
        id={SCANNER_ID}
        style={{
          width: '100%',
          maxWidth: 340,
          margin: '0 auto',
          border: '1.5px solid var(--line)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden'
        }}
      />
      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', marginTop: 16 }}>{status}</p>
      {error && <p style={{ textAlign: 'center', color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
