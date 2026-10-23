// Makes everything sound like an overheard phone line:
// band-limited to 300–3400 Hz (like a real phone), a UK ring tone
// before, and pips after. Pausing suspends the whole line.

// iPhone mutes the browser's audio engine when the ring/silent switch is on.
// Two fixes, both run on the tap that starts the call:
// 1. Safari's audioSession API: declare this page as "playback" (like a music app).
// 2. Older iOS: a silent <audio> element looping in the background does the same.
let silentEl = null

function silentWavUrl() {
  const rate = 8000
  const samples = rate / 2 // half a second
  const buf = new ArrayBuffer(44 + samples)
  const v = new DataView(buf)
  const str = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + samples, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  str(36, 'data'); v.setUint32(40, samples, true)
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128) // 8-bit silence
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

export function unlockPlayback() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
  } catch {}
  try {
    if (!silentEl) {
      silentEl = new Audio(silentWavUrl())
      silentEl.loop = true
      silentEl.setAttribute('playsinline', '')
    }
    silentEl.play().catch(() => {})
  } catch {}
}

function releasePlayback() {
  try {
    silentEl?.pause()
  } catch {}
}

// The phone-line sound: 300–3400 Hz band, light compression. Used live and for the download,
// so the file sounds exactly like what you heard.
function phoneChain(c) {
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 300
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3400
  const comp = c.createDynamicsCompressor()
  const out = c.createGain()
  out.gain.value = 1.1
  hp.connect(lp).connect(comp).connect(out).connect(c.destination)
  return hp
}

function toneOn(c, input, freqs, start, dur, vol = 0.12) {
  const g = c.createGain()
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.02)
  g.gain.setValueAtTime(vol, start + dur - 0.02)
  g.gain.linearRampToValueAtTime(0, start + dur)
  g.connect(input)
  for (const f of freqs) {
    const o = c.createOscillator()
    o.frequency.value = f
    o.connect(g)
    o.start(start)
    o.stop(start + dur)
  }
}

const RING_TIMES = 2
const ringAt = (c, input, t0) => {
  for (let i = 0; i < RING_TIMES; i++) {
    toneOn(c, input, [400, 450], t0 + i * 3, 0.4)
    toneOn(c, input, [400, 450], t0 + i * 3 + 0.6, 0.4)
  }
  return (RING_TIMES - 1) * 3 + 1.6 // seconds the ring takes
}
const hangupAt = (c, input, t0) => {
  for (let i = 0; i < 3; i++) toneOn(c, input, [425], t0 + 0.3 + i * 0.35, 0.18, 0.1)
  return 1.5
}

export class PhoneLine {
  constructor() {
    unlockPlayback()
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC()
    this.input = phoneChain(this.ctx)
  }

  get now() {
    return this.ctx.currentTime
  }

  decode(arrayBuffer) {
    return this.ctx.decodeAudioData(arrayBuffer)
  }

  play(buffer) {
    return new Promise((resolve) => {
      const s = this.ctx.createBufferSource()
      s.buffer = buffer
      s.connect(this.input)
      s.onended = resolve
      s.start()
    })
  }

  // Silence that respects pause, used to wait in "phone time".
  wait(seconds) {
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.round(seconds * this.ctx.sampleRate)), this.ctx.sampleRate)
    return this.play(buf)
  }

  async ring() {
    await this.wait(ringAt(this.ctx, this.input, this.now + 0.1))
  }

  async hangup() {
    await this.wait(hangupAt(this.ctx, this.input, this.now))
  }

  pause() {
    return this.ctx.suspend()
  }

  resume() {
    return this.ctx.resume()
  }

  close() {
    releasePlayback()
    if (this.ctx.state !== 'closed') this.ctx.close()
  }
}

// ─────────────────────────────────────────────────────────────
// The downloadable file. Rebuilt on the phone from the exact audio
// you heard (same voice lines, same phone-line filter, ring and
// hang-up), back to back with a short natural gap: no pauses, no
// waiting-for-the-AI silences, no new API calls, nothing uploaded.
// ─────────────────────────────────────────────────────────────
const FILE_RATE = 22050 // plenty for a phone line, keeps the file small (~5 MB for 2 minutes)
const GAP = 0.35 // seconds between turns

export async function renderCall(buffers) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const ringLen = (RING_TIMES - 1) * 3 + 1.6 + 0.1
  const talk = buffers.reduce((t, b) => t + b.duration + GAP, 0)
  const length = Math.ceil((ringLen + talk + 1.8) * FILE_RATE)
  const c = new OAC(1, length, FILE_RATE)
  const input = phoneChain(c)

  let t = 0.1 + ringAt(c, input, 0.1)
  for (const b of buffers) {
    const s = c.createBufferSource()
    s.buffer = b
    s.connect(input)
    s.start(t)
    t += b.duration + GAP
  }
  hangupAt(c, input, t)

  const rendered = await c.startRendering()
  return wavBlob(rendered.getChannelData(0), FILE_RATE)
}

// 16-bit mono WAV: plays everywhere (phones, PowerPoint, Keynote).
function wavBlob(data, rate) {
  const buf = new ArrayBuffer(44 + data.length * 2)
  const v = new DataView(buf)
  const str = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) {
    const x = Math.max(-1, Math.min(1, data[i]))
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}
