import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CALL, QUESTIONS, MIN_CLONE_SECONDS, setUpCall, pickVoices, clonedVoice, voiceLabel, matchInterest, headline,
} from '../config.js'
import * as api from '../lib/api.js'
import { PhoneLine } from '../lib/phone.js'
import { r } from '../lib/reveal.js'

const other = (s) => (s === 'user' ? 'match' : 'user')
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// Why we couldn't use your own voice.
const FALLBACK = {
  typed: 'You typed your answers, so we couldn’t clone your voice and have given you this one instead.',
  short: 'Your voice notes were too short to clone, so we’ve given you this voice instead.',
  failed: 'We couldn’t clone your voice this time, so we’ve given you this voice instead.',
}

export default function Call({ profile, prefs, answers = [], samples = [], onDone, onLeave }) {
  const setup = useMemo(() => setUpCall(prefs), [prefs])
  const recorded = useMemo(() => samples.filter(Boolean), [samples])
  const seconds = recorded.reduce((t, s) => t + s.seconds, 0)
  const canClone = seconds >= MIN_CLONE_SECONDS

  // Voices are chosen up front so the profile columns can say who will be speaking.
  const plan = useMemo(
    () => ({
      ifCloned: pickVoices({ gender: prefs.gender, matchGender: setup.matchGender, cloned: true }),
      ifNot: pickVoices({ gender: prefs.gender, matchGender: setup.matchGender, cloned: false }),
    }),
    [prefs, setup]
  )
  const preset = canClone ? null : plan.ifNot

  // The two profiles: your answers summarised, and the match invented by AI from the same questions.
  const [profiles, setProfiles] = useState({ state: 'loading' })
  const [profilesTry, setProfilesTry] = useState(0)
  useEffect(() => {
    let ignore = false
    setProfiles({ state: 'loading' })
    api
      .profiles({ questions: QUESTIONS, answers, userGender: prefs.gender, matchGender: setup.matchGender, goal: prefs.goal, city: prefs.city })
      .then((p) => !ignore && setProfiles({ state: 'ready', ...p }))
      .catch((e) => !ignore && setProfiles({ state: 'error', error: e.message }))
    return () => {
      ignore = true
    }
  }, [profilesTry])
  const [cast, setCast] = useState(() =>
    preset ? { voices: preset, fallback: seconds > 0 ? 'short' : 'typed' } : null
  )

  const [status, setStatus] = useState('ready') // ready | cloning | ringing | live | ending | error
  const [lines, setLines] = useState([])
  const [speaking, setSpeaking] = useState(null)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [subtitles, setSubtitles] = useState(true)
  const [error, setError] = useState('')
  const phone = useRef(null)
  const stopped = useRef(false)
  const cloneId = useRef(null)
  const t0 = useRef(0)
  const listEnd = useRef(null)

  // Your voice is destroyed after the date: called when the call ends, on hang-up, on errors,
  // when this screen goes away and when the page is closed.
  function destroyClone() {
    api.forget(cloneId.current)
    cloneId.current = null
  }

  useEffect(() => {
    window.addEventListener('pagehide', destroyClone)
    return () => {
      window.removeEventListener('pagehide', destroyClone)
      stopped.current = true
      phone.current?.close()
      destroyClone()
    }
  }, [])

  useEffect(() => {
    if (status !== 'live') return
    const id = setInterval(() => setElapsed(phone.current.now - t0.current), 250)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [lines])

  async function start() {
    stopped.current = false
    setLines([])
    setError('')
    const line = new PhoneLine()
    phone.current = line
    await line.resume() // must happen on the tap, for iPhone

    try {
      // 1. Your voice: clone it, or fall back to a stock voice.
      let voices = preset
      let fallback = cast?.fallback || null
      let cloneError = ''
      if (canClone) {
        setStatus('cloning')
        let id = null
        try {
          id = (await api.clone(recorded)).voiceId
        } catch (e) {
          fallback = 'failed'
          cloneError = e.message // shown small under the note, so tests can tell why
        }
        cloneId.current = id
        if (stopped.current) return destroyClone()
        const stock = id ? plan.ifCloned : plan.ifNot
        voices = { user: id ? clonedVoice(id) : stock.user, match: stock.match }
        if (id) fallback = null
      }
      setCast({ voices, fallback, cloneError })

      // 2. The call.
      const matchProfile = QUESTIONS.map((q, i) => `Q: ${q}\nA: ${profiles.match?.answers?.[i] || ''}`).join('\n\n')
      const agents = {
        user: { name: prefs.name?.trim(), city: prefs.city, gender: prefs.gender, interestedIn: prefs.interestedIn, profile },
        match: {
          name: profiles.match?.name,
          city: prefs.city, // same city as you: a date has to be possible
          gender: setup.matchGender,
          interestedIn: matchInterest(prefs.gender),
          profile: matchProfile,
        },
      }
      // One line of the call: written, then voiced. A failed request is retried once.
      const once = async (speaker, history, phase) => {
        const { text, hungUp } = await api.turn({ me: speaker, agent: agents[speaker], goal: prefs.goal, history, phase })
        if (hungUp) return { speaker, text: '', hungUp: true, phase }
        const buffer = await line.decode(await api.speak(text, voices[speaker].id))
        return { speaker, text, buffer, phase }
      }
      const prepare = (speaker, history, phase) =>
        once(speaker, history, phase).catch(() => once(speaker, history, phase))

      // Which moment of the call the next line falls in, judged by the time it will start.
      const phaseAt = (seconds, i) =>
        i === 0 ? 'open' : seconds >= CALL.finalAt || i >= CALL.maxTurns - 2 ? 'final' : seconds >= CALL.closingAt ? 'closing' : 'middle'

      setStatus('ringing')
      const history = []
      let pending = prepare(setup.first, [], 'open')
      pending.catch(() => {})
      let finals = 0
      await line.ring()
      if (stopped.current) return
      t0.current = line.now
      setStatus('live')

      for (let i = 0; i < CALL.maxTurns; i++) {
        const turn = await pending
        if (stopped.current) return
        if (turn.hungUp) {
          // This side ended the call without a word. Note it in the transcript and hang up.
          history.push({ speaker: turn.speaker, text: '(hangs up)', hungUp: true })
          setLines([...history])
          break
        }
        history.push({ speaker: turn.speaker, text: turn.text })
        if (turn.phase === 'final') finals++
        // Each side gets one final line, then the call ends.
        const more = finals < 2 && i + 1 < CALL.maxTurns
        if (more) {
          const startsAt = line.now - t0.current + turn.buffer.duration
          pending = prepare(other(turn.speaker), [...history], finals > 0 ? 'final' : phaseAt(startsAt, i + 1))
          pending.catch(() => {})
        }
        setLines([...history])
        setSpeaking(turn.speaker)
        await line.play(turn.buffer)
        setSpeaking(null)
        if (stopped.current) return
        if (!more) break
      }

      // 3. Hang up and destroy the clone straight away, before anything else.
      const wasCloned = !!cloneId.current
      destroyClone()
      setStatus('ending')
      await line.hangup()
      const v = await api.verdict(history)
      line.close()
      if (!stopped.current)
        onDone({ history, verdict: v, setup, prefs, cast: { voices, fallback }, wasCloned, matchAnswers: profiles.match?.answers || [], matchName: profiles.match?.name || '', matchSummary: profiles.match?.summary || [] })
    } catch (e) {
      destroyClone()
      if (!stopped.current) {
        setError(e.message)
        setStatus('error')
        line.close()
      }
    }
  }

  async function togglePause() {
    if (paused) await phone.current.resume()
    else await phone.current.pause()
    setPaused(!paused)
  }

  function leave() {
    stopped.current = true
    phone.current?.close()
    destroyClone()
    onLeave()
  }

  const note = cast?.fallback && cast.voices?.user && (
    <p className="voice-note">
      <strong>{cast.voices.user.name}</strong> is speaking for you. {FALLBACK[cast.fallback]}
      {cast.cloneError && <span className="reason">Reason: {cast.cloneError}</span>}
    </p>
  )

  if (status === 'ready' || status === 'error') {
    const shown = canClone ? plan.ifCloned : plan.ifNot
    const userVoice = canClone ? 'Your cloned voice' : voiceLabel(shown.user)
    const loading = profiles.state === 'loading'
    const columns = [
      {
        title: prefs.name?.trim() ? `You · ${prefs.name.trim()}` : 'You',
        voice: userVoice,
        bullets: [headline(prefs.gender, prefs.interestedIn, prefs.goal, prefs.city?.trim()), ...(profiles.user?.summary || [])],
        waiting: 'Reading your answers…',
      },
      {
        title: profiles.match?.name ? `Your match · ${profiles.match.name}` : 'Your match',
        voice: voiceLabel(shown.match),
        bullets: [headline(setup.matchGender, matchInterest(prefs.gender), prefs.goal, prefs.city?.trim()), ...(profiles.match?.summary || [])],
        waiting: 'Inventing your match…',
      },
    ]

    return (
      <>
        <header className="head rv" style={r(0)}>
          <p className="eyebrow">{status === 'error' ? 'The line dropped' : 'It’s a match'}</p>
          <h2 className="h">
            {status === 'error' ? (
              <>Let’s try <span className="grad">that again.</span></>
            ) : (
              <>Your AI is about to <span className="grad">call them.</span></>
            )}
          </h2>
        </header>

        <div className="rules-grid profiles">
          {columns.map((c, k) => (
            <div key={c.title} className="rv" style={r(1 + k)}>
              <h3>{c.title}</h3>
              <p className="voice-line">Voice: {c.voice}</p>
              {k === 0 && status === 'ready' && note}
              <ul className="bullets" key={profiles.state}>
                {(loading ? c.bullets.slice(0, 1) : c.bullets).map((b, i) => (
                  <li key={i} className="rv" style={{ '--d0': '0s', '--step': '0.15s', '--i': i }}>{b}</li>
                ))}
                {loading && <li className="waiting">{c.waiting}</li>}
              </ul>
            </div>
          ))}
        </div>

        {profiles.state === 'error' && (
          <p className="error rv" style={r(3)}>
            We couldn’t build the profiles: {profiles.error}{' '}
            <button className="link" onClick={() => setProfilesTry((n) => n + 1)}>Try again</button>
          </p>
        )}

        {status === 'error' ? (
          <p className="error rv" style={r(3)}>{error}</p>
        ) : (
          <div className="copy">
            <p className="rv" style={r(3)}>
              Put your headphones in. You’ll hear about two minutes of conversation. You can pause at any time,
              but you can’t speak.
              {canClone && ' Your AI speaks in a clone of your voice, deleted as soon as the call ends.'}
            </p>
          </div>
        )}
        <button className="btn rv" style={r(3.6)} onClick={start} disabled={profiles.state !== 'ready'}>
          <span className="grad">
            {loading ? 'Getting ready…' : status === 'error' ? 'Call again' : 'Listen in'}
          </span>
        </button>
        <button className="link rv" style={r(4)} onClick={leave}>Start over</button>
      </>
    )
  }

  const label =
    status === 'cloning'
      ? 'Cloning your voice…'
      : status === 'ringing'
        ? 'Ringing…'
        : status === 'ending'
          ? 'Call ended · your voice has been deleted'
          : paused
            ? 'Paused'
            : 'On the call'

  return (
    <div className="live-call" style={{ '--d0': '0s', '--step': '0.12s' }}>
      <header className="head rv" style={r(0)}>
        <p className="eyebrow">{label}</p>
        <div className="timer">{mmss(elapsed)}</div>
      </header>

      <div className="people rv" style={r(1)}>
        <Person label="You" voice={cast ? voiceLabel(cast.voices.user) : '…'} active={speaking === 'user' && !paused} />
        <Person label="Your match" voice={cast ? voiceLabel(cast.voices.match) : '…'} active={speaking === 'match' && !paused} />
      </div>

      {note && <div className="rv" style={r(1.5)}>{note}</div>}

      <div className="controls rv" style={r(2)}>
        <button className="btn small" onClick={togglePause} disabled={status !== 'live'}>
          <span className="grad">{paused ? 'Resume' : 'Pause'}</span>
        </button>
        <button className="link" onClick={() => setSubtitles(!subtitles)}>
          {subtitles ? 'Hide subtitles' : 'Show subtitles'}
        </button>
      </div>

      {subtitles && (
        <ol className="transcript live rv" style={r(3)}>
          {lines.map((l, i) => (
            <li key={i} className={`${l.speaker} ${l.hungUp ? 'hung-up' : ''}`}>
              <span className="who">{l.speaker === 'user' ? 'You' : 'Match'}</span>
              {l.text}
            </li>
          ))}
          <li ref={listEnd} aria-hidden="true" className="end" />
        </ol>
      )}

      <button className="link rv" style={r(4)} onClick={leave}>Hang up and start over</button>
    </div>
  )
}

function Person({ label, voice, active }) {
  return (
    <div className={`person ${active ? 'active' : ''}`}>
      <div className="avatar">
        <span />
      </div>
      <strong>{label}</strong>
      <span>{voice}</span>
    </div>
  )
}
