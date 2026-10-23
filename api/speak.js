import { body, needKey } from './_lib.js'

// Text → speech in a given ElevenLabs voice. Returns mp3 bytes.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ELEVENLABS_API_KEY')) return

  try {
    const { text = '', voiceId } = body(req)
    if (!voiceId) return res.status(400).json({ error: 'No voice id' })
    if (!text.trim() || text.length > 600) return res.status(400).json({ error: 'Line is empty or too long' })

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5',
          voice_settings: { stability: 0.4, similarity_boost: 0.75 },
        }),
      }
    )
    if (!r.ok) {
      const t = await r.text()
      throw new Error(`ElevenLabs ${r.status}: ${t.slice(0, 300)}`)
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(await r.arrayBuffer()))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
