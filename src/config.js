// The five profile questions. Answered by voice, no photos.
export const QUESTIONS = [
  'Who are you, in a few sentences?',
  'Describe your perfect Sunday.',
  'What always makes you laugh?',
  'What’s something you would never compromise on?',
  'What should your date know about you before saying hello?',
]

// Stock ElevenLabs voices: per gender, one British educational/narration voice and one
// American conversational voice. `style` is used to pick the fallback; `note` is shown on screen.
// If you typed your answers (or cloning fails), you get a conversational voice of your gender.
export const VOICES = {
  woman: [
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', style: 'educational', note: 'educational, velvety British' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', style: 'conversational', note: 'conversational, playful American' },
  ],
  man: [
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', style: 'narration', note: 'narration, warm storytelling British' },
    { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', style: 'conversational', note: 'conversational, down-to-earth American' },
  ],
}

// Your voice is cloned from your recorded answers, used for this one call, then deleted.
// Below this many recorded seconds we don't try (the clone would sound nothing like you).
export const MIN_CLONE_SECONDS = 10

// About two minutes: 14 lines, a "30 seconds left" cue at line 11,
// the last two lines are the decision (ask for a date / answer / let go).
export const CALL = { turns: 14, closingAt: 10, finalFrom: 12 }

export const MAX_RECORD_SECONDS = 60

export const GENDERS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
]
export const INTERESTS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'anyone', label: 'Anyone' },
]
export const GOALS = [
  { value: 'marriage', label: 'Marriage' },
  { value: 'casual', label: 'Something casual' },
  { value: 'friendship', label: 'Friendship' },
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const pool = (gender) =>
  gender === 'woman' ? VOICES.woman : gender === 'man' ? VOICES.man : [...VOICES.woman, ...VOICES.man]

export function setUpCall({ interestedIn }) {
  const matchGender =
    interestedIn === 'women' ? 'woman' : interestedIn === 'men' ? 'man' : pick(['woman', 'man', 'non-binary'])
  return {
    matchGender,
    first: Math.random() < 0.5 ? 'user' : 'match', // coin flip: nobody is told to lead
  }
}

// Stock voices for the call. With a clone, only the match needs one.
// Without, you get a conversational voice of your gender if there is one, otherwise whoever is left;
// the match never gets the same voice as you.
export function pickVoices({ gender, matchGender, cloned }) {
  let user = null
  if (!cloned) {
    const own = pool(gender)
    const conversational = own.filter((v) => v.style === 'conversational')
    user = pick(conversational.length ? conversational : own)
  }
  const left = pool(matchGender).filter((v) => v.id !== user?.id)
  return { user, match: pick(left.length ? left : pool(matchGender)) }
}

export const clonedVoice = (id) => ({ id, name: 'Your voice', note: 'cloned from your voice notes', cloned: true })
export const voiceLabel = (v) => (!v ? '' : v.cloned ? 'Your cloned voice' : `${v.name} · ${v.note}`)

// All three on one "About you" screen, stacked, three options per row.
export const CHOICES = [
  { key: 'gender', title: 'I am', options: GENDERS },
  { key: 'interestedIn', title: 'I’m interested in', options: INTERESTS },
  { key: 'goal', title: 'I’m looking for', options: GOALS },
]

// What the invented match is into, given your gender (same wording the server uses).
export const matchInterest = (userGender) =>
  userGender === 'woman' ? 'women' : userGender === 'man' ? 'men' : 'non-binary people'

// First bullet of each profile, e.g. "Woman · into men · something casual".
const label = (list, v) => list.find((o) => o.value === v)?.label || v
export const headline = (gender, interest, goal) =>
  `${label(GENDERS, gender)} · into ${String(label(INTERESTS, interest)).toLowerCase()} · ${String(label(GOALS, goal)).toLowerCase()}`
