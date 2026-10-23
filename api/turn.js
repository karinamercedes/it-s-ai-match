import { body, needKey, claude } from './_lib.js'
import { agentSystem, PHASE_NOTES } from './_prompts.js'

// First name only: letters, spaces, hyphens and apostrophes, max 30 characters.
const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{M} '’-]/gu, '').trim().slice(0, 30)

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
        gender: agent.gender,
        interestedIn: agent.interestedIn,
        goal,
        profile: agent.profile,
      }),
      messages,
      maxTokens: 200,
    })

    const text = raw
      .replace(/\*[^*]*\*/g, '') // *laughs*
      .replace(/\[[^\]]*\]/g, '') // [pause]
      .replace(/^\s*(you|me|match|them)\s*:\s*/i, '')
      .replace(/^["“]|["”]$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    res.json({ text: text || '…' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
