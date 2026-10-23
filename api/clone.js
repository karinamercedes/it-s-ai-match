import { body, needKey, CLONE_PREFIX as PREFIX } from './_lib.js'

// Instant voice clone from the user's recorded answers.
// Every clone is named "itsaimatch-<timestamp>" so we can find and delete it:
// the browser deletes it when the call ends (/api/forget), and as a safety net
// every new clone first sweeps away any of ours older than 30 minutes.

const API = 'https://api.elevenlabs.io/v1'
const headers = () => ({ 'xi-api-key': process.env.ELEVENLABS_API_KEY })

async function sweepOldClones() {
  try {
    const r = await fetch(`${API}/voices`, { headers: headers() })
    if (!r.ok) return
    const { voices = [] } = await r.json()
    const old = voices.filter((v) => {
      if (!v.name?.startsWith(PREFIX)) return false
      const t = Number(v.name.slice(PREFIX.length).split('-')[0])
      return t && Date.now() - t > 30 * 60 * 1000
    })
    await Promise.all(old.map((v) => fetch(`${API}/voices/${v.voice_id}`, { method: 'DELETE', headers: headers() })))
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ELEVENLABS_API_KEY')) return

  try {
    const { samples = [] } = body(req)
    if (!samples.length) return res.status(400).json({ error: 'No voice notes to clone' })

    await sweepOldClones()

    const form = new FormData()
    form.append('name', `${PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
    form.append('description', 'Temporary clone for It’s A(I) Match. Deleted when the call ends.')
    samples.forEach((s, i) => {
      const type = (s.mimeType || 'audio/webm').split(';')[0]
      const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
      form.append('files', new Blob([Buffer.from(s.audio, 'base64')], { type }), `answer-${i + 1}.${ext}`)
    })

    const r = await fetch(`${API}/voices/add`, { method: 'POST', headers: headers(), body: form })
    const data = await r.json()
    if (!r.ok) throw new Error(data?.detail?.message || JSON.stringify(data?.detail || data))
    res.json({ voiceId: data.voice_id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
