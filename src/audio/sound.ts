let ac: AudioContext | null = null
export const audio = () => (ac ??= new AudioContext())

const bufCache = new Map<number, AudioBuffer>()
function noiseBuf(sec: number) {
  const a = audio(), key = Math.round(sec * 1000)
  let b = bufCache.get(key)
  if (!b) {
    b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * sec)), a.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    bufCache.set(key, b)
  }
  return b
}
function burst(type: BiquadFilterType, freq: number, q: number, gain: number, dur: number, when = 0, out?: AudioNode) {
  const a = audio(), t = a.currentTime + when, n = a.createBufferSource()
  n.buffer = noiseBuf(dur)
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
  const g = a.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(f).connect(g).connect(out ?? a.destination); n.start(t)
}
export function tone(f0: number, f1: number, gain: number, dur: number, type: OscillatorType = 'sine', out?: AudioNode) {
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(out ?? a.destination); o.start(t); o.stop(t + dur)
}
export const crackSound = (s: number) => { burst('bandpass', 1500 + s * 1000, 1.1, 0.9, 0.12); tone(150, 55, 0.6, 0.12); if (s > 0.5) burst('highpass', 3500, 0.7, 0.3, 0.05, 0.03) }
export const peelSound = () => { for (let k = 0; k < 3; k++) burst('highpass', 2600 + Math.random() * 2200, 0.7, 0.22, 0.03, k * 0.022 + Math.random() * 0.01) }
export const plateSound = () => tone(900, 880, 0.15, 0.45, 'triangle')
/** 껍질 그릇 비우는 소리: 껍질이 우수수 + 그릇 통 */
export const dumpSound = () => { for (let k = 0; k < 6; k++) burst('highpass', 2200 + Math.random() * 2600, 0.7, 0.16, 0.04, k * 0.03 + Math.random() * 0.015); tone(520, 300, 0.12, 0.18, 'triangle') }
/** 껍질이 길게 벗겨지는 소리 */
export const ripSound = () => { burst('highpass', 1900, 0.7, 0.2, 0.32); burst('bandpass', 3200, 2, 0.12, 0.24, 0.05) }
export const nopeSound = () => tone(240, 200, 0.12, 0.06, 'triangle')

/** 주방 소리: 환풍기 웅웅 + 냄비 보글보글. 유튜브보다 작게 */
let amb: { src: AudioBufferSourceNode; bus: GainNode; timer: number } | null = null
export const ambOn = () => !!amb
export function setAmbience(on: boolean) {
  if (!on) { if (amb) { amb.src.stop(); amb.bus.disconnect(); clearInterval(amb.timer); amb = null } return }
  if (amb) return
  const a = audio()
  if (a.state === 'suspended') void a.resume()
  const bus = a.createGain(); bus.gain.value = 0.5; bus.connect(a.destination)
  const src = a.createBufferSource(); src.buffer = noiseBuf(4); src.loop = true
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420
  const g = a.createGain(); g.gain.value = 0.12
  src.connect(f).connect(g).connect(bus); src.start()
  const timer = window.setInterval(() => { if (Math.random() < 0.6) tone(220 + Math.random() * 260, 520 + Math.random() * 300, 0.035, 0.05, 'sine', bus) }, 140)
  amb = { src, bus, timer }
}
