import { body, needKey, claude, cleanText } from './_lib.js'
import { agentSystem, PHASE_NOTES } from './_prompts.js'

// First name only: letters, spaces, hyphens and apostrophes, max 30 characters.
const clean = (raw) =>
  raw
    .replace(/\*[^*]*\*/g, '') // *laughs*
    .replace(/\[[^\]]*\]/g, '') // [pause]
    .replace(/\([^)]*\)/g, '') // (smiles)
    .replace(/^\s*\p{L}+(?: \p{L}+)?\s*:\s*/u, '') // "Marcus:" label
    .replace(/^["“]|["”]$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
const spoken = (t) => /\p{L}{2,}/u.test(t) // at least one real word

const cleanName = (n) => cleanText(n, 30)

// Writes the next line of the call for one of the two AI stand-ins.
// history: [{ speaker: 'user' | 'match', text }]
// me: which stand-in is speaking now
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ANTHROPIC_API_KEY')) return

  try {
    const { me, agent = {}, goal, history = [], phase = 'middle' } = body(req)

    // From this speaker's point of view: own lines = assistant, the other's = user.
    const messages = []
    if (history.length === 0) messages.push({ role: 'user', content: PHASE_NOTES.open })
    for (const h of history) {
      messages.push({ role: h.speaker === me ? 'assistant' : 'user', content: h.text })
    }
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'user') return res.status(400).json({ error: 'Not this speaker’s turn' })
    if (PHASE_NOTES[phase] && phase !== 'open') last.content += `\n\n${PHASE_NOTES[phase]}`

    const raw = await claude({
      system: agentSystem({
        name: cleanName(agent.name),
        city: cleanText(agent.city, 40),
        gender: agent.gender,
        interestedIn: agent.interestedIn,
        goal,
        profile: agent.profile,
      }),
      messages,
      maxTokens: 150,
    })

    let text = clean(raw)
    // A reply that was only a stage direction ("[hangs up]") would be silence on the call.
    // Ask again, words only. This is what made the match go quiet in testing.
    if (!spoken(text)) {
      const retry = await claude({
        system: agentSystem({
          name: cleanName(agent.name),
          city: cleanText(agent.city, 40),
          gender: agent.gender,
          interestedIn: agent.interestedIn,
          goal,
          profile: agent.profile,
        }),
        messages: [
          ...messages.slice(0, -1),
          { role: 'user', content: `${last.content}\n\n[Say your line out loud. Spoken words only, no actions or brackets.]` },
        ],
        maxTokens: 150,
      })
      text = clean(retry)
    }
    if (!spoken(text)) throw new Error('No spoken line came back')

    res.json({ text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
