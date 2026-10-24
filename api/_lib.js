// Shared helpers for the serverless functions. Files starting with "_" are not routes on Vercel.

// Every temporary voice clone is named with this prefix, so only ours can ever be deleted.
export const CLONE_PREFIX = 'itsaimatch-'

export function body(req) {
  const b = req.body
  if (!b) return {}
  if (typeof b === 'string') {
    try { return JSON.parse(b) } catch { return {} }
  }
  return b
}

// Free text from the user (name, city): letters, spaces, hyphens, apostrophes, full stops only.
export const cleanText = (t, max = 30) => String(t || '').replace(/[^\p{L}\p{M} '’.-]/gu, '').trim().slice(0, max)

export function needKey(res, name) {
  if (!process.env[name]) {
    res.status(500).json({ error: `${name} is not set on the server` })
    return false
  }
  return true
}

export async function claude({ system, messages, maxTokens = 300, temperature, wholeSentences = false }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: maxTokens,
      ...(temperature !== undefined && { temperature }),
      system,
      messages,
    }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || `Anthropic error ${r.status}`)
  let text = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
  // If the reply hit the length cap, drop the unfinished sentence so nothing is cut off mid-word.
  if (wholeSentences && data.stop_reason === 'max_tokens') {
    const end = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'), text.lastIndexOf('…'))
    if (end > 20) text = text.slice(0, end + 1)
  }
  return text
}

// Pulls the first {...} block out of a model reply and parses it.
export function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('The model didn’t return JSON')
  return JSON.parse(m[0])
}
