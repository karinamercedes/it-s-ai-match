import { useState } from 'react'
import { r } from '../lib/reveal.js'

export default function Intro({ onStart }) {
  const [ok, setOk] = useState(false)

  return (
    <>
      <h1 className="title rv" style={r(0)}>
        It’s A<span className="grad">(I) Match</span>
      </h1>

      <div className="copy">
        <p className="rv" style={r(1)}>
          <em>It’s A(I) Match</em> is a dating app where you never have to date: the system finds the match and
          has the whole conversation for you.
        </p>
        <p className="rv" style={r(2)}>
          You just need to say who you are and what you’re looking for, answer five questions out loud, and
          press start. Then sit back and listen in while an AI version of you has a two-minute phone call with
          a match. You can pause, but you can’t join in.
        </p>
        <p className="rv" style={r(3)}>
          But, <strong>when AI flirts with AI, who seduces whom? And who’s the object of desire?</strong>
        </p>
      </div>

      <label className="check rv" style={r(4)}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>
          I agree to my voice notes being transcribed by AI, to my voice being cloned for this one call, and
          to an AI speaking on my behalf in this experiment. My cloned voice is deleted when the call ends.
          Nothing is saved.
        </span>
      </label>

      <button className="btn rv" style={r(4.5)} disabled={!ok} onClick={onStart}>
        <span className="grad">Start my profile</span>
      </button>
    </>
  )
}
