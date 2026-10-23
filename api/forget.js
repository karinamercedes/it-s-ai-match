import { body, needKey, CLONE_PREFIX as PREFIX } from './_lib.js'

// "Your voice is destroyed after the date": deletes the temporary clone.
// Only voices this app created (named itsaimatch-…) can be deleted through here.
const API = 'https://api.elevenlabs.io/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ELEVENLABS_API_KEY')) return

  try {
    const { voiceId } = body(req)
    if (!voiceId || !/^[A-Za-z0-9]+$/.test(voiceId)) return res.status(400).json({ error: 'Bad voice id' })
    const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY }

    const info = await fetch(`${API}/voices/${voiceId}`, { headers })
    if (!info.ok) return res.json({ deleted: false })
    const voice = await info.json()
    if (!voice.name?.startsWith(PREFIX)) return res.status(403).json({ error: 'Not a clone made by this app' })

    const r = await fetch(`${API}/voices/${voiceId}`, { method: 'DELETE', headers })
    res.json({ deleted: r.ok })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
