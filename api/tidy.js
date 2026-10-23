import { body, needKey, claude } from './_lib.js'
import { TIDY_PROMPT } from './_prompts.js'

// Raw transcription → cleaned text the user then confirms or edits.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ANTHROPIC_API_KEY')) return

  try {
    const { question = '', text = '' } = body(req)
    if (!text.trim()) return res.json({ text: '' })
    const cleaned = await claude({
      system: TIDY_PROMPT,
      messages: [{ role: 'user', content: `Question: ${question}\n\nTranscription:\n${text}` }],
      maxTokens: 500,
    })
    res.json({ text: cleaned })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
