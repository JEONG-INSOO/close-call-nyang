import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';

// Original score/timbre revision 1. No recordings, samples or third-party melody.
const SAMPLE_RATE = 44100;
const BPM = 100;
const BEAT = 60 / BPM;
const LOOP_SECONDS = BEAT * 4 * 5;
const OUTPUT = new URL('../assets/audio/', import.meta.url);
const CHORDS = [[48, 55, 64, 69], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64], [48, 55, 62, 69]];
const MELODY = [[76, null, 79, 74, 72, null, 76, 81], [79, 76, null, 72, 74, 76, null, 71],
  [72, null, 77, 76, 69, 72, null, 74], [71, 74, 79, null, 76, 74, null, 67], [72, 76, null, 79, 81, 76, 74, null]];
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const wave = (hz, time) => Math.sin(2 * Math.PI * hz * time);
function envelope(time, duration, attack = 0.008) {
  return Math.min(1, time / attack) * Math.max(0, 1 - time / duration) ** 2;
}
function noise(seed) {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) / 4294967296) * 2 - 1; };
}
function sound(seconds, synth) {
  const frames = new Float64Array(Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < frames.length; i += 1) frames[i] = synth(i / SAMPLE_RATE, seconds);
  return frames;
}
function addNote(frames, start, midi, duration, gain) {
  const hz = frequency(midi);
  const startIndex = Math.round(start * SAMPLE_RATE);
  const count = Math.round(duration * SAMPLE_RATE);
  for (let i = 0; i < count; i += 1) {
    const t = i / SAMPLE_RATE;
    // Wrapping note tails across the loop keeps the seam continuous.
    frames[(startIndex + i) % frames.length] += gain * envelope(t, duration)
      * (wave(hz, t) + 0.2 * wave(hz * 2, t) + 0.06 * wave(hz * 3, t));
  }
}
const loop = new Float64Array(Math.round(LOOP_SECONDS * SAMPLE_RATE));
for (let bar = 0; bar < 5; bar += 1) {
  for (let beat = 0; beat < 4; beat += 1) {
    const start = (bar * 4 + beat) * BEAT;
    addNote(loop, start, CHORDS[bar][beat % 2], 0.43, 0.12);
    CHORDS[bar].slice(1).forEach((midi, index) => addNote(loop, start + BEAT * 0.5 + index * 0.012, midi, 0.32, 0.035));
  }
  MELODY[bar].forEach((midi, eighth) => { if (midi !== null) addNote(loop, bar * 4 * BEAT + eighth * BEAT / 2, midi, 0.46, 0.13); });
}
const stepNoise = noise(0x19a4);
const fallNoise = noise(0x43b8);
const assets = new Map([
  ['commute-loop.wav', loop],
  ['step.wav', sound(0.10, (t, d) => envelope(t, d, 0.002) * (0.20 * wave(135, t) + 0.10 * stepNoise()))],
  ['wobble.wav', sound(0.36, (t, d) => envelope(t, d) * 0.24 * wave(430 - 420 * t + 22 * Math.sin(t * 45), t))],
  ['fall.wav', sound(0.58, (t, d) => envelope(t, d, 0.003) * (0.28 * wave(95 - 70 * t, t) + 0.09 * fallNoise()))],
  ['coffee.wav', sound(0.32, (t, d) => envelope(t, d) * (0.18 * wave(880, t) + 0.10 * wave(1320, t)))],
]);

function encodeWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24); buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) {
    assert(Number.isFinite(samples[i]) && Math.abs(samples[i]) < 0.95, 'Non-finite or clipping sample');
    buffer.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
  }
  return buffer;
}
function validate(buffer, samples, name) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(buffer.readUInt32LE(4), buffer.length - 8);
  assert.equal(buffer.readUInt16LE(20), 1); assert.equal(buffer.readUInt16LE(22), 1);
  assert.equal(buffer.readUInt32LE(24), SAMPLE_RATE); assert.equal(buffer.readUInt32LE(28), SAMPLE_RATE * 2);
  assert.equal(buffer.readUInt16LE(32), 2); assert.equal(buffer.readUInt16LE(34), 16);
  assert.equal(buffer.toString('ascii', 36, 40), 'data');
  assert.equal(buffer.readUInt32LE(40), samples.length * 2);
  assert.equal(buffer.length, 44 + samples.length * 2);
  let peak = 0;
  for (let i = 44; i < buffer.length; i += 2) peak = Math.max(peak, Math.abs(buffer.readInt16LE(i)) / 32767);
  assert(peak > 0 && peak < 0.95, 'Silent or clipped asset');
  const duration = samples.length / SAMPLE_RATE;
  if (name === 'commute-loop.wav') {
    assert.equal(duration, 12); assert.equal(BPM, 100);
    assert(Math.abs(samples[0] - samples[samples.length - 1]) < 0.01, 'Discontinuous loop seam');
  } else assert(duration < 0.8);
  return { duration, peak: Number(peak.toFixed(4)), bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') };
}

mkdirSync(OUTPUT, { recursive: true });
for (const [name, samples] of assets) {
  const buffer = encodeWav(samples);
  const stats = validate(buffer, samples, name);
  const destination = new URL(name, OUTPUT);
  writeFileSync(destination, buffer);
  assert.deepEqual(readFileSync(destination), buffer, 'Written WAV differs');
  console.log(`${name}: ${JSON.stringify(stats)}`);
}
console.log(`Validated ${assets.size} original WAV files in ${fileURLToPath(OUTPUT)}`);
