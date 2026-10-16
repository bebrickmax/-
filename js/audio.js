/* БРСМ: Команда 212 — синтезатор звуков и музыки (Web Audio, без файлов) */
'use strict';

(function (B) {
  const A = (B.Audio = {
    ctx: null,
    soundOn: true,
    musicOn: true,
    volume: 0.85,
    players: [],
    currentMusic: null,
  });

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteToMidi(tok) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(tok);
    if (!m) return null;
    let pc = NOTE_PC[m[1]];
    if (m[2] === '#') pc++;
    if (m[2] === 'b') pc--;
    return 12 * (parseInt(m[3], 10) + 1) + pc;
  }
  A.noteToMidi = noteToMidi;

  function makeImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      try {
        A.ctx = new AC();
      } catch (e2) {
        return;
      }
    }
    const c = A.ctx;
    A.master = c.createGain();
    A.comp = c.createDynamicsCompressor();
    A.comp.threshold.value = -12;
    A.comp.knee.value = 10;
    A.comp.ratio.value = 4;
    A.comp.attack.value = 0.003;
    A.comp.release.value = 0.2;
    A.master.connect(A.comp);
    A.comp.connect(c.destination);

    A.sfxBus = c.createGain();
    A.sfxBus.connect(A.master);
    A.musicBus = c.createGain();
    A.musicBus.connect(A.master);
    A.songBus = c.createGain();
    A.songBus.connect(A.master);

    A.reverb = c.createConvolver();
    A.reverb.buffer = makeImpulse(c, 2.2, 2.6);
    A.revSend = c.createGain();
    A.revSend.gain.value = 0.32;
    A.revSend.connect(A.reverb);
    A.reverb.connect(A.master);

    const nlen = c.sampleRate;
    A.noise = c.createBuffer(1, nlen, c.sampleRate);
    const nd = A.noise.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    A.apply();
    if (!A._timer) A._timer = setInterval(A._tick, 25);
  };

  A.unlock = function () {
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
  };

  A.apply = function () {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    A.master.gain.setTargetAtTime(A.soundOn ? A.volume : 0, t, 0.05);
    A.musicBus.gain.setTargetAtTime(A.musicOn ? 0.62 : 0, t, 0.08);
    A.songBus.gain.setTargetAtTime(0.75, t, 0.05);
    A.sfxBus.gain.setTargetAtTime(1, t, 0.05);
  };

  A.now = () => (A.ctx ? A.ctx.currentTime : performance.now() / 1000);
  A.running = () => !!(A.ctx && A.ctx.state === 'running');

  // ---------- Строительные блоки ----------
  function osc(type, freq, t) {
    const o = A.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    return o;
  }
  function gainNode(v) {
    const g = A.ctx.createGain();
    g.gain.value = v;
    return g;
  }
  function filter(type, freq, q) {
    const f = A.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }
  function noiseSrc(t, dur) {
    const s = A.ctx.createBufferSource();
    s.buffer = A.noise;
    s.loop = true;
    const off = Math.random() * 0.5;
    s.start(t, off);
    s.stop(t + dur + 0.05);
    return s;
  }
  // Огибающая ADSR на setTargetAtTime — без щелчков
  function adsr(g, t, a, d, s, r, dur, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * s, t + a, Math.max(0.005, d / 3));
    g.gain.setTargetAtTime(0.0001, t + Math.max(dur, a), Math.max(0.005, r / 3));
    return t + Math.max(dur, a) + r * 2.2;
  }

  // ---------- Инструменты ----------
  const INST = {};
  INST.lead = (t, m, dur, v, out) => {
    const f = mtof(m);
    const o1 = osc('square', f, t), o2 = osc('sawtooth', f * 1.005, t);
    const lp = filter('lowpass', 3400, 2);
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.setTargetAtTime(1600, t, 0.12);
    const g = gainNode(0);
    const mix2 = gainNode(0.55);
    o1.connect(lp);
    o2.connect(mix2);
    mix2.connect(lp);
    lp.connect(g);
    g.connect(out);
    const send = gainNode(0.18);
    g.connect(send);
    send.connect(A.revSend);
    const end = adsr(g, t, 0.006, 0.12, 0.6, 0.08, dur, v * 0.15);
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
  };
  INST.pluck = (t, m, dur, v, out) => {
    const f = mtof(m);
    const o1 = osc('triangle', f, t), o2 = osc('square', f * 2, t);
    const g = gainNode(0), g2 = gainNode(0.12);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    const lp = filter('lowpass', 3000, 1);
    g.connect(lp); lp.connect(out);
    const send = gainNode(0.25);
    lp.connect(send); send.connect(A.revSend);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v * 0.22, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.004, 0.09);
    o1.start(t); o2.start(t); o1.stop(t + 0.6); o2.stop(t + 0.6);
  };
  INST.bell = (t, m, dur, v, out) => {
    const f = mtof(m);
    const parts = [[1, 1, 1.6], [2.0, 0.35, 0.9], [3.01, 0.18, 0.5], [4.2, 0.08, 0.3]];
    const g = gainNode(1);
    g.connect(out);
    const send = gainNode(0.6);
    g.connect(send); send.connect(A.revSend);
    for (const [ratio, amp, dec] of parts) {
      const o = osc('sine', f * ratio, t);
      const gg = gainNode(0);
      o.connect(gg); gg.connect(g);
      gg.gain.setValueAtTime(0.0001, t);
      gg.gain.linearRampToValueAtTime(v * 0.2 * amp, t + 0.004);
      gg.gain.setTargetAtTime(0.0001, t + 0.004, dec / 3);
      o.start(t); o.stop(t + dec * 2.5);
    }
  };
  INST.bass = (t, m, dur, v, out) => {
    const f = mtof(m);
    const o1 = osc('sawtooth', f, t), o2 = osc('sine', f / 2, t);
    const lp = filter('lowpass', 700, 3);
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.setTargetAtTime(420, t, 0.06);
    const g = gainNode(0), gs = gainNode(0.7);
    o1.connect(lp); lp.connect(g); o2.connect(gs); gs.connect(g); g.connect(out);
    const end = adsr(g, t, 0.004, 0.1, 0.7, 0.05, dur * 0.92, v * 0.26);
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
  };
  INST.pad = (t, m, dur, v, out) => {
    const f = mtof(m);
    const g = gainNode(0);
    const lp = filter('lowpass', 1300, 0.7);
    g.connect(lp); lp.connect(out);
    const send = gainNode(0.5);
    lp.connect(send); send.connect(A.revSend);
    const os = [];
    for (const det of [-7, 7]) {
      const o = osc('sawtooth', f, t);
      o.detune.value = det;
      o.connect(g);
      os.push(o);
    }
    const end = adsr(g, t, 0.18, 0.4, 0.8, 0.45, dur, v * 0.05);
    os.forEach((o) => { o.start(t); o.stop(end); });
  };
  INST.organ = (t, m, dur, v, out) => {
    const f = mtof(m);
    const g = gainNode(0);
    g.connect(out);
    const send = gainNode(0.4);
    g.connect(send); send.connect(A.revSend);
    const os = [osc('sine', f, t), osc('sine', f * 2, t), osc('triangle', f * 0.5, t)];
    const amps = [1, 0.3, 0.4];
    os.forEach((o, i) => {
      const gg = gainNode(amps[i]);
      o.connect(gg); gg.connect(g);
    });
    const end = adsr(g, t, 0.35, 0.5, 0.85, 0.9, dur, v * 0.07);
    os.forEach((o) => { o.start(t); o.stop(end); });
  };
  // Ударные
  INST.kick = (t, v, out) => {
    const o = osc('sine', 165, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    const g = gainNode(0);
    g.gain.setValueAtTime(v * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.4);
    const n = noiseSrc(t, 0.02), hp = filter('highpass', 3000), gn = gainNode(v * 0.12);
    gn.gain.setTargetAtTime(0.0001, t, 0.006);
    n.connect(hp); hp.connect(gn); gn.connect(out);
  };
  INST.snare = (t, v, out) => {
    const n = noiseSrc(t, 0.25), bp = filter('bandpass', 1900, 0.7), g = gainNode(0);
    g.gain.setValueAtTime(v * 0.42, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(bp); bp.connect(g); g.connect(out);
    const send = gainNode(0.2);
    g.connect(send); send.connect(A.revSend);
    const o = osc('triangle', 200, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const go = gainNode(0);
    go.gain.setValueAtTime(v * 0.35, t);
    go.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(go); go.connect(out);
    o.start(t); o.stop(t + 0.12);
  };
  INST.clap = (t, v, out) => {
    const n = noiseSrc(t, 0.3), bp = filter('bandpass', 1300, 1.1), g = gainNode(0);
    g.gain.setValueAtTime(0, t);
    [0, 0.011, 0.022].forEach((d) => {
      g.gain.setValueAtTime(v * 0.45, t + d);
      g.gain.setTargetAtTime(0.02, t + d + 0.001, 0.004);
    });
    g.gain.setValueAtTime(v * 0.45, t + 0.033);
    g.gain.setTargetAtTime(0.0001, t + 0.034, 0.05);
    n.connect(bp); bp.connect(g); g.connect(out);
    const send = gainNode(0.3);
    g.connect(send); send.connect(A.revSend);
  };
  INST.hat = (t, v, out, open) => {
    const n = noiseSrc(t, open ? 0.3 : 0.06), hp = filter('highpass', 7600), g = gainNode(0);
    g.gain.setValueAtTime(v * (open ? 0.12 : 0.1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.24 : 0.045));
    n.connect(hp); hp.connect(g); g.connect(out);
  };
  INST.crash = (t, v, out) => {
    const n = noiseSrc(t, 1.6), hp = filter('highpass', 4500), g = gainNode(0);
    g.gain.setValueAtTime(v * 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    n.connect(hp); hp.connect(g); g.connect(out);
    const send = gainNode(0.4);
    g.connect(send); send.connect(A.revSend);
  };
  INST.riser = (t, v, out, dur) => {
    const n = noiseSrc(t, dur), bp = filter('bandpass', 400, 2.5), g = gainNode(0);
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.25, t + dur * 0.95);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.02);
    n.connect(bp); bp.connect(g); g.connect(out);
  };
  A.INST = INST;

  // ---------- Разбор нотной записи ----------
  // Токены: "C5" нота, "." пауза, "-" продление. res — сколько шестнадцатых в токене.
  function parseSeq(str, res) {
    const toks = str.split(/\s+/).filter((s) => s && s !== '|');
    const events = [];
    let step = 0, last = null;
    for (const tok of toks) {
      if (tok === '.') last = null;
      else if (tok === '-') {
        if (last) last.len += res;
      } else {
        const m = noteToMidi(tok);
        if (m != null) {
          last = { step, midi: m, len: res };
          events.push(last);
        } else last = null;
      }
      step += res;
    }
    return { events, length: step };
  }

  const CHORD_INT = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus4: [0, 5, 7], dim: [0, 3, 6] };
  function parseChord(sym) {
    const m = /^([A-G])(#|b)?(m7|m|7|sus4|dim)?$/.exec(sym);
    if (!m) return null;
    let pc = NOTE_PC[m[1]];
    if (m[2] === '#') pc++;
    if (m[2] === 'b') pc--;
    pc = (pc + 12) % 12;
    return { pc, ints: CHORD_INT[m[3] || ''] };
  }
  function chordList(str) {
    return str.split(/\s+/).filter((s) => s && s !== '|').map((s) => (s === '.' ? null : parseChord(s)));
  }

  function compile(def) {
    const stepDur = 60 / def.bpm / 4;
    let maxLen = 0;
    const tracks = def.tracks.map((tr) => {
      const out = { def: tr, byStep: new Map(), length: 0, vol: tr.vol != null ? tr.vol : 1 };
      const add = (step, ev) => {
        if (!out.byStep.has(step)) out.byStep.set(step, []);
        out.byStep.get(step).push(ev);
      };
      if (tr.type === 'notes') {
        const p = parseSeq(tr.seq, tr.res || 1);
        const tp = tr.transpose || 0;
        p.events.forEach((e) => add(e.step, { midi: e.midi + tp, len: e.len }));
        out.events = p.events;
        out.length = p.length;
      } else if (tr.type === 'chords') {
        const cl = chordList(tr.seq), span = tr.span || 16;
        cl.forEach((ch, i) => {
          if (!ch) return;
          const root = 57 + ((ch.pc - 9 + 12) % 12) + (tr.octave || 0) * 12;
          ch.ints.forEach((iv) => add(i * span, { midi: root + iv, len: span }));
        });
        out.length = cl.length * span;
      } else if (tr.type === 'bass') {
        const cl = chordList(tr.seq), span = tr.span || 16;
        const pat = tr.pattern.split(/\s+/).filter(Boolean);
        cl.forEach((ch, i) => {
          if (!ch) return;
          const root = 40 + ((ch.pc - 4 + 12) % 12);
          let last = null;
          for (let s = 0; s < span; s++) {
            const tok = pat[s % pat.length];
            if (tok === '-') {
              if (last) last.len++;
              continue;
            }
            last = null;
            const iv = { R: 0, O: 12, F: 7, T: ch.ints[1] }[tok];
            if (iv == null) continue;
            last = { midi: root + iv, len: 1 };
            add(i * span + s, last);
          }
        });
        out.length = cl.length * span;
      } else if (tr.type === 'arp') {
        const cl = chordList(tr.seq), span = tr.span || 16;
        const pat = tr.pattern.split(/\s+/).filter(Boolean);
        cl.forEach((ch, i) => {
          if (!ch) return;
          const root = 60 + ((ch.pc - 0 + 12) % 12) - (ch.pc > 7 ? 12 : 0) + (tr.octave || 0) * 12;
          const tones = [];
          for (let o = 0; o < 3; o++) ch.ints.slice(0, 3).forEach((iv) => tones.push(root + iv + o * 12));
          for (let s = 0; s < span; s++) {
            const tok = pat[s % pat.length];
            if (tok === '.') continue;
            const idx = parseInt(tok, 10);
            if (isNaN(idx)) continue;
            add(i * span + s, { midi: tones[idx], len: tr.len || 1 });
          }
        });
        out.length = cl.length * span;
      } else if (tr.type === 'drums') {
        out.kit = {};
        for (const k in tr.kit) {
          const s = tr.kit[k].replace(/[\s|]/g, '');
          out.kit[k] = s;
          out.length = Math.max(out.length, s.length);
        }
      }
      maxLen = Math.max(maxLen, out.length);
      return out;
    });
    return { def, stepDur, tracks, length: def.steps || maxLen, bpm: def.bpm };
  }
  A.compile = compile;

  // ---------- Проигрыватель ----------
  class Player {
    constructor(song, bus, opts = {}) {
      this.song = song;
      this.out = gainNode(0.0001);
      this.out.connect(bus);
      this.loop = opts.loop != null ? opts.loop : song.def.loop !== false;
      this.step = 0;
      this.t0 = A.ctx.currentTime + (opts.delay || 0.08);
      this.next = this.t0;
      this.done = false;
      this.onEnd = opts.onEnd;
      this.out.gain.setValueAtTime(0.0001, A.ctx.currentTime);
      this.out.gain.linearRampToValueAtTime(1, this.t0 + (opts.fadeIn || 0.05));
    }
    tick(now) {
      if (this.done) return;
      const sd = this.song.stepDur;
      while (this.next < now + 0.16) {
        this.schedule(this.step, this.next);
        this.next += sd;
        this.step++;
        if (this.step >= this.song.length) {
          if (this.loop) this.step = 0;
          else {
            this.done = true;
            const endT = this.next;
            const cb = this.onEnd;
            if (cb) setTimeout(() => cb(), Math.max(0, (endT - A.ctx.currentTime) * 1000 + 600));
            setTimeout(() => this.out.disconnect(), Math.max(0, (endT - A.ctx.currentTime) * 1000 + 3000));
            break;
          }
        }
      }
    }
    schedule(step, t) {
      const sd = this.song.stepDur;
      for (const tr of this.song.tracks) {
        const L = tr.length || this.song.length;
        const local = step % L;
        if (tr.kit) {
          for (const k in tr.kit) {
            const pat = tr.kit[k];
            const ch = pat[local % pat.length];
            if (!ch || ch === '.') continue;
            const acc = ch === 'X' ? 1.25 : 1;
            const v = tr.vol * acc;
            if (k === 'k') INST.kick(t, v, this.out);
            else if (k === 's') INST.snare(t, v, this.out);
            else if (k === 'c') INST.clap(t, v, this.out);
            else if (k === 'h') INST.hat(t, v, this.out, ch === 'o');
            else if (k === 'x') INST.crash(t, v, this.out);
            else if (k === 'r' && ch === 'R') INST.riser(t, v, this.out, sd * 16);
          }
          continue;
        }
        const evs = tr.byStep.get(local);
        if (!evs) continue;
        const inst = INST[tr.def.inst];
        if (!inst || tr.def.silent) continue;
        for (const e of evs) inst(t, e.midi, e.len * sd, tr.vol, this.out);
      }
    }
    stop(fade = 0.4) {
      if (this.done && !this.out) return;
      this.done = true;
      const t = A.ctx.currentTime;
      try {
        this.out.gain.cancelScheduledValues(t);
        this.out.gain.setValueAtTime(this.out.gain.value, t);
        this.out.gain.linearRampToValueAtTime(0.0001, t + fade);
      } catch (e) { /* узел уже отключён */ }
      const o = this.out;
      setTimeout(() => o.disconnect(), fade * 1000 + 3000);
    }
  }

  A._tick = function () {
    if (!A.ctx) return;
    const now = A.ctx.currentTime;
    for (let i = A.players.length - 1; i >= 0; i--) {
      const p = A.players[i];
      p.tick(now);
      if (p.done) A.players.splice(i, 1);
    }
  };

  const compiled = {};
  function getSong(name) {
    if (!compiled[name]) compiled[name] = compile(SONGS[name]);
    return compiled[name];
  }
  A.getSong = getSong;

  A.playMusic = function (name) {
    if (A.currentMusicName === name && A.currentMusic && !A.currentMusic.done) return;
    A.stopMusic(0.6);
    A.currentMusicName = name;
    if (!A.ctx || !name) return;
    const p = new Player(getSong(name), A.musicBus, { delay: 0.15, fadeIn: 0.8 });
    A.currentMusic = p;
    A.players.push(p);
  };
  A.stopMusic = function (fade = 0.5) {
    if (A.currentMusic) A.currentMusic.stop(fade);
    A.currentMusic = null;
    A.currentMusicName = null;
  };
  // Песня для ритм-игры: точное время старта, без зацикливания
  A.startSong = function (name, opts = {}) {
    const song = getSong(name);
    if (!A.ctx) return { t0: null, song };
    const p = new Player(song, A.songBus, { loop: false, delay: opts.delay || 0.3, onEnd: opts.onEnd });
    A.players.push(p);
    return { t0: p.t0, song, player: p };
  };

  // ---------- Звуковые эффекты ----------
  function blip(type, f0, f1, dur, vol, t) {
    const c = A.ctx;
    t = t || c.currentTime;
    const o = osc(type, f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = gainNode(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(A.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
    return g;
  }
  function noiseHit(t, dur, vol, ftype, f0, f1, q) {
    const n = noiseSrc(t, dur), f = filter(ftype, f0, q || 1), g = gainNode(0);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(A.sfxBus);
  }
  function seq(inst, notes, gap, vol, t) {
    t = t || A.ctx.currentTime;
    notes.forEach((n, i) => INST[inst](t + i * gap, typeof n === 'string' ? noteToMidi(n) : n, gap * 1.5, vol, A.sfxBus));
  }
  const PENTA = [0, 2, 4, 7, 9];
  const pentaNote = (base, i) => base + PENTA[i % 5] + 12 * Math.floor(i / 5);

  const SFX = {
    click: () => blip('sine', 720, 1050, 0.06, 0.22),
    tap: () => blip('triangle', 520, 680, 0.05, 0.2),
    back: () => blip('sine', 620, 380, 0.08, 0.2),
    open: () => { blip('triangle', 440, 880, 0.12, 0.14); },
    jump: () => {
      const t = A.ctx.currentTime;
      const o = osc('square', 260, t);
      o.frequency.exponentialRampToValueAtTime(620, t + 0.13);
      const lp = filter('lowpass', 2200), g = gainNode(0);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(lp); lp.connect(g); g.connect(A.sfxBus);
      o.start(t); o.stop(t + 0.18);
    },
    djump: () => blip('triangle', 480, 1100, 0.16, 0.2),
    land: () => noiseHit(A.ctx.currentTime, 0.08, 0.25, 'lowpass', 500),
    heart: (n = 0) => {
      const t = A.ctx.currentTime;
      const k = Math.pow(2, (Math.min(n, 12) * 1) / 12);
      blip('square', 1318 * k, 1318 * k, 0.07, 0.07, t);
      blip('square', 1976 * k, 1976 * k, 0.16, 0.07, t + 0.06);
    },
    deed: () => seq('pluck', ['C5', 'E5', 'G5', 'C6', 'E6'], 0.055, 1),
    power: () => seq('pluck', ['G4', 'B4', 'D5', 'G5', 'B5', 'D6', 'G6'], 0.04, 0.9),
    shield: () => { INST.bell(A.ctx.currentTime, 84, 0.5, 0.8, A.sfxBus); INST.bell(A.ctx.currentTime + 0.07, 91, 0.5, 0.6, A.sfxBus); },
    hit: () => {
      const t = A.ctx.currentTime;
      noiseHit(t, 0.28, 0.55, 'lowpass', 1400, 180);
      const o = osc('sine', 150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
      const g = gainNode(0.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(A.sfxBus);
      o.start(t); o.stop(t + 0.3);
    },
    slide: () => noiseHit(A.ctx.currentTime, 0.26, 0.16, 'bandpass', 2400, 500, 1.5),
    place: (n = 0) => {
      const t = A.ctx.currentTime;
      blip('triangle', 260 + n * 6, 180 + n * 4, 0.12, 0.3, t);
      noiseHit(t, 0.05, 0.25, 'highpass', 2500);
    },
    perfect: (n = 0) => {
      const t = A.ctx.currentTime;
      INST.bell(t, pentaNote(72, n), 0.6, 1.1, A.sfxBus);
      INST.bell(t + 0.02, pentaNote(72, n) + 12, 0.6, 0.35, A.sfxBus);
    },
    cut: () => noiseHit(A.ctx.currentTime, 0.07, 0.3, 'highpass', 3500),
    fall: () => blip('sine', 700, 140, 0.55, 0.12),
    correct: (n = 0) => {
      const t = A.ctx.currentTime;
      const base = pentaNote(76, Math.min(n, 9));
      INST.pluck(t, base, 0.2, 1, A.sfxBus);
      INST.pluck(t + 0.07, base + 7, 0.3, 1, A.sfxBus);
    },
    wrong: () => {
      const t = A.ctx.currentTime;
      const lp = filter('lowpass', 900), g = gainNode(0);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      lp.connect(g); g.connect(A.sfxBus);
      [140, 148].forEach((f) => { const o = osc('square', f, t); o.connect(lp); o.start(t); o.stop(t + 0.34); });
    },
    count: () => blip('sine', 660, 660, 0.16, 0.22),
    go: () => { const t = A.ctx.currentTime; blip('sine', 990, 990, 0.35, 0.2, t); blip('sine', 1320, 1320, 0.35, 0.12, t); },
    star: (i = 0) => { INST.bell(A.ctx.currentTime, [88, 91, 96][i % 3], 0.8, 1.2, A.sfxBus); },
    fanfare: () => {
      const t = A.ctx.currentTime;
      seq('lead', ['C5', 'E5', 'G5'], 0.1, 1.1, t);
      ['C5', 'E5', 'G5', 'C6'].forEach((n) => INST.lead(t + 0.32, noteToMidi(n), 0.6, 0.8, A.sfxBus));
      INST.crash(t + 0.32, 0.7, A.sfxBus);
    },
    fail: () => {
      const t = A.ctx.currentTime;
      const o = osc('sawtooth', 392, t);
      o.frequency.setValueAtTime(392, t);
      o.frequency.setValueAtTime(370, t + 0.22);
      o.frequency.setValueAtTime(349, t + 0.44);
      o.frequency.linearRampToValueAtTime(300, t + 1.1);
      const lfo = osc('sine', 6, t), lg = gainNode(6);
      lfo.connect(lg); lg.connect(o.frequency);
      const lp = filter('lowpass', 1200), g = gainNode(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.03);
      g.gain.setTargetAtTime(0.0001, t + 1.0, 0.1);
      o.connect(lp); lp.connect(g); g.connect(A.sfxBus);
      o.start(t); lfo.start(t); o.stop(t + 1.4); lfo.stop(t + 1.4);
    },
    badge: () => seq('bell', ['C6', 'E6', 'G6', 'C7'], 0.08, 0.9),
    tick: () => noiseHit(A.ctx.currentTime, 0.03, 0.18, 'highpass', 5000),
    flower: () => seq('pluck', ['A4', 'C5', 'E5', 'A5', 'C6'], 0.06, 0.7),
    whoosh: () => noiseHit(A.ctx.currentTime, 0.32, 0.14, 'bandpass', 300, 3200, 1.2),
    pop: () => blip('sine', 380, 900, 0.07, 0.2),
    miss: () => noiseHit(A.ctx.currentTime, 0.1, 0.18, 'lowpass', 300),
    unlock: () => seq('pluck', ['E5', 'G5', 'C6', 'G5', 'C6', 'E6'], 0.07, 1),
  };

  A.sfx = function (name, arg) {
    if (!A.ctx || !A.soundOn) return;
    if (A.ctx.state !== 'running') return;
    const f = SFX[name];
    if (f) {
      try {
        f(arg);
      } catch (e) { /* звук не критичен */ }
    }
  };

  // ---------- Музыка ----------
  const REST8 = '. . . . . . . .';

  // Песня для ритм-игры «Фестиваль»: 128 BPM, 46 тактов
  const restBars = (n) => Array(n).fill(REST8).join(' | ');
  const FEST_SECTIONS = [
    ['intro', 4], ['verse', 8], ['chorus', 8], ['verse2', 4], ['chorus', 8], ['break', 4], ['chorus3', 8], ['outro', 2],
  ];
  A.FEST_SECTIONS = FEST_SECTIONS;
  const FEST = (() => {
    const verseA = ['A4 . A4 C5 B4 . A4 .', 'F4 . A4 C5 B4 A4 G4 .', 'E4 . G4 A4 C5 . B4 .', 'G4 - - - B4 . D5 .'];
    const verseB = ['A4 . A4 C5 B4 . A4 .', 'F4 . A4 C5 D5 C5 B4 .', 'C5 . B4 A4 G4 . E4 .', 'G4 - - - . . . .'];
    const chorus = [
      'E5 . E5 D5 C5 . A4 .', 'C5 . C5 D5 C5 . A4 .', 'G4 . C5 . E5 . G5 .', 'G5 . F5 E5 D5 - - .',
      'E5 . E5 D5 C5 . A4 .', 'C5 . C5 D5 E5 . F5 .', 'E5 . D5 C5 D5 . E5 .', 'D5 - - - B4 . G4 .',
    ];
    const C = chorus.join(' | ');
    const lead = [restBars(4), verseA.join(' | '), verseB.join(' | '), C, verseA.join(' | '), C, restBars(4), C, 'A4 - - - - - - -', REST8].join(' | ');
    const lead2 = [restBars(36), C, restBars(2)].join(' | ');
    // Метки для нот вне мелодии (вступление и брейк): номер дорожки 0–3
    const cue = [
      '0 . . . 3 . . . | 1 . . . 2 . . . | 0 . . . 3 . . . | 1 . 2 . 0 . 3 .',
      restBars(28),
      '0 . 1 . 2 . 3 . | 3 . 2 . 1 . 0 . | 0 . 2 . 1 . 3 . | 0 . 1 . 2 . 3 3',
      restBars(10),
    ].join(' | ');
    const lanesToNotes = (str) => str.split(/\s+/).map((t) => (/^[0-3]$/.test(t) ? ['A3', 'B3', 'C4', 'D4'][+t] : t)).join(' ');
    const prog = 'Am F C G';
    const progBars = (n) => Array(n / 4).fill(prog).join(' ');
    const restChords = (n) => Array(n).fill('.').join(' ');
    const chords = [progBars(4), progBars(8), progBars(8), progBars(4), progBars(8), progBars(4), progBars(8), 'Am .'].join(' ');
    const bassSeq = [restChords(4), progBars(8), progBars(8), progBars(4), progBars(8), restChords(4), progBars(8), 'Am .'].join(' ');
    const arpSeq = [restChords(32), progBars(4), progBars(8), restChords(2)].join(' ');

    const D16 = '................';
    const pat = {
      k(sec, i) {
        if (sec === 'intro') return 'x...x...x...x...';
        if (sec === 'verse' || sec === 'verse2') return 'x.....x...x.....';
        if (sec === 'chorus' || sec === 'chorus3') return 'x...x...x...x...';
        if (sec === 'outro') return i === 0 ? 'x...............' : D16;
        return D16;
      },
      s(sec, i, n) {
        const last = i === n - 1;
        if (sec === 'intro') return i < 2 ? D16 : last ? '....x.......xxxx' : '....x.......x...';
        if (sec === 'verse' || sec === 'verse2') return last ? '....x.......xxxx' : '....x.......x...';
        if (sec === 'chorus') return last ? '....x...x.x.xxxx' : '....x.......x...';
        if (sec === 'chorus3') return '....x.......x...';
        if (sec === 'break') return last ? 'xxxxxxxxxxxxxxxx' : D16;
        return D16;
      },
      h(sec, i) {
        if (sec === 'intro') return i < 2 ? '..x...x...x...x.' : 'x.x.x.x.x.x.x.x.';
        if (sec === 'verse' || sec === 'verse2') return '..x...x...x...x.';
        if (sec === 'chorus' || sec === 'chorus3') return 'x.x.x.o.x.x.x.o.';
        if (sec === 'break') return 'x...x...x...x...';
        return D16;
      },
      x(sec, i) {
        return i === 0 && sec !== 'intro' && sec !== 'break' ? 'x' + D16.slice(1) : D16;
      },
      r(sec, i, n) {
        return sec === 'break' && i === n - 1 ? 'R' + D16.slice(1) : D16;
      },
    };
    const build = (key) => FEST_SECTIONS.map(([sec, n]) => Array.from({ length: n }, (_, i) => pat[key](sec, i, n)).join('')).join('');
    return {
      bpm: 128,
      loop: false,
      steps: 46 * 16,
      tracks: [
        { id: 'lead', type: 'notes', inst: 'lead', seq: lead, res: 2, vol: 1 },
        { id: 'lead2', type: 'notes', inst: 'pluck', seq: lead2, res: 2, vol: 0.7, transpose: 12 },
        { id: 'cue', type: 'notes', inst: 'pluck', seq: lanesToNotes(cue), res: 2, vol: 0, silent: true },
        { type: 'chords', inst: 'pad', seq: chords, vol: 1 },
        { type: 'bass', inst: 'bass', seq: bassSeq, pattern: 'R . O . R . O . R . O . R . O .', vol: 1 },
        { type: 'arp', inst: 'pluck', seq: arpSeq, pattern: '0 1 2 3 4 3 2 1', vol: 0.7 },
        { type: 'drums', kit: { k: build('k'), x: build('x') }, vol: 0.85 },
        { type: 'drums', kit: { s: build('s') }, vol: 0.7 },
        { type: 'drums', kit: { h: build('h') }, vol: 0.8 },
        { type: 'drums', kit: { r: build('r') }, vol: 1 },
      ],
    };
  })();

  const SONGS = {
    menu: {
      bpm: 100,
      tracks: [
        {
          type: 'notes', inst: 'bell', res: 2, vol: 0.8,
          seq: 'E5 - D5 E5 G5 - E5 . | D5 - B4 D5 G5 - - . | C5 - B4 C5 E5 - A4 . | F4 - A4 C5 F5 - E5 D5 | E5 - D5 E5 G5 - C6 . | B5 - A5 G5 D5 - - . | A5 - G5 F5 C5 - D5 E5 | D5 - - - G4 . . .',
        },
        { type: 'chords', inst: 'pad', seq: 'C G Am F C G F G', vol: 1 },
        { type: 'bass', inst: 'bass', seq: 'C G Am F C G F G', pattern: 'R - - . . . F . R - - . . . O .', vol: 0.8 },
        { type: 'drums', kit: { k: 'x.......x.......', h: '..x...x...x...x.', s: '....x.......x...' }, vol: 0.45 },
      ],
    },
    runner: {
      bpm: 142,
      tracks: [
        {
          type: 'notes', inst: 'lead', res: 2, vol: 0.85,
          seq: 'E5 . E5 . D5 . C5 . | C5 . A4 . C5 . D5 . | E5 . G5 . E5 . D5 C5 | D5 - - - B4 . G4 . | E5 . E5 . D5 . C5 . | C5 . A4 . C5 . F5 . | E5 . D5 . C5 . D5 . | B4 - - - . . . .',
        },
        { type: 'chords', inst: 'pad', seq: 'Am F C G Am F C G', vol: 0.8 },
        { type: 'bass', inst: 'bass', seq: 'Am F C G Am F C G', pattern: 'R O R O R O R O R O R O R O R O', vol: 0.75 },
        { type: 'drums', kit: { k: 'x...x...x...x...', c: '....x.......x...', h: 'x.x.x.o.x.x.x.o.' }, vol: 0.55 },
      ],
    },
    stack: {
      bpm: 108,
      tracks: [
        { type: 'arp', inst: 'pluck', seq: 'F G Em Am F G C C', pattern: '0 2 4 3 5 4 2 1 0 2 4 3 5 4 3 2', vol: 0.55 },
        { type: 'chords', inst: 'pad', seq: 'F G Em Am F G C C', vol: 0.9 },
        { type: 'bass', inst: 'bass', seq: 'F G Em Am F G C C', pattern: 'R - - - - - . . R - - . F - - .', vol: 0.7 },
        { type: 'drums', kit: { k: 'x.........x.....', h: '....x.......x...' }, vol: 0.4 },
      ],
    },
    sort: {
      bpm: 124,
      tracks: [
        {
          type: 'notes', inst: 'pluck', res: 2, vol: 1.3,
          seq: 'C5 . E5 . G5 . E5 . | A5 . G5 . E5 . C5 . | F5 . E5 . D5 . C5 . | D5 . . B4 . . G4 . | C5 . E5 . G5 . C6 . | B5 . A5 . G5 . E5 . | F5 . A5 . G5 . F5 . | E5 . D5 . . . . .',
        },
        { type: 'chords', inst: 'pad', seq: 'C Am F G C Am F G', vol: 0.7 },
        { type: 'bass', inst: 'bass', seq: 'C Am F G C Am F G', pattern: 'R . . R . . F . R . . R . . O .', vol: 0.85 },
        { type: 'drums', kit: { k: 'x.....x.x.......', c: '....x.......x...', h: '..x...x...x...x.' }, vol: 0.75 },
      ],
    },
    quiz: {
      bpm: 96,
      tracks: [
        { type: 'arp', inst: 'pluck', seq: 'Am Dm E Am F Dm E E', pattern: '0 2 4 2 0 2 4 2 1 3 5 3 1 3 5 3', vol: 0.45 },
        { type: 'chords', inst: 'pad', seq: 'Am Dm E Am F Dm E E', vol: 0.8 },
        { type: 'bass', inst: 'bass', seq: 'Am Dm E Am F Dm E E', pattern: 'R - - - . . . . R - - - . . . .', vol: 0.6 },
        { type: 'drums', kit: { h: 'x...x...x...x...', k: 'x.......x.......' }, vol: 0.35 },
      ],
    },
    memorial: {
      bpm: 66,
      tracks: [
        {
          type: 'notes', inst: 'bell', res: 2, vol: 0.7,
          seq: 'A4 - - - C5 - - - | F5 - - - E5 - D5 - | E5 - - - G4 - - - | G#4 - - - B4 - - - | A4 - - - C5 - E5 - | F5 - - - E5 - D5 - | D5 - - - B4 - G4 - | A4 - - - - - - -',
        },
        { type: 'chords', inst: 'organ', seq: 'Am F C E Am F G Am', vol: 1 },
        { type: 'bass', inst: 'bass', seq: 'Am F C E Am F G Am', pattern: 'R - - - - - - - - - - - - - - -', vol: 0.35 },
      ],
    },
    fest: FEST,
  };
  A.SONGS = SONGS;
})(window.B);
