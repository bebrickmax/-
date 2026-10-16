/* БРСМ: Команда 212 — «Чистый город»: сортировка отходов на субботнике */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save;

  const BINS = [
    { id: 'plastic', name: 'Пластик', color: '#F2B91F', dark: '#B9860B', icon: 'bottle' },
    { id: 'paper', name: 'Бумага', color: '#2F7BD8', dark: '#1E519A', icon: 'paper' },
    { id: 'glass', name: 'Стекло', color: '#2E9E5B', dark: '#1D6B3C', icon: 'jar' },
    { id: 'battery', name: 'Батарейки', color: '#E2572B', dark: '#A23A17', icon: 'battery' },
  ];
  const ITEMS = [
    { kind: 'pet', name: 'ПЭТ-бутылка', bin: 'plastic' },
    { kind: 'shampoo', name: 'Флакон шампуня', bin: 'plastic' },
    { kind: 'bag', name: 'Пакет', bin: 'plastic' },
    { kind: 'cup', name: 'Стаканчик от йогурта', bin: 'plastic' },
    { kind: 'news', name: 'Газета', bin: 'paper' },
    { kind: 'box', name: 'Картонная коробка', bin: 'paper' },
    { kind: 'book', name: 'Старая тетрадь', bin: 'paper' },
    { kind: 'plane', name: 'Бумажный самолётик', bin: 'paper' },
    { kind: 'gbottle', name: 'Стеклянная бутылка', bin: 'glass' },
    { kind: 'jar', name: 'Банка от варенья', bin: 'glass' },
    { kind: 'aa', name: 'Батарейка', bin: 'battery' },
    { kind: 'coin', name: 'Батарейка-таблетка', bin: 'battery' },
  ];

  // ---------- Рисунки предметов (центр 0,0, размер ~ s) ----------
  const DRAW = {
    pet(ctx, s) {
      ctx.fillStyle = 'rgba(160,215,245,.9)';
      U.rr(ctx, -s * 0.22, -s * 0.28, s * 0.44, s * 0.78, s * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, -s * 0.22);
      ctx.quadraticCurveTo(-s * 0.1, -s * 0.42, -s * 0.08, -s * 0.48);
      ctx.lineTo(s * 0.08, -s * 0.48);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.42, s * 0.22, -s * 0.22);
      ctx.fill();
      ctx.fillStyle = '#1F6FD1';
      ctx.fillRect(-s * 0.1, -s * 0.58, s * 0.2, s * 0.11);
      ctx.fillStyle = '#E8384F';
      ctx.fillRect(-s * 0.22, -s * 0.02, s * 0.44, s * 0.18);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(-s * 0.15, -s * 0.2, s * 0.05, s * 0.55);
    },
    shampoo(ctx, s) {
      ctx.fillStyle = '#F06292';
      U.rr(ctx, -s * 0.24, -s * 0.3, s * 0.48, s * 0.8, s * 0.16);
      ctx.fill();
      ctx.fillStyle = '#AD1457';
      U.rr(ctx, -s * 0.12, -s * 0.48, s * 0.24, s * 0.2, s * 0.05);
      ctx.fill();
      ctx.fillStyle = '#fff';
      U.rr(ctx, -s * 0.16, -s * 0.05, s * 0.32, s * 0.3, s * 0.06);
      ctx.fill();
      ctx.fillStyle = '#F06292';
      ctx.beginPath();
      ctx.arc(0, s * 0.1, s * 0.07, 0, U.TAU);
      ctx.fill();
    },
    bag(ctx, s) {
      ctx.fillStyle = 'rgba(245,245,250,.95)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.36, -s * 0.2);
      ctx.lineTo(s * 0.36, -s * 0.2);
      ctx.lineTo(s * 0.3, s * 0.48);
      ctx.lineTo(-s * 0.3, s * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,245,250,.95)';
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.arc(-s * 0.16, -s * 0.22, s * 0.12, Math.PI, U.TAU);
      ctx.moveTo(s * 0.28, -s * 0.22);
      ctx.arc(s * 0.16, -s * 0.22, s * 0.12, 0, Math.PI, true);
      ctx.stroke();
      ctx.fillStyle = '#2E9E5B';
      ctx.fillRect(-s * 0.32, s * 0.05, s * 0.64, s * 0.1);
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-s * 0.33, -s * 0.2, s * 0.66, s * 0.68);
    },
    cup(ctx, s) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.3);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.lineTo(s * 0.22, s * 0.4);
      ctx.lineTo(-s * 0.22, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F6B92B';
      ctx.fillRect(-s * 0.34, -s * 0.38, s * 0.68, s * 0.1);
      ctx.fillStyle = '#E8384F';
      ctx.beginPath();
      ctx.arc(0, s * 0.03, s * 0.12, 0, U.TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
    news(ctx, s) {
      ctx.fillStyle = '#ECE7DD';
      ctx.fillRect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.64);
      ctx.fillStyle = '#D9D2C4';
      ctx.fillRect(0, -s * 0.32, s * 0.42, s * 0.64);
      ctx.fillStyle = '#3B3F4A';
      ctx.fillRect(-s * 0.36, -s * 0.25, s * 0.7, s * 0.09);
      ctx.fillStyle = '#9C9588';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-s * 0.36, -s * 0.08 + i * s * 0.09, s * 0.3, s * 0.035);
        ctx.fillRect(s * 0.05, -s * 0.08 + i * s * 0.09, s * 0.3, s * 0.035);
      }
    },
    box(ctx, s) {
      ctx.fillStyle = '#C8955A';
      ctx.fillRect(-s * 0.4, -s * 0.24, s * 0.8, s * 0.6);
      ctx.fillStyle = '#B07D45';
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.24);
      ctx.lineTo(-s * 0.28, -s * 0.42);
      ctx.lineTo(s * 0.28, -s * 0.42);
      ctx.lineTo(s * 0.4, -s * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#E7C08A';
      ctx.fillRect(-s * 0.06, -s * 0.24, s * 0.12, s * 0.6);
      ctx.strokeStyle = '#8A5E2E';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-s * 0.4, -s * 0.24, s * 0.8, s * 0.6);
    },
    book(ctx, s) {
      ctx.fillStyle = '#3F7FD9';
      U.rr(ctx, -s * 0.32, -s * 0.42, s * 0.64, s * 0.84, s * 0.05);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-s * 0.18, -s * 0.28, s * 0.4, s * 0.16);
      ctx.fillStyle = '#E9EEF6';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(-s * 0.32, -s * 0.34 + i * s * 0.14, s * 0.04, 0, U.TAU);
        ctx.fill();
      }
    },
    plane(ctx, s) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(s * 0.48, -s * 0.1);
      ctx.lineTo(-s * 0.45, -s * 0.38);
      ctx.lineTo(-s * 0.12, s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#DCE3EA';
      ctx.beginPath();
      ctx.moveTo(s * 0.48, -s * 0.1);
      ctx.lineTo(-s * 0.12, s * 0.02);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.15)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    },
    gbottle(ctx, s) {
      ctx.fillStyle = 'rgba(46,140,80,.92)';
      U.rr(ctx, -s * 0.2, -s * 0.18, s * 0.4, s * 0.68, s * 0.1);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.08, -s * 0.3, -s * 0.07, -s * 0.52);
      ctx.lineTo(s * 0.07, -s * 0.52);
      ctx.quadraticCurveTo(s * 0.08, -s * 0.3, s * 0.2, -s * 0.1);
      ctx.fill();
      ctx.fillStyle = '#F6E7B8';
      ctx.fillRect(-s * 0.2, s * 0.04, s * 0.4, s * 0.2);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fillRect(-s * 0.13, -s * 0.12, s * 0.05, s * 0.5);
    },
    jar(ctx, s) {
      ctx.fillStyle = 'rgba(200,230,240,.85)';
      U.rr(ctx, -s * 0.3, -s * 0.26, s * 0.6, s * 0.68, s * 0.12);
      ctx.fill();
      ctx.fillStyle = '#C2185B';
      U.rr(ctx, -s * 0.26, -s * 0.02, s * 0.52, s * 0.4, s * 0.08);
      ctx.fill();
      ctx.fillStyle = '#E0A82E';
      U.rr(ctx, -s * 0.33, -s * 0.4, s * 0.66, s * 0.16, s * 0.04);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(-s * 0.2, -s * 0.2, s * 0.06, s * 0.5);
    },
    aa(ctx, s) {
      ctx.fillStyle = '#2B2D35';
      U.rr(ctx, -s * 0.16, -s * 0.38, s * 0.32, s * 0.8, s * 0.06);
      ctx.fill();
      ctx.fillStyle = '#F6B92B';
      U.rr(ctx, -s * 0.16, -s * 0.38, s * 0.32, s * 0.3, s * 0.06);
      ctx.fill();
      ctx.fillStyle = '#9AA0A8';
      ctx.fillRect(-s * 0.06, -s * 0.46, s * 0.12, s * 0.08);
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${s * 0.22}px ${B.FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', 0, -s * 0.22);
    },
    coin(ctx, s) {
      const g = ctx.createLinearGradient(-s * 0.3, -s * 0.3, s * 0.3, s * 0.3);
      g.addColorStop(0, '#F3F4F6');
      g.addColorStop(1, '#8D939C');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.32, 0, U.TAU);
      ctx.fill();
      ctx.strokeStyle = '#6B717A';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#6B717A';
      ctx.font = `900 ${s * 0.2}px ${B.FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('3V', 0, 0);
    },
  };

  function binIcon(ctx, kind, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = s * 0.1;
    if (kind === 'bottle') {
      U.rr(ctx, -s * 0.2, -s * 0.2, s * 0.4, s * 0.62, s * 0.1);
      ctx.fill();
      ctx.fillRect(-s * 0.08, -s * 0.42, s * 0.16, s * 0.24);
    } else if (kind === 'paper') {
      ctx.fillRect(-s * 0.3, -s * 0.38, s * 0.6, s * 0.76);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.2, -s * 0.24 + i * s * 0.15, s * 0.4, s * 0.05);
    } else if (kind === 'jar') {
      U.rr(ctx, -s * 0.28, -s * 0.22, s * 0.56, s * 0.62, s * 0.12);
      ctx.fill();
      ctx.fillRect(-s * 0.3, -s * 0.4, s * 0.6, s * 0.14);
    } else if (kind === 'battery') {
      U.rr(ctx, -s * 0.18, -s * 0.32, s * 0.36, s * 0.72, s * 0.06);
      ctx.fill();
      ctx.fillRect(-s * 0.07, -s * 0.42, s * 0.14, s * 0.1);
    }
    ctx.restore();
  }

  class SortScene extends B.GameScene {
    get missionId() {
      return 'sort';
    }
    constructor(p) {
      super(p);
      this.music = 'sort';
      this.season = Art.season();
      this.items = [];
      this.score = 0;
      this.lives = 3;
      this.combo = 0;
      this.bestCombo = 0;
      this.correct = 0;
      this.mistakes = 0;
      this.spawnT = 0.5;
      this.playT = 0;
      this.drag = null;
      this.binAnim = BINS.map(() => ({ lid: 0, bounce: 0, shake: 0 }));
      this.lastKinds = [];
      this.helpers = [
        { av: { skin: 0, hair: 2, hairColor: 3, jacket: 0 }, cheer: 0 },
        { av: { skin: 2, hair: 0, hairColor: 0, jacket: 1, glasses: true }, cheer: 0 },
      ];
    }
    buildHud() {
      const root = UI.setHud(`
        <div class="hud-top">
          <div class="hud-row">
            <span class="hud-pill" data-h="score">0</span>
            <span class="hud-pill" data-h="mult"><small>серия</small><span>×1</span></span>
          </div>
          <div class="hud-row">
            <span class="hud-pill" data-h="lives">${UI.icon('heart')}${UI.icon('heart')}${UI.icon('heart')}</span>
            ${this.hudPauseButton()}
          </div>
        </div>`);
      this.bindPause(root);
      this.h = {};
      root.querySelectorAll('[data-h]').forEach((el) => (this.h[el.dataset.h] = el));
      this.hudCache = {};
    }
    setHud(key, val, bump) {
      if (this.hudCache[key] === val) return;
      this.hudCache[key] = val;
      const el = this.h[key];
      if (!el) return;
      if (key === 'mult') el.querySelector('span').textContent = '×' + val;
      else if (key === 'lives') el.innerHTML = [0, 1, 2].map((i) => `<span style="opacity:${i < val ? 1 : 0.25}">${UI.icon('heart')}</span>`).join('');
      else el.textContent = val;
      if (bump) {
        el.classList.remove('is-bump');
        void el.offsetWidth;
        el.classList.add('is-bump');
      }
    }
    resize(W, H) {
      this.W = W;
      this.H = H;
      const gap = Math.min(18, W * 0.025);
      const bw = Math.min((Math.min(W, 820) - 32 - gap * 3) / 4, 160);
      const bh = bw * 1.05;
      const total = bw * 4 + gap * 3;
      const x0 = (W - total) / 2;
      const by = H - bh - Math.max(18, H * 0.03);
      this.bins = BINS.map((b, i) => Object.assign({}, b, { x: x0 + i * (bw + gap), y: by, w: bw, h: bh }));
      this.floorY = by + bh * 0.1;
      this.itemS = U.clamp(Math.min(W, H) * 0.085, 40, 74);
      this.fieldX0 = x0 + this.itemS * 0.6;
      this.fieldX1 = x0 + total - this.itemS * 0.6;
    }
    start() {
      this.state = 'play';
      if (!Save.profile().seen.sortHint) {
        Save.profile().seen.sortHint = 1;
        Save.save();
        UI.toast(U.isTouch() ? 'Тапни по контейнеру — туда полетит нижний предмет. Или перетащи его пальцем.' : 'Клавиши 1–4 или клик по контейнеру. Предмет можно перетащить мышью.', { duration: 5200 });
      }
    }
    get fallTime() {
      return Math.max(3.1, 7.2 - this.playT * 0.045);
    }
    spawn() {
      let def;
      for (let k = 0; k < 6; k++) {
        def = U.pick(ITEMS);
        if (!this.lastKinds.includes(def.kind)) break;
      }
      this.lastKinds.push(def.kind);
      if (this.lastKinds.length > 3) this.lastKinds.shift();
      const x = U.rand(this.fieldX0, this.fieldX1);
      this.items.push({
        def, x, y: 60 + this.itemS * 0.5, rot: U.rand(-0.4, 0.4), vr: U.rand(-0.8, 0.8), state: 'fall', golden: Math.random() < 0.06, t: 0, sx: 1,
      });
    }
    activeItem() {
      let best = null;
      for (const it of this.items) if (it.state === 'fall' && (!best || it.y > best.y)) best = it;
      return best;
    }
    binAt(x, y) {
      return this.bins.findIndex((b) => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - this.itemS * 1.2 && y <= b.y + b.h + 10);
    }
    send(it, binIdx) {
      if (!it || binIdx < 0) return;
      const b = this.bins[binIdx];
      it.state = 'fly';
      it.fx = it.x;
      it.fy = it.y;
      it.tx = b.x + b.w / 2;
      it.ty = b.y + b.h * 0.15;
      it.flyT = 0;
      it.bin = binIdx;
      this.binAnim[binIdx].lid = 1;
      B.Audio.sfx('whoosh');
    }
    resolve(it) {
      const bi = it.bin;
      const b = this.bins[bi];
      const ok = b.id === it.def.bin;
      const cx = b.x + b.w / 2, cy = b.y;
      if (ok) {
        this.combo++;
        this.correct++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const mult = Math.min(5, 1 + Math.floor(this.combo / 5));
        const pts = 10 * mult * (it.golden ? 3 : 1);
        this.score += pts;
        B.Audio.sfx('correct', this.combo % 10);
        this.binAnim[bi].bounce = 1;
        this.particles.burst(cx, cy, it.golden ? 26 : 14, { colors: [b.color, '#fff', it.golden ? '#FFE08A' : U.shade(b.color, 0.4)], shape: it.golden ? 'star' : 'diamond', speedMin: 80, speedMax: 260, gravity: 500, angle: -Math.PI / 2, spread: 1.1 });
        this.floaters.add(cx, cy - 30, '+' + pts, { color: it.golden ? '#FFE08A' : '#fff', size: 24 });
        if (this.combo > 0 && this.combo % 5 === 0) {
          this.floaters.add(this.W / 2, this.H * 0.32, `Серия ×${mult}!`, { color: '#B9F6CA', size: 30, life: 1.1 });
          this.helpers.forEach((h) => (h.cheer = 1.4));
        }
        if (this.combo >= 25) Save.awardBadge('eco');
        if (this.score >= 2000) Save.awardBadge('eco_master');
        this.setHud('score', U.fmt(this.score), true);
      } else {
        this.mistake(it, `Это ${this.binName(it.def.bin)}!`, cx, cy);
        this.binAnim[bi].shake = 1;
      }
      this.setHud('mult', Math.min(5, 1 + Math.floor(this.combo / 5)));
    }
    binName(id) {
      return { plastic: 'пластик', paper: 'бумага', glass: 'стекло', battery: 'батарейка' }[id];
    }
    mistake(it, text, x, y) {
      this.combo = 0;
      this.mistakes++;
      this.lives--;
      B.Audio.sfx('wrong');
      this.shake.add(0.35);
      this.flash = 0.22;
      this.floaters.add(x, y - 40, text, { color: '#FFCDD2', size: 22, life: 1.4 });
      this.setHud('lives', this.lives, true);
      if (this.lives <= 0) this.end();
    }
    end() {
      this.finish({
        score: this.score,
        stars: this.starsFor(this.score),
        delay: 1200,
        lines: [
          ['Рассортировано', String(this.correct)],
          ['Лучшая серия', String(this.bestCombo)],
          ['Ошибок', String(this.mistakes)],
        ],
      });
    }
    keydown(e) {
      if (super.keydown(e)) return;
      if (this.state !== 'play') return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) this.send(this.activeItem(), idx);
    }
    pointerdown(p) {
      if (this.state !== 'play') return;
      // сначала — схватить предмет
      let hit = null;
      for (const it of this.items) {
        if (it.state !== 'fall') continue;
        if (Math.hypot(p.x - it.x, p.y - it.y) < this.itemS * 0.75) hit = it;
      }
      if (hit) {
        hit.state = 'drag';
        this.drag = { it: hit, id: p.id, ox: hit.x - p.x, oy: hit.y - p.y, sx: p.x, sy: p.y };
        B.Audio.sfx('tap');
        return;
      }
      const bi = this.binAt(p.x, p.y);
      if (bi >= 0) this.send(this.activeItem(), bi);
    }
    pointermove(p) {
      if (!this.drag || this.drag.id !== p.id) return;
      const it = this.drag.it;
      it.x = p.x + this.drag.ox;
      it.y = p.y + this.drag.oy;
    }
    pointerup(p) {
      if (!this.drag || this.drag.id !== p.id) return;
      const it = this.drag.it;
      this.drag = null;
      if (it.state !== 'drag') return;
      const bi = this.binAt(it.x, it.y + this.itemS * 0.3);
      if (bi >= 0) this.send(it, bi);
      else it.state = 'fall';
    }
    onPause() {
      if (this.drag) {
        this.drag.it.state = 'fall';
        this.drag = null;
      }
    }
    update(dt) {
      super.update(dt);
      for (const a of this.binAnim) {
        a.lid = Math.max(0, a.lid - dt * 2.2);
        a.bounce = Math.max(0, a.bounce - dt * 3);
        a.shake = Math.max(0, a.shake - dt * 2.5);
      }
      for (const h of this.helpers) h.cheer = Math.max(0, h.cheer - dt);
      if (this.season !== 'summer' && Math.random() < dt * 1.2) {
        const winter = this.season === 'winter';
        this.particles.emit({
          x: Math.random() * this.W, y: -10, vx: U.rand(10, 30), vy: U.rand(30, 50), life: 18, size: winter ? 3 : U.rand(5, 8),
          color: U.pick(Art.leafColors(this.season)), shape: winter ? 'circle' : 'leaf', fade: false, shrink: false, drag: 0, vr: U.rand(-2, 2),
        });
      }
      if (this.state !== 'play') return;
      this.playT += dt;
      this.spawnT -= dt;
      const interval = Math.max(0.78, 1.9 - this.playT * 0.014);
      const falling = this.items.filter((i) => i.state === 'fall' || i.state === 'drag').length;
      if (this.spawnT <= 0 && falling < 5) {
        this.spawn();
        this.spawnT = interval;
      }
      const speed = (this.floorY - 60) / this.fallTime;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.t += dt;
        if (it.state === 'fall') {
          it.y += speed * dt;
          it.rot += it.vr * dt;
          if (it.y >= this.floorY - this.itemS * 0.3) {
            it.state = 'gone';
            this.particles.burst(it.x, it.y, 10, { colors: ['#9C9588', '#fff'], speedMin: 50, speedMax: 150, gravity: 400 });
            this.mistake(it, 'Упустил!', it.x, it.y);
          }
        } else if (it.state === 'fly') {
          it.flyT += dt / 0.28;
          const k = U.ease.inOutQuad(Math.min(1, it.flyT));
          it.x = U.lerp(it.fx, it.tx, k);
          it.y = U.lerp(it.fy, it.ty, k) - Math.sin(k * Math.PI) * 60;
          it.sx = 1 - k * 0.5;
          it.rot += dt * 8;
          if (it.flyT >= 1) {
            it.state = 'gone';
            this.resolve(it);
          }
        }
        if (it.state === 'gone') this.items.splice(i, 1);
      }
    }
    render(ctx) {
      const W = this.W, H = this.H, t = this.t;
      // небо
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#7EC3EC');
      g.addColorStop(0.7, '#D7EEF8');
      g.addColorStop(1, '#E8F4E0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(this.shake.x, this.shake.y);
      for (let i = 0; i < 3; i++) Art.cloud(ctx, ((i * 400 + t * 8) % (W + 300)) - 150, 70 + i * 40, 0.9, 'rgba(255,255,255,.8)');
      // школа на заднем плане
      const horizon = Math.min(this.bins[0].y - this.bins[0].h * 0.6, H > W ? H * 0.6 : H);
      const k = Math.min(W, H) / 700;
      Art.school(ctx, W * 0.5, horizon, k * 0.95, t, { flags: true });
      // газон и деревья
      ctx.fillStyle = this.season === 'winter' ? '#E9F0F4' : '#86C267';
      ctx.fillRect(0, horizon, W, H - horizon);
      const tr = Math.ceil(W / 170);
      for (let i = 0; i < tr; i++) {
        const x = i * 170 + 40;
        if (Math.abs(x - W * 0.5) < 190 * k) continue;
        Art.drawSprite(ctx, Art.treeSprite(i % 2 ? 'maple' : 'birch', this.season, i + 11, 90), x, horizon + 6, k * 1.2);
      }
      // забор
      ctx.fillStyle = '#5E7F55';
      for (let x = 0; x < W; x += 16) ctx.fillRect(x, horizon - 18, 4, 22);
      ctx.fillRect(0, horizon - 14, W, 3);
      // помощники
      this.helpers.forEach((h, i) => {
        const x = i ? W - Math.max(40, W * 0.06) : Math.max(40, W * 0.06);
        Art.avatar(ctx, x, horizon + 30 * k + 20, k * 0.9, h.av, { kind: h.cheer > 0 ? 'cheer' : 'idle', t: t + i, flip: i === 1 });
      });
      // подсказка у активного предмета
      const act = this.state === 'play' ? this.activeItem() : null;
      // предметы
      for (const it of this.items) this.drawItem(ctx, it, it === act || it.state === 'drag');
      // контейнеры
      this.bins.forEach((b, i) => this.drawBin(ctx, b, this.binAnim[i], i));
      this.particles.render(ctx);
      this.floaters.render(ctx);
      ctx.restore();
      if (this.flash > 0) {
        this.flash -= 1 / 60;
        ctx.fillStyle = `rgba(255,60,60,${Math.max(0, this.flash)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    drawItem(ctx, it, active) {
      const s = this.itemS;
      ctx.save();
      ctx.translate(it.x, it.y);
      if (active) {
        const pulse = 1 + Math.sin(this.t * 8) * 0.06;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.68 * pulse, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = '#1E1A1D';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -this.t * 20;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (it.golden) {
        ctx.fillStyle = `rgba(255,224,138,${0.5 + Math.sin(this.t * 10) * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.62, 0, U.TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.rotate(it.state === 'drag' ? 0 : it.rot);
      ctx.scale(it.sx, it.sx);
      DRAW[it.def.kind](ctx, s);
      ctx.restore();
      if ((active || it.t < 1.2) && it.state !== 'fly') {
        ctx.font = `700 ${Math.max(12, s * 0.24)}px ${B.FONT_BODY}`;
        const tw = ctx.measureText(it.def.name).width + 14;
        // подпись не должна вылезать за край экрана
        const lx = U.clamp(it.x - tw / 2, 4, this.W - tw - 4) - it.x;
        ctx.fillStyle = active ? '#1E1A1D' : 'rgba(30,26,29,.7)';
        U.rr(ctx, lx, s * 0.58, tw, s * 0.36, s * 0.18);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.def.name, lx + tw / 2, s * 0.76);
      }
      ctx.restore();
    }
    drawBin(ctx, b, a, i) {
      const sh = Math.sin(this.t * 50) * a.shake * 6;
      const bo = Math.sin(a.bounce * Math.PI) * 10;
      ctx.save();
      ctx.translate(b.x + sh, b.y - bo);
      const w = b.w, h = b.h;
      // тень
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h + 2, w * 0.48, 7, 0, 0, U.TAU);
      ctx.fill();
      // корпус
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(w * 0.04, h * 0.12);
      ctx.lineTo(w * 0.96, h * 0.12);
      ctx.lineTo(w * 0.88, h);
      ctx.lineTo(w * 0.12, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1E1A1D';
      ctx.lineWidth = 3;
      ctx.stroke();
      // рёбра
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.lineWidth = 3;
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(w * (0.08 + k * 0.21), h * 0.2);
        ctx.lineTo(w * (0.12 + k * 0.19), h * 0.92);
        ctx.stroke();
      }
      // крышка
      ctx.save();
      ctx.translate(w * 0.02, h * 0.12);
      ctx.rotate(-a.lid * 0.7);
      ctx.fillStyle = b.dark;
      U.rr(ctx, -2, -h * 0.1, w * 0.98, h * 0.12, 5);
      ctx.fill();
      ctx.strokeStyle = '#1E1A1D';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // иконка и подпись
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.42, w * 0.18, 0, U.TAU);
      ctx.fill();
      binIcon(ctx, b.icon, w / 2, h * 0.42, w * 0.26);
      const fs = U.clamp(w * 0.13, 11, 17);
      ctx.font = `800 ${fs}px ${B.FONT_BODY}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.name, w / 2, h * 0.72);
      if (!U.isTouch()) {
        ctx.fillStyle = 'rgba(30,26,29,.85)';
        U.rr(ctx, w / 2 - 12, h * 0.82, 24, 20, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `900 12px ${B.FONT_DISPLAY}`;
        ctx.fillText(String(i + 1), w / 2, h * 0.82 + 10.5);
      }
      ctx.restore();
    }
  }

  B.Scenes.sort = SortScene;
})(window.B);
