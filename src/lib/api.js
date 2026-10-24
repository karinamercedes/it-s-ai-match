async function post(path, data, audio = false) {
  const r = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) {
    let msg = `${path} failed (${r.status})`
    try {
      const j = await r.json()
      msg = j.error || msg
    } catch {}
    throw new Error(msg)
  }
  return audio ? r.arrayBuffer() : r.json()
}

export const transcribe = (audio, mimeType) => post('transcribe', { audio, mimeType })
export const tidy = (question, text) => post('tidy', { question, text })
export const turn = (payload) => post('turn', payload)
export const speak = (text, voiceId) => post('speak', { text, voiceId }, true)
export const verdict = (history) => post('verdict', { history })
export const profiles = (payload) => post('profiles', payload)

// Clone the user's voice from their recorded answers. Keeps the upload under Vercel's 4.5 MB limit.
export async function clone(samples) {
  const files = []
  let size = 0
  for (const s of samples) {
    if (files.length && size + s.blob.size * 1.37 > 3.3e6) break
    if (s.blob.size * 1.37 > 4.2e6) continue // one note too big to upload on its own
    size += s.blob.size * 1.37
    files.push({ audio: await blobToBase64(s.blob), mimeType: s.blob.type })
  }
  return post('clone', { samples: files })
}

// Delete the clone. keepalive lets it finish even if the page is closing.
export function forget(voiceId) {
  if (!voiceId) return
  fetch('/api/forget', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ voiceId }),
    keepalive: true,
  }).catch(() => {})
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
