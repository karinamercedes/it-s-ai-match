import { useEffect, useState } from 'react'
import Art from './components/Art.jsx'
import Intro from './components/Intro.jsx'
import Rules from './components/Rules.jsx'
import About from './components/About.jsx'
import Question from './components/Question.jsx'
import Call from './components/Call.jsx'
import Result from './components/Result.jsx'
import { QUESTIONS } from './config.js'

const EMPTY_PREFS = { name: '', city: '', gender: '', interestedIn: '', goal: '' }

export default function App() {
  const [index, setIndex] = useState(0)
  const [run, setRun] = useState(0) // bump to wipe every screen's state
  const [prefs, setPrefs] = useState(EMPTY_PREFS)
  const [answers, setAnswers] = useState(() => QUESTIONS.map(() => ''))
  const [samples, setSamples] = useState(() => QUESTIONS.map(() => null)) // voice notes, memory only
  const [outcome, setOutcome] = useState(null)

  const profile = QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n')
  const goTo = (i) => setIndex(i)

  function restart() {
    // Nothing is stored anywhere: clearing state is the whole "delete".
    setPrefs(EMPTY_PREFS)
    setAnswers(QUESTIONS.map(() => ''))
    setSamples(QUESTIONS.map(() => null))
    setOutcome(null)
    setRun((r) => r + 1)
    setIndex(0)
  }

  const slides = []
  const add = (id, art, render, artProps) => slides.push({ id, art, render, artProps, at: slides.length })

  add('intro', 'intro', (at) => <Intro onStart={() => goTo(at + 1)} />)
  add('rules', 'rules', (at) => <Rules onNext={() => goTo(at + 1)} />)
  add('about', 'choice', (at) => (
    <About
      value={prefs}
      onPick={(key, v) => setPrefs((p) => ({ ...p, [key]: v }))}
      onNext={() => goTo(at + 1)}
    />
  ))
  QUESTIONS.forEach((q, k) =>
    add(
      `q${k}`,
      'question',
      (at) => (
        <Question
          n={k + 1}
          total={QUESTIONS.length}
          question={q}
          onConfirm={(text, sample) => {
            setAnswers((a) => a.map((x, j) => (j === k ? text : x)))
            setSamples((a) => a.map((x, j) => (j === k ? sample : x)))
            goTo(at + 1)
          }}
        />
      ),
      { n: k + 1 }
    )
  )
  add('call', 'call', (at) =>
    index >= at ? (
      <Call
        profile={profile}
        prefs={prefs}
        answers={answers}
        samples={samples}
        onDone={(o) => {
          setOutcome(o)
          goTo(at + 1)
        }}
        onLeave={restart}
      />
    ) : null
  )
  add('result', 'result', () => (outcome ? <Result outcome={outcome} onRestart={restart} /> : null))

  const last = slides.length - 1
  const current = slides[index]
  const canGoBack = index > 0 && !['call', 'result'].includes(current.id)

  // Light that follows the pointer on buttons.
  useEffect(() => {
    const onMove = (e) => {
      const el = e.target.closest?.('.btn, .option, .mic')
      if (!el) return
      const b = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - b.left}px`)
      el.style.setProperty('--my', `${e.clientY - b.top}px`)
    }
    document.addEventListener('pointermove', onMove)
    return () => document.removeEventListener('pointermove', onMove)
  }, [])

  // Keyboard: ↑ or ← goes back (not while typing).
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('textarea, input')) return
      if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && canGoBack) setIndex((i) => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canGoBack])

  return (
    <div className="stage" onScroll={(e) => { e.currentTarget.scrollTop = 0; e.currentTarget.scrollLeft = 0 }}>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${(index / last) * 100}%` }} />
      </div>

      <header className={`topbar ${index === 0 ? 'on-intro' : ''}`}>
        <button
          className="back"
          onClick={() => setIndex(index - 1)}
          disabled={!canGoBack}
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="logo">
          It’s A<span className="grad">(I) Match</span>
        </span>
      </header>

      {/* Screens stack vertically: moving on feels like a smooth scroll down, but only on click. */}
      <div className="track" style={{ transform: `translate3d(0, ${-index * 100}%, 0)` }}>
        {slides.map((s) => {
          const active = s.at === index
          return (
            <section
              key={`${run}-${s.id}`}
              className={`slide slide-${s.id} ${['rules', 'call'].includes(s.id) ? 'wide' : ''} ${active ? 'active' : ''}`}
              aria-hidden={!active}
              inert={active ? undefined : ''}
            >
              <div className="content">
                <div className="inner">{s.render(s.at)}</div>
              </div>
              <Art kind={s.art} {...s.artProps} />
            </section>
          )
        })}
      </div>
    </div>
  )
}
