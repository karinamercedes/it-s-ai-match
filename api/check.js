// Open /api/check in a browser to see if the keys can do everything the app needs.
// Shows no secrets: only yes/no answers, the plan name and voice slots.
const API = 'https://api.elevenlabs.io/v1'

export default async function handler(req, res) {
  const out = {
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    elevenlabsKeySet: !!process.env.ELEVENLABS_API_KEY,
  }
  if (out.elevenlabsKeySet) {
    const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    try {
      const r = await fetch(`${API}/user/subscription`, { headers })
      const s = await r.json()
      if (r.ok) {
        out.plan = s.tier
        out.canInstantClone = s.can_use_instant_voice_cloning
        out.voiceSlots = `${s.voice_slots_used} of ${s.voice_limit} used`
        out.creditsThisMonth = `${s.character_count} of ${s.character_limit} used`
        out.voiceAddsThisMonth = s.max_voice_add_edits ? `${s.voice_add_edit_counter} of ${s.max_voice_add_edits}` : s.voice_add_edit_counter
      } else out.subscription = `can't read (${s?.detail?.message || r.status})`
    } catch (e) {
      out.subscription = `error: ${e.message}`
    }
    try {
      const r = await fetch(`${API}/voices`, { headers })
      out.canListVoices = r.ok || `no (${r.status})`
    } catch {}
  }
  res.setHeader('Cache-Control', 'no-store')
  res.json(out)
}
