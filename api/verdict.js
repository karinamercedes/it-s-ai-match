import { body, needKey, claude } from './_lib.js'
import { VERDICT_PROMPT } from './_prompts.js'

// Reads the finished call and says whether it's a match.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ANTHROPIC_API_KEY')) return

  try {
    const { history = [] } = body(req)
    const transcript = history
      .map((h) => `${h.speaker === 'user' ? 'YOU' : 'MATCH'}: ${h.text}`)
      .join('\n')
    const raw = await claude({
      system: VERDICT_PROMPT,
      messages: [{ role: 'user', content: transcript }],
      maxTokens: 200,
    })
    const json = raw.match(/\{[\s\S]*\}/)
    const out = json ? JSON.parse(json[0]) : {}
    res.json({
      outcome: out.outcome || 'unclear',
      youWantDate: !!out.youWantDate,
      matchWantsDate: !!out.matchWantsDate,
      line: out.line || '',
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
