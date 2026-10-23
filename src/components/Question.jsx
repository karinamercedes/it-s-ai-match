import { useEffect, useRef, useState } from 'react'
import { MAX_RECORD_SECONDS } from '../config.js'
import { transcribe, tidy, blobToBase64 } from '../lib/api.js'
import { r } from '../lib/reveal.js'

const MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(
  (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
)

export default function Question({ n, total, question, onConfirm }) {
  const [state, setState] = useState('idle') // idle | recording | working | review
  const [seconds, setSeconds] = useState(0)
  const [raw, setRaw] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const rec = useRef(null)
  const timer = useRef(null)
  const sample = useRef(null) // the recording itself, kept in memory only, used to clone your voice
  const startedAt = useRef(0)

  useEffect(
    () => () => {
      clearInterval(timer.current)
      const r = rec.current
      if (r && r.state !== 'inactive') r.stop()
      r?.stream?.getTracks().forEach((t) => t.stop())
    },
    []
  )

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream, MIME ? { mimeType: MIME } : undefined)
      const chunks = []
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        handle(new Blob(chunks, { type: r.mimeType || MIME || 'audio/webm' }))
      }
      rec.current = r
      startedAt.current = Date.now()
      r.start()
      setSeconds(0)
      setState('recording')
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) stop()
          return s + 1
        })
      }, 1000)
    } catch {
      setError('We couldn’t use your microphone. Check the browser permission, or type your answer.')
    }
  }

  function stop() {
    clearInterval(timer.current)
    if (rec.current?.state === 'recording') rec.current.stop()
  }

  async function handle(blob) {
    sample.current = { blob, seconds: (Date.now() - startedAt.current) / 1000 }
    setState('working')
    try {
      const { text } = await transcribe(await blobToBase64(blob), blob.type)
      if (!text) throw new Error('We didn’t catch anything. Try again a bit closer to the mic.')
      setRaw(text)
      const cleaned = await tidy(question, text)
      setDraft(cleaned.text || text)
      setState('review')
    } catch (e) {
      setError(e.message)
      setState('idle')
    }
  }

  return (
    <>
      <header className="head rv" style={r(0)}>
        <p className="eyebrow">
          Question {n} of {total}
        </p>
        <h2 className="h question">{question}</h2>
      </header>

      {state === 'review' ? (
        <div className="review" style={{ '--d0': '0s' }}>
          <label className="field rv" style={r(0)}>
            <span>{raw ? 'Is this what you said? Edit anything that’s wrong' : 'Your answer'}</span>
            <textarea value={draft} rows={4} onChange={(e) => setDraft(e.target.value)} autoFocus={!raw} />
          </label>
          {raw && (
            <details className="heard rv" style={r(1)}>
              <summary>What the transcription heard</summary>
              <p>{raw}</p>
            </details>
          )}
          <button className="btn rv" style={r(2)} disabled={!draft.trim()} onClick={() => onConfirm(draft.trim(), raw ? sample.current : null)}>
            <span className="grad">{n === total ? 'That’s me, find my match' : 'Yes, that’s me'}</span>
          </button>
          <button className="link rv" style={r(3)} onClick={() => { setDraft(''); setRaw(''); sample.current = null; setState('idle') }}>
            {raw ? 'Record again' : 'Record instead'}
          </button>
        </div>
      ) : (
        <div className="recorder rv" style={r(1)}>
          <button
            className={`mic ${state}`}
            onClick={state === 'recording' ? stop : start}
            disabled={state === 'working'}
            aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
          >
            {state === 'recording' ? <StopIcon /> : <MicIcon />}
          </button>
          <p className="mic-label">
            {state === 'recording'
              ? `Recording · ${seconds}s · tap to stop`
              : state === 'working'
                ? 'Listening back…'
                : 'Tap to answer out loud'}
          </p>
          {error && <p className="error">{error}</p>}
          {state === 'idle' && (
            <button className="link" onClick={() => setState('review')}>
              or type your answer
            </button>
          )}
        </div>
      )}
    </>
  )
}

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
)
const StopIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
)
