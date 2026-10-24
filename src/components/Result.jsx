import { useState } from 'react'
import { createPortal } from 'react-dom'
import { r } from '../lib/reveal.js'
import { voiceLabel, QUESTIONS, headline, matchInterest } from '../config.js'
import { renderCall } from '../lib/phone.js'

const TITLES = {
  match: ['It’s a ', 'date.'],
  'no-match': ['No second ', 'call.'],
  unclear: ['Hard to ', 'tell.'],
}

export default function Result({ outcome, onRestart }) {
  const {
    history = [], verdict = {}, setup, cast, wasCloned, matchAnswers = [], matchName = '', prefs = {}, audio = [],
    matchSummary = [], userAnswers = [], userSummary = [],
  } = outcome || {}
  const [a, b] = TITLES[verdict.outcome] || TITLES.unclear
  const [saving, setSaving] = useState(false)

  // Builds the file on this phone from the audio you heard, then saves it. Nothing is uploaded.
  async function downloadAudio() {
    setSaving(true)
    try {
      const blob = await renderCall(audio)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
      a.href = url
      a.download = `its-ai-match-call-${stamp}.wav`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } finally {
      setSaving(false)
    }
  }

  // Who says what, e.g. "Kappa (you): …" / "Marcus (match): …"
  const userName = prefs.name?.trim()
  const who = (speaker) =>
    speaker === 'user' ? (userName ? `${userName} (you)` : 'You') : matchName ? `${matchName} (match)` : 'Match'

  // Recap: the call, both profiles and the conversation, on one printable sheet.
  // The print dialog also saves it as a PDF, on laptop and phone.
  const profiles = [
    {
      title: userName ? `${userName} (you)` : 'You',
      head: headline(prefs.gender, prefs.interestedIn, prefs.goal),
      voice: cast ? voiceLabel(cast.voices.user) : '',
      summary: userSummary,
      answers: userAnswers,
    },
    {
      title: `${matchName || 'Your match'} (invented by AI)`,
      head: headline(setup?.matchGender, matchInterest(prefs.gender), prefs.goal),
      voice: cast ? voiceLabel(cast.voices.match) : '',
      summary: matchSummary,
      answers: matchAnswers,
    },
  ]

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

      {matchAnswers.length > 0 && (
        <details className="heard rv" style={r(3.1)}>
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

      <div className="tools rv" style={r(3.2)}>
        <button className="tool" onClick={() => window.print()}>
          <PrintIcon /> Download or print recap
        </button>
      </div>

      {audio.length > 0 && (
        <div className="download rv" style={r(3.3)}>
          <button className="tool" onClick={downloadAudio} disabled={saving}>
            <DownloadIcon /> {saving ? 'Preparing audio…' : 'Download audio'}
          </button>
          <p className="field-note">
            {wasCloned
              ? 'This file contains your cloned voice. It’s yours: keep it or delete it. If you download it, it’s the only copy anywhere. If you don’t, nothing remains.'
              : 'We keep nothing. Download it and it’s the only copy; leave this page and the call is gone.'}
          </p>
        </div>
      )}

      {/* Only this prints. Rendered outside the app so nothing else gets in. */}
      {createPortal(
        <div className="print-sheet">
          <h1>It’s A(I) Match: call recap</h1>
          <p className="print-meta">{new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</p>

          <h2>The call</h2>
          <p>
            <strong>{a + b}</strong> {verdict.line}
          </p>
          <ul>
            <li>Your AI wanted a date: {verdict.youWantDate ? 'yes' : 'no'}</li>
            <li>Your match wanted a date: {verdict.matchWantsDate ? 'yes' : 'no'}</li>
            <li>Who spoke first: {setup?.first === 'user' ? 'your AI' : 'the match'}</li>
            {wasCloned && <li>Your cloned voice: deleted after the call</li>}
          </ul>

          {profiles.map((pr) => (
            <section key={pr.title}>
              <h2>{pr.title}</h2>
              <p className="print-meta">
                {pr.head}
                {pr.voice && ` · Voice: ${pr.voice}`}
              </p>
              {pr.summary.length > 0 && (
                <ul>
                  {pr.summary.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              )}
              {QUESTIONS.map((q, i) => (
                <p key={i}>
                  <strong>{q}</strong>
                  <br />
                  {pr.answers[i]}
                </p>
              ))}
            </section>
          ))}

          <h2>Conversation</h2>
          {history.map((l, i) => (
            <p key={i}>
              <strong>{who(l.speaker)}:</strong> {l.text}
            </p>
          ))}
        </div>,
        document.body
      )}

      <blockquote className="rv" style={r(4)}>Your voice is destroyed after the date.</blockquote>

      <button className="btn rv" style={r(5)} onClick={onRestart}>
        <span className="grad">Start again</span>
      </button>
    </>
  )
}

const PrintIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 9V4h10v5" />
    <rect x="4" y="9" width="16" height="7" rx="2" />
    <path d="M7 14h10v6H7z" />
  </svg>
)
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
)
