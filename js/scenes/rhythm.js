/* БРСМ: Команда 212 — «Фестиваль»: ритм-игра на сцене */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save, A = B.Audio;

  const LANE_COLORS = ['#FF4D5A', '#FFC93C', '#3DDC84', '#4DB8FF'];
  const KEYS = [
    ['d', 'D', 'в', 'В', 'ArrowLeft', '1'],
    ['f', 'F', 'а', 'А', 'ArrowDown', '2'],
    ['j', 'J', 'о', 'О', 'ArrowUp', '3'],
    ['k', 'K', 'л', 'Л', 'ArrowRight', '4'],
  ];
  const KEY_LABELS = ['D', 'F', 'J', 'K'];
  const WIN = { perfect: 0.05, great: 0.095, good: 0.14 };
  const DIFFS = {
    easy: { name: 'Лёгкий', travel: 1.9, grid: 4, gap: 4, holdMin: 8, doubles: false },
    normal: { name: 'Нормальный', travel: 1.5, grid: 2, gap: 2, holdMin: 4, doubles: false },
    hard: { name: 'Сложный', travel: 1.2, grid: 1, gap: 1, holdMin: 4, doubles: true },
  };
  const DEG = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

  function buildChart(diffId) {
    const d = DIFFS[diffId];
    const song = A.getSong('fest');
    const lead = song.tracks.find((t) => t.def.id === 'lead');
    const cue = song.tracks.find((t) => t.def.id === 'cue');
    const raw = [];
    for (const e of lead.events) {
      const pc = e.midi % 12;
      const deg = Math.floor(e.midi / 12) * 7 + (DEG[pc] != null ? DEG[pc] : DEG[(pc + 11) % 12]);
      raw.push({ step: e.step, lane: deg % 4, len: e.len });
    }
    const CUE_LANE = { 57: 0, 59: 1, 60: 2, 62: 3 };
    for (const e of cue.events) raw.push({ step: e.step, lane: CUE_LANE[e.midi], len: 1 });
    raw.sort((a, b) => a.step - b.step);
    // секции для «аккордов» на сложном
    const sectionAt = (step) => {
      let s = 0;
      for (const [name, bars] of A.FEST_SECTIONS) {
        if (step < s + bars * 16) return name;
        s += bars * 16;
      }
      return 'outro';
    };
    const notes = [];
    let lastStep = -99, lastLane = -1;
    for (const n of raw) {
      if (n.step % d.grid !== 0) continue;
      if (n.step - lastStep < d.gap) continue;
      let lane = n.lane;
      if (lane === lastLane && n.step - lastStep < d.gap * 2 && diffId === 'easy') lane = (lane + 1) % 4;
      const hold = n.len >= d.holdMin ? n.len : 0;
      notes.push({ step: n.step, lane, hold });
      if (d.doubles && n.step % 16 === 0 && /chorus/.test(sectionAt(n.step))) notes.push({ step: n.step, lane: (lane + 2) % 4, hold: 0 });
      lastStep = n.step + (hold ? hold - 1 : 0);
      lastLane = lane;
    }
    const sd = song.stepDur;
    return {
      song,
      notes: notes.map((n, i) => ({ id: i, lane: n.lane, t: n.step * sd, end: n.hold ? (n.step + n.hold) * sd : 0, hit: null, holding: false, done: false })),
      length: song.length * sd,
      stepDur: sd,
    };
  }

  class RhythmScene extends B.GameScene {
    get missionId() {
      return 'rhythm';
    }
    constructor(p) {
      super(p);
      this.music = 'menu';
      const prof = Save.profile();
      this.diff = (p && p.diff) || (prof && prof.seen.rhythmDiff) || 'normal';
      this.av = (prof || {}).av || Art.randomAvatar();
      this.pressed = [false, false, false, false];
      this.flashLane = [0, 0, 0, 0];
      this.judge = null;
      this.combo = 0;
      this.maxCombo = 0;
      this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
      this.score = 0;
      this.songT = -10;
      this.started = false;
      this.pointerLanes = new Map();
      this.crowd = [];
      for (let i = 0; i < 46; i++) this.crowd.push({ x: Math.random(), h: 0.7 + Math.random() * 0.5, ph: Math.random() * 6, hands: Math.random() < 0.35, phone: Math.random() < 0.18, hue: Math.random() });
    }
    briefExtra() {
      const chartLen = (id) => buildChart(id).notes.length;
      return `<div class="eyebrow">Сложность</div><div class="diff" role="group" aria-label="Сложность">${Object.entries(DIFFS)
        .map(([id, d]) => `<button type="button" data-diff="${id}" aria-pressed="${id === this.diff}">${d.name}<small>${chartLen(id)} нот${id === 'easy' ? ' · до ★★' : ''}</small></button>`)
        .join('')}</div>`;
    }
    showBriefing() {
      super.showBriefing();
      const m = UI.topModal();
      if (!m) return;
      m.el.querySelectorAll('[data-diff]').forEach((b) =>
        b.addEventListener('click', () => {
          this.diff = b.dataset.diff;
          m.el.querySelectorAll('[data-diff]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.diff === this.diff ? 'true' : 'false'));
          B.Audio.sfx('tap');
          const p = Save.profile();
          if (p) {
            p.seen.rhythmDiff = this.diff;
            Save.save();
          }
        })
      );
    }
    buildHud() {
      const root = UI.setHud(`
        <div class="hud-top">
          <div class="hud-row">
            <span class="hud-pill" data-h="score">0</span>
            <span class="hud-pill" data-h="acc"><small>точность</small><span>100%</span></span>
          </div>
          <div class="hud-row">${this.hudPauseButton()}</div>
        </div>`);
      this.bindPause(root);
      this.h = {};
      root.querySelectorAll('[data-h]').forEach((el) => (this.h[el.dataset.h] = el));
    }
    resize(W, H) {
      this.W = W;
      this.H = H;
      this.port = H > W;
      this.botW = Math.min(W * 0.92, this.port ? 520 : 470);
      this.topW = this.botW * 0.52;
      this.topY = H * (this.port ? 0.16 : 0.13);
      this.hitY = H - Math.max(110, H * 0.16);
    }
    beginCountdown(cb) {
      B.Audio.stopMusic(0.6);
      this.chart = buildChart(this.diff);
      this.travel = DIFFS[this.diff].travel;
      this.total = this.chart.notes.length;
      super.beginCountdown(cb);
    }
    start() {
      this.state = 'play';
      const lead = this.travel + 0.35;
      const h = A.startSong('fest', { delay: lead });
      this.songHandle = h;
      if (h.t0 != null) {
        this.clock = () => A.ctx.currentTime - h.t0 - (A.ctx.outputLatency || A.ctx.baseLatency || 0);
      } else {
        const t0 = performance.now() / 1000 + lead;
        this.pausedAcc = 0;
        this.clock = () => performance.now() / 1000 - t0 - this.pausedAcc;
      }
      this.started = true;
      if (!B.settings.sound) UI.toast('Включи звук — без музыки играть сложнее!', { duration: 3500 });
    }
    exit() {
      super.exit();
      if (this.songHandle && this.songHandle.player) this.songHandle.player.stop(0.25);
      if (A.ctx && A.ctx.state === 'suspended' && this.suspended) A.ctx.resume();
    }
    onPause() {
      this.pressed = [false, false, false, false];
      if (A.ctx && this.songHandle && this.songHandle.t0 != null) {
        this.suspended = true;
        A.ctx.suspend().catch(() => {});
      } else this.pauseStart = performance.now() / 1000;
    }
    onResume() {
      if (this.suspended && A.ctx) {
        this.suspended = false;
        A.ctx.resume().catch(() => {});
      } else if (this.pauseStart) {
        this.pausedAcc += performance.now() / 1000 - this.pauseStart;
        this.pauseStart = 0;
      }
    }
    // ---------- Ввод ----------
    laneForKey(k) {
      return KEYS.findIndex((arr) => arr.includes(k));
    }
    keydown(e) {
      if (super.keydown(e)) return;
      const lane = this.laneForKey(e.key);
      if (lane < 0 || e.repeat) return;
      this.press(lane);
    }
    keyup(e) {
      const lane = this.laneForKey(e.key);
      if (lane >= 0) this.release(lane);
    }
    laneAtX(x, y) {
      const k = this.persp(y != null ? Math.max(this.topY, Math.min(this.hitY, y)) : this.hitY);
      const w = this.botW * k;
      const left = this.W / 2 - w / 2;
      return U.clamp(Math.floor(((x - left) / w) * 4), 0, 3);
    }
    pointerdown(p) {
      if (this.state !== 'play') return;
      const lane = this.laneAtX(p.x, p.y);
      this.pointerLanes.set(p.id, lane);
      this.press(lane);
    }
    pointermove(p) {
      if (!this.pointerLanes.has(p.id) || this.state !== 'play') return;
      const lane = this.laneAtX(p.x, p.y);
      const old = this.pointerLanes.get(p.id);
      if (lane !== old) {
        this.pointerLanes.set(p.id, lane);
        this.release(old);
        this.pressed[lane] = true;
      }
    }
    pointerup(p) {
      if (!this.pointerLanes.has(p.id)) return;
      const lane = this.pointerLanes.get(p.id);
      this.pointerLanes.delete(p.id);
      this.release(lane);
    }
    press(lane) {
      if (this.state !== 'play' || !this.chart) return;
      this.pressed[lane] = true;
      this.flashLane[lane] = 1;
      const t = this.songT;
      let best = null, bestD = 1;
      for (const n of this.chart.notes) {
        if (n.lane !== lane || n.hit) continue;
        const d = Math.abs(n.t - t);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
        if (n.t - t > WIN.good) break;
      }
      if (!best || bestD > WIN.good) return;
      const j = bestD <= WIN.perfect ? 'perfect' : bestD <= WIN.great ? 'great' : 'good';
      best.hit = j;
      if (best.end) best.holding = true;
      else best.done = true;
      this.registerJudge(j, lane);
    }
    release(lane) {
      this.pressed[lane] = false;
      if (!this.chart) return;
      for (const n of this.chart.notes) {
        if (n.lane === lane && n.holding) {
          n.holding = false;
          n.done = true;
          if (this.songT < n.end - 0.12) {
            this.combo = 0;
            this.showJudge('сорвано', '#FF8A80');
          } else this.holdBonus(n);
        }
      }
    }
    holdBonus(n) {
      this.score += 120;
      const x = this.laneX(n.lane, this.hitY);
      this.particles.burst(x, this.hitY, 14, { colors: [LANE_COLORS[n.lane], '#fff'], speedMin: 120, speedMax: 320, shape: 'diamond', gravity: 300 });
    }
    registerJudge(j, lane) {
      this.counts[j]++;
      if (j === 'miss') {
        this.combo = 0;
        this.showJudge('мимо', '#FF5252');
        B.Audio.sfx('miss');
        return;
      }
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const base = { perfect: 300, great: 200, good: 100 }[j];
      this.score += Math.round(base * (1 + Math.min(1, Math.floor(this.combo / 10) * 0.1)));
      const txt = { perfect: 'идеально', great: 'отлично', good: 'хорошо' }[j];
      const col = { perfect: '#FFE08A', great: '#69F0AE', good: '#80D8FF' }[j];
      this.showJudge(txt, col);
      const x = this.laneX(lane, this.hitY);
      this.particles.burst(x, this.hitY, j === 'perfect' ? 16 : 9, { colors: [LANE_COLORS[lane], '#fff'], speedMin: 100, speedMax: j === 'perfect' ? 340 : 220, sizeMin: 2, sizeMax: 5, gravity: 200 });
      this.particles.emit({ x, y: this.hitY, size: 26, life: 0.35, color: LANE_COLORS[lane], shape: 'ring', drag: 0 });
      if (this.combo > 0 && this.combo % 50 === 0) {
        this.floaters.add(this.W / 2, this.H * 0.3, `${this.combo} комбо!`, { color: '#FFE08A', size: 34, life: 1.3 });
        this.confetti();
      }
    }
    showJudge(text, color) {
      this.judge = { text: text.toUpperCase(), color, t: 0 };
    }
    confetti() {
      for (let i = 0; i < 60; i++)
        this.particles.emit({
          x: Math.random() * this.W, y: -10, vx: U.rand(-60, 60), vy: U.rand(80, 260), life: 3, size: U.rand(3, 6),
          color: U.pick(['#FF4D5A', '#FFC93C', '#3DDC84', '#4DB8FF', '#fff']), shape: 'rect', gravity: 120, drag: 0.5, vr: U.rand(-10, 10), shrink: false,
        });
    }
    // ---------- Геометрия ----------
    persp(y) {
      const u = U.clamp((y - this.topY) / (this.hitY - this.topY), -0.2, 1.3);
      return U.lerp(this.topW / this.botW, 1, u);
    }
    laneX(lane, y) {
      const k = this.persp(y);
      return this.W / 2 + (lane - 1.5) * (this.botW / 4) * k;
    }
    noteY(t) {
      const u = 1 - (t - this.songT) / this.travel;
      // лёгкое ускорение к линии — ощущение глубины
      const e = u < 0 ? u : Math.pow(u, 1.35);
      return this.topY + (this.hitY - this.topY) * e;
    }
    // ---------- Обновление ----------
    update(dt) {
      super.update(dt);
      if (this.judge) this.judge.t += dt;
      for (let i = 0; i < 4; i++) this.flashLane[i] = Math.max(0, this.flashLane[i] - dt * 4);
      if (!this.started || this.state === 'over') {
        if (this.started && this.clock) this.songT = this.clock();
        return;
      }
      this.songT = this.clock();
      const t = this.songT;
      for (const n of this.chart.notes) {
        if (n.done) continue;
        if (!n.hit && t - n.t > WIN.good) {
          n.hit = 'miss';
          n.done = true;
          this.registerJudge('miss', n.lane);
        } else if (n.holding) {
          if (t >= n.end) {
            n.holding = false;
            n.done = true;
            this.holdBonus(n);
          } else if (Math.random() < 0.5) {
            const x = this.laneX(n.lane, this.hitY);
            this.particles.emit({ x: x + U.rand(-10, 10), y: this.hitY, vx: U.rand(-30, 30), vy: -U.rand(100, 220), life: 0.4, size: 3, color: LANE_COLORS[n.lane] });
            this.score += 2;
          }
        }
        if (n.t - t > this.travel + 1) break;
      }
      const judged = this.counts.perfect + this.counts.great + this.counts.good + this.counts.miss;
      this.acc = judged ? (this.counts.perfect + this.counts.great * 0.7 + this.counts.good * 0.4) / judged : 1;
      if (this.h) {
        this.h.score.textContent = U.fmt(this.score);
        this.h.acc.querySelector('span').textContent = Math.round(this.acc * 100) + '%';
      }
      if (t > this.chart.length + 0.6) this.end();
    }
    end() {
      if (this.state === 'over') return;
      const c = this.counts;
      const total = this.total;
      const acc = Math.round(((c.perfect + c.great * 0.7 + c.good * 0.4) / total) * 100);
      let stars = this.starsFor(acc);
      if (this.diff === 'easy') stars = Math.min(2, stars);
      const grade = acc >= 95 ? 'S' : acc >= 88 ? 'A' : acc >= 75 ? 'B' : acc >= 55 ? 'C' : 'D';
      if (c.miss === 0) Save.awardBadge('rhythm_fc');
      if (grade === 'S' && this.diff === 'hard') Save.awardBadge('headliner');
      this.confetti();
      this.finish({
        score: acc,
        stars,
        scoreLabel: `% точности · оценка ${grade}`,
        boardScore: this.score,
        boardLabel: DIFFS[this.diff].name + ' · ' + acc + '%',
        title: grade === 'S' ? 'Зал аплодирует стоя!' : grade === 'A' ? 'Отличное выступление!' : null,
        delay: 1400,
        lines: [
          ['Очки', U.fmt(this.score)],
          ['Идеально', String(c.perfect)],
          ['Отлично', String(c.great)],
          ['Хорошо', String(c.good)],
          ['Мимо', String(c.miss)],
          ['Макс. комбо', String(this.maxCombo)],
        ],
      });
    }
    // ---------- Отрисовка ----------
    render(ctx) {
      const W = this.W, H = this.H, t = this.t;
      const sd = this.chart ? this.chart.stepDur : 60 / 128 / 4;
      const beatPos = this.started ? Math.max(0, this.songT) / (sd * 4) : t * 1.2;
      const beatFrac = beatPos % 1;
      const pulse = Math.exp(-beatFrac * 5);
      const step = Math.floor(Math.max(0, this.songT) / sd);
      let section = 'intro';
      {
        let s = 0;
        for (const [name, bars] of A.FEST_SECTIONS) {
          if (step < s + bars * 16) {
            section = name;
            break;
          }
          s += bars * 16;
        }
      }
      const chorus = this.started && /chorus/.test(section);
      // фон сцены
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#120A2A');
      g.addColorStop(0.6, chorus ? '#3A1258' : '#26124A');
      g.addColorStop(1, '#0B0618');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(this.shake.x, this.shake.y);
      // светодиодный экран
      const sw = Math.min(W * 0.8, 900), sh = H * 0.26, sx = W / 2 - sw / 2, sy = H * 0.05;
      ctx.fillStyle = '#07040F';
      ctx.fillRect(sx - 6, sy - 6, sw + 12, sh + 12);
      const eg = ctx.createLinearGradient(sx, sy, sx + sw, sy);
      eg.addColorStop(0, '#2A0B3D');
      eg.addColorStop(0.5, chorus ? '#5C1A6B' : '#3A1452');
      eg.addColorStop(1, '#2A0B3D');
      ctx.fillStyle = eg;
      ctx.fillRect(sx, sy, sw, sh);
      // эквалайзер
      const bars = 32;
      for (let i = 0; i < bars; i++) {
        const v = (0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + beatPos * 3.1))) * (0.5 + pulse * 0.5);
        const bh = sh * 0.8 * v;
        ctx.fillStyle = LANE_COLORS[i % 4] + '88';
        ctx.fillRect(sx + (i + 0.15) * (sw / bars), sy + sh - bh, (sw / bars) * 0.7, bh);
      }
      ctx.fillStyle = `rgba(255,255,255,${0.75 + pulse * 0.25})`;
      let tfs = Math.min(sh * 0.32, 64);
      ctx.font = `900 ${tfs}px ${B.FONT_DISPLAY}`;
      const tw = ctx.measureText('БРСМ FEST').width;
      if (tw > sw * 0.86) {
        tfs *= (sw * 0.86) / tw;
        ctx.font = `900 ${tfs}px ${B.FONT_DISPLAY}`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('БРСМ FEST', W / 2, sy + sh * 0.42);
      ctx.fillStyle = '#FFC93C';
      ctx.font = `700 ${Math.min(sh * 0.12, 22)}px ${B.FONT_DISPLAY}`;
      ctx.fillText('КОМАНДА 212', W / 2, sy + sh * 0.72);
      // сетка пикселей экрана
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let x = sx; x < sx + sw; x += 4) ctx.fillRect(x, sy, 1, sh);
      // прожекторы
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const lx = W * (0.1 + i * 0.2);
        const a = Math.sin(t * 0.9 + i * 1.3) * 0.45 + (i - 2) * 0.08;
        const col = LANE_COLORS[(i + Math.floor(beatPos / 4)) % 4];
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, U.alpha(col, 0.28 + pulse * 0.2));
        bg.addColorStop(1, U.alpha(col, 0));
        ctx.save();
        ctx.translate(lx, -10);
        ctx.rotate(a);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.lineTo(H * 0.22, H * 1.1);
        ctx.lineTo(-H * 0.22, H * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // лазеры на припеве
      if (chorus) {
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const a = Math.PI / 2 + Math.sin(t * 1.6 + i * 0.5) * 0.9;
          const col = LANE_COLORS[i % 4];
          ctx.strokeStyle = U.alpha(col, 0.35 * (0.5 + pulse * 0.5));
          for (const ox of [W * 0.02, W * 0.98]) {
            ctx.beginPath();
            ctx.moveTo(ox, sy + sh);
            ctx.lineTo(ox + Math.cos(a) * W * (ox < W / 2 ? 1 : -1), sy + sh + Math.sin(a) * H);
            ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // ферма сверху
      ctx.strokeStyle = '#4A4458';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(W, 8);
      ctx.moveTo(0, 22);
      ctx.lineTo(W, 22);
      for (let x = 0; x < W; x += 20) {
        ctx.moveTo(x, 8);
        ctx.lineTo(x + 14, 22);
      }
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const lx = W * (0.06 + i * 0.11);
        ctx.fillStyle = '#2B2638';
        ctx.fillRect(lx - 8, 20, 16, 14);
        ctx.fillStyle = U.alpha(LANE_COLORS[(i + Math.floor(beatPos)) % 4], 0.6 + pulse * 0.4);
        ctx.beginPath();
        ctx.arc(lx, 36, 5, 0, U.TAU);
        ctx.fill();
      }
      // артист — твой персонаж
      if (!this.port) {
        const ax = W / 2 - this.botW / 2 - Math.min(140, W * 0.12), ay = this.hitY + 24;
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.beginPath();
        ctx.ellipse(ax, ay, 70, 14, 0, 0, U.TAU);
        ctx.fill();
        const s = Math.min(1.6, H / 480);
        Art.avatar(ctx, ax, ay - 6 - pulse * 6, s, Object.assign({}, this.av, { flowers: false }), { kind: this.combo >= 10 ? 'cheer' : 'wave', t, mouth: 'grin' });
        // микрофон-стойка
        ctx.strokeStyle = '#8A8F9C';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ax + 34 * s, ay);
        ctx.lineTo(ax + 34 * s, ay - 62 * s);
        ctx.lineTo(ax + 22 * s, ay - 76 * s);
        ctx.stroke();
        ctx.fillStyle = '#2B2D35';
        ctx.beginPath();
        ctx.arc(ax + 20 * s, ay - 79 * s, 5 * s, 0, U.TAU);
        ctx.fill();
        // колонки
        for (const d of [-1, 1]) {
          const kx = W / 2 + d * (this.botW / 2 + Math.min(W * 0.28, 300));
          if (kx < 30 || kx > W - 30) continue;
          ctx.fillStyle = '#1A1622';
          U.rr(ctx, kx - 34, this.hitY - 120, 68, 150, 8);
          ctx.fill();
          for (const [cy, r] of [[this.hitY - 82, 18], [this.hitY - 22, 26]]) {
            ctx.fillStyle = '#3A3448';
            ctx.beginPath();
            ctx.arc(kx, cy, r * (1 + pulse * 0.12), 0, U.TAU);
            ctx.fill();
            ctx.fillStyle = '#0E0B14';
            ctx.beginPath();
            ctx.arc(kx, cy, r * 0.45, 0, U.TAU);
            ctx.fill();
          }
        }
      }
      this.drawHighway(ctx, pulse);
      // толпа
      this.drawCrowd(ctx, beatPos, pulse);
      this.particles.render(ctx);
      this.floaters.render(ctx);
      // оценка попадания
      if (this.judge && this.judge.t < 0.6) {
        const j = this.judge;
        const sc = j.t < 0.08 ? 0.7 + (j.t / 0.08) * 0.5 : 1.2 - Math.min(0.2, (j.t - 0.08) * 0.8);
        ctx.save();
        ctx.translate(W / 2, this.hitY - (this.hitY - this.topY) * 0.42);
        ctx.scale(sc, sc);
        ctx.globalAlpha = j.t > 0.4 ? 1 - (j.t - 0.4) / 0.2 : 1;
        ctx.font = `900 ${Math.min(44, W * 0.08)}px ${B.FONT_DISPLAY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#120A2A';
        ctx.strokeText(j.text, 0, 0);
        ctx.fillStyle = j.color;
        ctx.fillText(j.text, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (this.combo >= 5) {
        ctx.font = `900 ${Math.min(30, W * 0.06)}px ${B.FONT_DISPLAY}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fillText(String(this.combo), W / 2, this.hitY - (this.hitY - this.topY) * 0.28);
        ctx.font = `700 12px ${B.FONT_BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.fillText('КОМБО', W / 2, this.hitY - (this.hitY - this.topY) * 0.28 + 22);
      }
      // прогресс песни
      if (this.chart && this.started) {
        const p = U.clamp(this.songT / this.chart.length, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        ctx.fillRect(0, H - 4, W, 4);
        ctx.fillStyle = '#FFC93C';
        ctx.fillRect(0, H - 4, W * p, 4);
      }
      ctx.restore();
    }
    drawHighway(ctx, pulse) {
      const W = this.W, top = this.topY, hit = this.hitY;
      const bottom = Math.min(this.H - 10, hit + 60);
      const L = (y) => W / 2 - (this.botW / 2) * this.persp(y);
      const R = (y) => W / 2 + (this.botW / 2) * this.persp(y);
      // полотно
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, 'rgba(20,12,40,0)');
      g.addColorStop(0.15, 'rgba(20,12,40,.75)');
      g.addColorStop(1, 'rgba(20,12,40,.92)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L(top), top);
      ctx.lineTo(R(top), top);
      ctx.lineTo(R(bottom), bottom);
      ctx.lineTo(L(bottom), bottom);
      ctx.closePath();
      ctx.fill();
      // подсветка нажатых дорожек
      for (let i = 0; i < 4; i++) {
        const f = Math.max(this.flashLane[i] * 0.6, this.pressed[i] ? 0.35 : 0);
        if (f <= 0) continue;
        const x0t = U.lerp(L(top), R(top), i / 4), x1t = U.lerp(L(top), R(top), (i + 1) / 4);
        const x0b = U.lerp(L(hit), R(hit), i / 4), x1b = U.lerp(L(hit), R(hit), (i + 1) / 4);
        const lg = ctx.createLinearGradient(0, top, 0, hit);
        lg.addColorStop(0, U.alpha(LANE_COLORS[i], 0));
        lg.addColorStop(1, U.alpha(LANE_COLORS[i], f));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(x0t, top);
        ctx.lineTo(x1t, top);
        ctx.lineTo(x1b, hit);
        ctx.lineTo(x0b, hit);
        ctx.closePath();
        ctx.fill();
      }
      // разделители
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(U.lerp(L(top), R(top), i / 4), top);
        ctx.lineTo(U.lerp(L(bottom), R(bottom), i / 4), bottom);
        ctx.stroke();
      }
      // долевые линии такта
      if (this.chart && this.started) {
        const beatLen = this.chart.stepDur * 4;
        const first = Math.ceil((this.songT - 0.2) / beatLen);
        for (let b = first; b * beatLen < this.songT + this.travel; b++) {
          const y = this.noteY(b * beatLen);
          if (y < top || y > hit) continue;
          ctx.strokeStyle = b % 4 === 0 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)';
          ctx.beginPath();
          ctx.moveTo(L(y), y);
          ctx.lineTo(R(y), y);
          ctx.stroke();
        }
      }
      // линия попадания и «приёмники»
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + pulse * 0.35})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(L(hit), hit);
      ctx.lineTo(R(hit), hit);
      ctx.stroke();
      const lw = this.botW / 4;
      for (let i = 0; i < 4; i++) {
        const x = this.laneX(i, hit);
        const r = lw * 0.36;
        ctx.fillStyle = this.pressed[i] ? LANE_COLORS[i] : 'rgba(255,255,255,.06)';
        ctx.strokeStyle = LANE_COLORS[i];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, hit, r, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
        if (!U.isTouch()) {
          ctx.fillStyle = this.pressed[i] ? '#120A2A' : 'rgba(255,255,255,.75)';
          ctx.font = `900 ${Math.max(12, r * 0.6)}px ${B.FONT_DISPLAY}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(KEY_LABELS[i], x, hit + 1);
        }
      }
      // ноты
      if (!this.chart) return;
      const t = this.songT;
      for (const n of this.chart.notes) {
        if (n.t - t > this.travel + 0.1) break;
        if (n.done && !n.holding) continue;
        if (n.hit === 'miss') continue;
        const col = LANE_COLORS[n.lane];
        // длинная нота
        if (n.end) {
          const y0 = n.holding ? hit : this.noteY(n.t);
          const y1 = Math.max(top, this.noteY(n.end));
          if (y0 > top) {
            const w0 = (lw * 0.34) * this.persp(y0), w1 = (lw * 0.34) * this.persp(y1);
            const x0 = this.laneX(n.lane, y0), x1 = this.laneX(n.lane, y1);
            ctx.fillStyle = U.alpha(col, n.holding ? 0.85 : 0.55);
            ctx.beginPath();
            ctx.moveTo(x0 - w0 / 2, y0);
            ctx.lineTo(x1 - w1 / 2, y1);
            ctx.lineTo(x1 + w1 / 2, y1);
            ctx.lineTo(x0 + w0 / 2, y0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            ctx.fillRect(x1 - w1 * 0.08, y1, w1 * 0.16, y0 - y1);
          }
        }
        if (n.hit) continue;
        const y = this.noteY(n.t);
        if (y < top - 20 || y > this.H + 30) continue;
        const k = this.persp(y);
        const x = this.laneX(n.lane, y);
        const nw = lw * 0.8 * k, nh = lw * 0.3 * k;
        const fade = U.clamp((y - top) / 40, 0, 1);
        ctx.globalAlpha = fade;
        ctx.fillStyle = U.alpha(col, 0.35);
        U.rr(ctx, x - nw / 2 - 4, y - nh / 2 - 4, nw + 8, nh + 8, nh / 2 + 4);
        ctx.fill();
        ctx.fillStyle = col;
        U.rr(ctx, x - nw / 2, y - nh / 2, nw, nh, nh / 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        U.rr(ctx, x - nw * 0.36, y - nh * 0.32, nw * 0.72, nh * 0.22, nh * 0.11);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    drawCrowd(ctx, beatPos, pulse) {
      const W = this.W, H = this.H;
      const base = H + 10;
      for (const c of this.crowd) {
        const x = c.x * W;
        if (Math.abs(x - W / 2) < this.botW * 0.56) continue;
        const jump = Math.max(0, Math.sin(beatPos * Math.PI * 2 + c.ph)) * 10 * (0.4 + pulse * 0.6);
        const h = 70 * c.h;
        const y = base - h * 0.55 - jump;
        ctx.fillStyle = `hsl(${260 + c.hue * 40}, 30%, ${10 + c.hue * 8}%)`;
        ctx.beginPath();
        ctx.arc(x, y - h * 0.32, h * 0.17, 0, U.TAU);
        ctx.fill();
        U.rr(ctx, x - h * 0.24, y - h * 0.15, h * 0.48, h * 0.8, h * 0.18);
        ctx.fill();
        if (c.hands) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = h * 0.08;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - h * 0.18, y - h * 0.1);
          ctx.lineTo(x - h * 0.3, y - h * 0.62 - jump * 0.3);
          ctx.moveTo(x + h * 0.18, y - h * 0.1);
          ctx.lineTo(x + h * 0.3, y - h * 0.62 - jump * 0.3);
          ctx.stroke();
          if (c.phone) {
            ctx.fillStyle = `rgba(255,255,240,${0.6 + Math.sin(this.t * 3 + c.ph) * 0.3})`;
            ctx.fillRect(x + h * 0.27, y - h * 0.74 - jump * 0.3, 5, 8);
          }
        }
      }
    }
  }

  B.Scenes.rhythm = RhythmScene;
  B.RhythmChart = buildChart;
})(window.B);
