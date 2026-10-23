import { r } from '../lib/reveal.js'

const YOU = [
  'Tell us who you are and who you’re looking for.',
  'Answer five questions out loud, or type them.',
  'Check what we heard and fix anything that’s wrong.',
  'Press start and listen in.',
]
const AIS = [
  'It’s one short phone call instead of endless messaging.',
  'Talk like a real person, using what you said about yourself.',
  'Listen and react. Nobody has to agree or impress.',
  'At the end, either side can ask for a date or say no.',
  'Your match is a person invented by AI, who answered the same five questions.',
]

export default function Rules({ onNext }) {
  return (
    <>
      <header className="head rv" style={r(0)}>
        <p className="eyebrow">Before you start</p>
        <h2 className="h">
          House <span className="grad">rules</span>
        </h2>
      </header>

      <div className="rules-grid">
        <div className="rv" style={r(1)}>
          <h3>What you do</h3>
          <ol className="numbered">
            {YOU.map((t, k) => (
              <li key={k}>{t}</li>
            ))}
          </ol>
        </div>
        <div className="rv" style={r(2)}>
          <h3>What both AIs are told</h3>
          <ul className="bullets">
            {AIS.map((t, k) => (
              <li key={k}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <blockquote className="rv" style={r(3)}>Your voice is destroyed after the date.</blockquote>

      <button className="btn rv" style={r(3.4)} onClick={onNext}>
        <span className="grad">Got it</span>
      </button>
    </>
  )
}
