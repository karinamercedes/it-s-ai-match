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

export class PhoneLine {
  constructor() {
    unlockPlayback()
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC()
    const c = this.ctx

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
    this.input = hp
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

  tone(freqs, start, dur, vol = 0.12) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(vol, start + 0.02)
    g.gain.setValueAtTime(vol, start + dur - 0.02)
    g.gain.linearRampToValueAtTime(0, start + dur)
    g.connect(this.input)
    for (const f of freqs) {
      const o = this.ctx.createOscillator()
      o.frequency.value = f
      o.connect(g)
      o.start(start)
      o.stop(start + dur)
    }
  }

  async ring(times = 2) {
    const t0 = this.now + 0.1
    for (let i = 0; i < times; i++) {
      const base = t0 + i * 3
      this.tone([400, 450], base, 0.4)
      this.tone([400, 450], base + 0.6, 0.4)
    }
    await this.wait((times - 1) * 3 + 1.6)
  }

  async hangup() {
    const t0 = this.now + 0.3
    for (let i = 0; i < 3; i++) this.tone([425], t0 + i * 0.35, 0.18, 0.1)
    await this.wait(1.5)
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
