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
        <div className="group">
          <div className="field-row">
            <div>
              <label className="legend" htmlFor="your-name">Your name</label>
              <input
                id="your-name"
                className="name-input"
                type="text"
                maxLength={30}
                autoComplete="off"
                placeholder="Optional"
                value={value.name}
                onChange={(e) => onPick('name', e.target.value)}
              />
            </div>
            <div>
              <label className="legend" htmlFor="your-city">Your city</label>
              <input
                id="your-city"
                className="name-input"
                type="text"
                maxLength={40}
                autoComplete="off"
                placeholder="Optional"
                value={value.city}
                onChange={(e) => onPick('city', e.target.value)}
              />
            </div>
          </div>
          <p className="field-note">
            Your real name, a made-up one, or none at all. Leave it blank and your AI won’t share a name. Your
            city is optional too, but recommended for a local match. Neither is ever stored.
          </p>
        </div>
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
