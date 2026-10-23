import { body, needKey } from './_lib.js'

// Voice note → text, with ElevenLabs Speech to Text (Scribe).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ELEVENLABS_API_KEY')) return

  try {
    const { audio, mimeType = 'audio/webm' } = body(req)
    if (!audio) return res.status(400).json({ error: 'No audio received' })

    const type = mimeType.split(';')[0]
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
    const form = new FormData()
    form.append('file', new Blob([Buffer.from(audio, 'base64')], { type }), `answer.${ext}`)
    form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v1')
    form.append('tag_audio_events', 'false')

    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: form,
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data?.detail?.message || JSON.stringify(data?.detail || data))
    res.json({ text: (data.text || '').trim() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
