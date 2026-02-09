const state = {
  audioCtx: null,
  started: false,
  playing: false,
  step: 0,
  nextTime: 0,
  timer: null,
  bpm: 110,
  swing: 0.12,
  masterVolume: 0.7,
  filterFreq: 2200,
  filterQ: 3,
  lfoRate: 2.5,
  lfoDepth: 900,
  reverbMix: 0.28,
};

const tracks = ['Kick', 'Snare', 'Hat', 'Bass'];
const steps = 16;
const pattern = tracks.map(() => Array.from({ length: steps }, () => false));

const els = {
  startAudio: document.getElementById('startAudio'),
  playToggle: document.getElementById('playToggle'),
  bpm: document.getElementById('bpm'),
  bpmValue: document.getElementById('bpmValue'),
  swing: document.getElementById('swing'),
  swingValue: document.getElementById('swingValue'),
  masterVolume: document.getElementById('masterVolume'),
  filterFreq: document.getElementById('filterFreq'),
  filterQ: document.getElementById('filterQ'),
  lfoRate: document.getElementById('lfoRate'),
  lfoDepth: document.getElementById('lfoDepth'),
  reverbMix: document.getElementById('reverbMix'),
  padGrid: document.getElementById('padGrid'),
  sequencerGrid: document.getElementById('sequencerGrid'),
  randomize: document.getElementById('randomize'),
  uploadAudio: document.getElementById('uploadAudio'),
  streamUrl: document.getElementById('streamUrl'),
  loadStream: document.getElementById('loadStream'),
  externalPlayer: document.getElementById('externalPlayer'),
};

const audioNodes = {};

function makeImpulseResponse(ctx, duration = 2.2, decay = 2.8) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * ((length - i) / length) ** decay;
    }
  }
  return impulse;
}

function initAudio() {
  if (state.started) return;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  state.audioCtx = audioCtx;

  const master = audioCtx.createGain();
  const dry = audioCtx.createGain();
  const wet = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const convolver = audioCtx.createConvolver();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  filter.type = 'lowpass';
  convolver.buffer = makeImpulseResponse(audioCtx);

  lfo.type = 'sine';
  lfo.start();

  dry.connect(master);
  wet.connect(master);
  master.connect(audioCtx.destination);

  dry.connect(filter);
  filter.connect(audioCtx.destination);

  dry.disconnect();
  filter.disconnect();

  const bus = audioCtx.createGain();
  bus.connect(filter);
  bus.connect(convolver);
  convolver.connect(wet);
  dry.connect(bus);

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  audioNodes.master = master;
  audioNodes.dry = dry;
  audioNodes.wet = wet;
  audioNodes.filter = filter;
  audioNodes.lfo = lfo;
  audioNodes.lfoGain = lfoGain;

  applyModulation();
  state.started = true;
}

function applyModulation() {
  if (!state.started) return;
  const now = state.audioCtx.currentTime;
  audioNodes.master.gain.setTargetAtTime(state.masterVolume, now, 0.01);
  audioNodes.filter.frequency.setTargetAtTime(state.filterFreq, now, 0.02);
  audioNodes.filter.Q.setTargetAtTime(state.filterQ, now, 0.02);
  audioNodes.lfo.frequency.setTargetAtTime(state.lfoRate, now, 0.02);
  audioNodes.lfoGain.gain.setTargetAtTime(state.lfoDepth, now, 0.02);
  audioNodes.wet.gain.setTargetAtTime(state.reverbMix, now, 0.02);
  audioNodes.dry.gain.setTargetAtTime(1 - state.reverbMix * 0.6, now, 0.02);
}

function triggerKick(time) {
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.17);
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  osc.connect(gain);
  gain.connect(audioNodes.dry);
  osc.start(time);
  osc.stop(time + 0.2);
}

function triggerSnare(time) {
  const ctx = state.audioCtx;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.55, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(audioNodes.dry);
  noise.start(time);
  noise.stop(time + 0.2);
}

function triggerHat(time) {
  const ctx = state.audioCtx;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 5200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  src.connect(highpass);
  highpass.connect(gain);
  gain.connect(audioNodes.dry);
  src.start(time);
  src.stop(time + 0.07);
}

function triggerBass(time, note = 55) {
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const sub = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  sub.type = 'sine';
  osc.frequency.value = note;
  sub.frequency.value = note / 2;

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.4, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.connect(gain);
  sub.connect(gain);
  gain.connect(audioNodes.dry);

  osc.start(time);
  sub.start(time);
  osc.stop(time + 0.32);
  sub.stop(time + 0.32);
}

const triggerMap = [triggerKick, triggerSnare, triggerHat, triggerBass];

function scheduleStep() {
  const secondsPerBeat = 60 / state.bpm;
  const stepDuration = secondsPerBeat / 4;

  while (state.nextTime < state.audioCtx.currentTime + 0.14) {
    const swingOffset = state.step % 2 === 1 ? stepDuration * state.swing : 0;
    const eventTime = state.nextTime + swingOffset;

    for (let t = 0; t < tracks.length; t += 1) {
      if (pattern[t][state.step]) triggerMap[t](eventTime);
    }

    paintPlayhead(state.step);
    state.nextTime += stepDuration;
    state.step = (state.step + 1) % steps;
  }
}

function paintPlayhead(stepIndex) {
  document.querySelectorAll('.seq-cell').forEach((cell) => {
    cell.classList.toggle('playhead', Number(cell.dataset.step) === stepIndex);
  });
}

function togglePlayback() {
  if (!state.started) return;

  state.playing = !state.playing;
  els.playToggle.textContent = state.playing ? '⏸️ Parar' : '▶️ Iniciar';

  if (state.playing) {
    state.step = 0;
    state.nextTime = state.audioCtx.currentTime + 0.05;
    state.timer = setInterval(scheduleStep, 25);
  } else {
    clearInterval(state.timer);
  }
}

function createPads() {
  tracks.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'pad';
    btn.textContent = `${name}\nPad`;
    btn.addEventListener('mousedown', () => {
      if (!state.started) return;
      btn.classList.add('active');
      triggerMap[i](state.audioCtx.currentTime);
      setTimeout(() => btn.classList.remove('active'), 120);
    });
    btn.addEventListener('touchstart', (event) => {
      event.preventDefault();
      if (!state.started) return;
      btn.classList.add('active');
      triggerMap[i](state.audioCtx.currentTime);
      setTimeout(() => btn.classList.remove('active'), 120);
    });
    els.padGrid.appendChild(btn);
  });
}

function createSequencer() {
  tracks.forEach((track, t) => {
    const label = document.createElement('div');
    label.className = 'seq-label';
    label.textContent = track;
    els.sequencerGrid.appendChild(label);

    for (let s = 0; s < steps; s += 1) {
      const cell = document.createElement('div');
      cell.className = 'seq-cell';
      cell.dataset.track = String(t);
      cell.dataset.step = String(s);
      cell.addEventListener('click', () => {
        pattern[t][s] = !pattern[t][s];
        cell.classList.toggle('on', pattern[t][s]);
      });
      els.sequencerGrid.appendChild(cell);
    }
  });

  [0, 4, 8, 12].forEach((s) => (pattern[0][s] = true));
  [4, 12].forEach((s) => (pattern[1][s] = true));
  for (let s = 0; s < steps; s += 2) pattern[2][s] = true;
  [0, 3, 7, 11].forEach((s) => (pattern[3][s] = true));

  document.querySelectorAll('.seq-cell').forEach((cell) => {
    const t = Number(cell.dataset.track);
    const s = Number(cell.dataset.step);
    cell.classList.toggle('on', pattern[t][s]);
  });
}

function randomizePattern() {
  for (let t = 0; t < tracks.length; t += 1) {
    for (let s = 0; s < steps; s += 1) {
      const threshold = t === 2 ? 0.65 : 0.82;
      pattern[t][s] = Math.random() > threshold;
    }
  }
  document.querySelectorAll('.seq-cell').forEach((cell) => {
    const t = Number(cell.dataset.track);
    const s = Number(cell.dataset.step);
    cell.classList.toggle('on', pattern[t][s]);
  });
}

function bindControls() {
  els.startAudio.addEventListener('click', () => {
    initAudio();
    els.startAudio.textContent = 'Audio activo ✅';
    els.startAudio.disabled = true;
  });

  els.playToggle.addEventListener('click', togglePlayback);
  els.randomize.addEventListener('click', randomizePattern);

  const bindRange = (key, output, transform = Number) => {
    els[key].addEventListener('input', (e) => {
      state[key] = transform(e.target.value);
      if (output) els[output].textContent = Number(state[key]).toFixed(2).replace(/\.00$/, '');
      applyModulation();
    });
  };

  bindRange('bpm', 'bpmValue');
  bindRange('swing', 'swingValue');
  bindRange('masterVolume');
  bindRange('filterFreq');
  bindRange('filterQ');
  bindRange('lfoRate');
  bindRange('lfoDepth');
  bindRange('reverbMix');

  els.uploadAudio.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    els.externalPlayer.src = url;
    els.externalPlayer.play().catch(() => {});
  });

  els.loadStream.addEventListener('click', () => {
    const url = els.streamUrl.value.trim();
    if (!url) return;
    els.externalPlayer.src = url;
    els.externalPlayer.play().catch(() => {
      alert('No se pudo reproducir la URL. Revisa CORS o si el enlace es directo a audio.');
    });
  });
}

createPads();
createSequencer();
bindControls();
