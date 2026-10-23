import { useState } from 'react'
import { createPortal } from 'react-dom'
import { r } from '../lib/reveal.js'
import { voiceLabel, QUESTIONS } from '../config.js'

const TITLES = {
  match: ['It’s a ', 'date.'],
  'no-match': ['No second ', 'call.'],
  unclear: ['Hard to ', 'tell.'],
}

export default function Result({ outcome, onRestart }) {
  const { history = [], verdict = {}, setup, cast, wasCloned, matchAnswers = [], matchName = '', prefs = {} } =
    outcome || {}
  const [a, b] = TITLES[verdict.outcome] || TITLES.unclear
  const [copied, setCopied] = useState(false)

  // Who says what, e.g. "Kappa (you): …" / "Marcus (match): …"
  const userName = prefs.name?.trim()
  const who = (speaker) =>
    speaker === 'user' ? (userName ? `${userName} (you)` : 'You') : matchName ? `${matchName} (match)` : 'Match'
  const transcript = history.map((l) => `${who(l.speaker)}: ${l.text}`).join('\n\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(transcript)
    } catch {
      // older browsers
      const t = document.createElement('textarea')
      t.value = transcript
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="head rv" style={r(0)}>
        <p className="eyebrow">After the call</p>
        <h2 className="h">
          {a}
          <span className="grad">{b}</span>
        </h2>
      </header>
      {verdict.line && (
        <div className="copy rv" style={r(1)}>
          <p>{verdict.line}</p>
        </div>
      )}

      <dl className="facts rv" style={r(2)}>
        <div><dt>Your AI wanted a date</dt><dd>{verdict.youWantDate ? 'Yes' : 'No'}</dd></div>
        <div><dt>Your match wanted a date</dt><dd>{verdict.matchWantsDate ? 'Yes' : 'No'}</dd></div>
        <div><dt>Who spoke first</dt><dd>{setup?.first === 'user' ? 'Your AI' : 'The match'}</dd></div>
        {cast && <div><dt>Your AI’s voice</dt><dd>{voiceLabel(cast.voices.user)}</dd></div>}
        {cast && <div><dt>Your match’s voice</dt><dd>{voiceLabel(cast.voices.match)}</dd></div>}
        {wasCloned && <div><dt>Your cloned voice</dt><dd>Deleted</dd></div>}
      </dl>

      <details className="heard rv" style={r(3)}>
        <summary>Read the whole call</summary>
        <ol className="transcript">
          {history.map((l, i) => (
            <li key={i} className={l.speaker}>
              <span className="who">{who(l.speaker)}</span>
              {l.text}
            </li>
          ))}
        </ol>
      </details>

      <div className="tools rv" style={r(3.2)}>
        <button className="tool" onClick={copy}>
          <CopyIcon /> {copied ? 'Copied' : 'Copy conversation'}
        </button>
        <button className="tool" onClick={() => window.print()}>
          <PrintIcon /> Print conversation
        </button>
      </div>

      {/* Only this prints: the conversation, who says what. Rendered outside the app so nothing else gets in. */}
      {createPortal(
        <div className="print-sheet">
          <h1>It’s A(I) Match: call transcript</h1>
          <p className="print-meta">{new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</p>
          {history.map((l, i) => (
            <p key={i}>
              <strong>{who(l.speaker)}:</strong> {l.text}
            </p>
          ))}
        </div>,
        document.body
      )}

      {matchAnswers.length > 0 && (
        <details className="heard rv" style={r(3.5)}>
          <summary>Read {matchName ? `${matchName}’s` : 'your match’s'} profile (invented by AI)</summary>
          <dl className="qa">
            {QUESTIONS.map((q, i) => (
              <div key={i}>
                <dt>{q}</dt>
                <dd>{matchAnswers[i]}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <blockquote className="rv" style={r(4)}>Your voice is destroyed after the date.</blockquote>

      <button className="btn rv" style={r(5)} onClick={onRestart}>
        <span className="grad">Start again</span>
      </button>
    </>
  )
}

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
)
const PrintIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 9V4h10v5" />
    <rect x="4" y="9" width="16" height="7" rx="2" />
    <path d="M7 14h10v6H7z" />
  </svg>
)
