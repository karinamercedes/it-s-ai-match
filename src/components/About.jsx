import { CHOICES } from '../config.js'
import { r } from '../lib/reveal.js'

// "About you": I am / I'm interested in / I'm looking for, all on one screen.
export default function About({ value, onPick, onNext }) {
  const ready = CHOICES.every((c) => value[c.key])

  return (
    <>
      <header className="head rv" style={r(0)}>
        <p className="eyebrow">About you</p>
        <h2 className="h">
          Who are you <span className="grad">looking for?</span>
        </h2>
      </header>

      <div className="groups rv" style={r(0)}>
        {CHOICES.map((c) => (
          <fieldset key={c.key} className="group">
            <legend>{c.title}</legend>
            <div className="options" role="radiogroup" aria-label={c.title}>
              {c.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={value[c.key] === o.value}
                  className={`option ${value[c.key] === o.value ? 'on' : ''}`}
                  onClick={() => onPick(c.key, o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <button className="btn rv" style={r(0)} disabled={!ready} onClick={onNext}>
        <span className="grad">Continue</span>
      </button>
    </>
  )
}
