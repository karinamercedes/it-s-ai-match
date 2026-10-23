import { r } from '../lib/reveal.js'
import { voiceLabel, QUESTIONS } from '../config.js'

const TITLES = {
  match: ['It’s a ', 'date.'],
  'no-match': ['No second ', 'call.'],
  unclear: ['Hard to ', 'tell.'],
}

export default function Result({ outcome, onRestart }) {
  const { history = [], verdict = {}, setup, cast, wasCloned, matchAnswers = [], matchName = '' } = outcome || {}
  const [a, b] = TITLES[verdict.outcome] || TITLES.unclear

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
              <span className="who">{l.speaker === 'user' ? 'You' : 'Match'}</span>
              {l.text}
            </li>
          ))}
        </ol>
      </details>

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
