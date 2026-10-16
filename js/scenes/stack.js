/* БРСМ: Команда 212 — «Студотряд»: строим дом этаж за этажом (изометрия) */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save;

  const BASE = 100, LH = 24, PERFECT = 4.5, RANGE = 135;
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  const PALETTE = ['#D21F2B', '#E8552C', '#F2913A', '#F6B92B', '#B9C53A', '#5DAE4B', '#0E8A4E', '#1F8A7A', '#2E6FA8', '#5B4FA8', '#9C3F8E', '#D21F2B'];
  const SKY = [
    [0, '#5FB4EA', '#D6F0FB'],
    [14, '#4F8FD8', '#BFE3F7'],
    [26, '#5C6FB8', '#FFB677'],
    [36, '#2B2F6B', '#B0607A'],
    [48, '#0E1435', '#2A3168'],
    [70, '#05061A', '#141A3E'],
  ];

  class StackScene extends B.GameScene {
    get missionId() {
      return 'stack';
    }
    constructor(p) {
      super(p);
      this.music = 'stack';
      this.season = Art.season();
      this.blocks = [];
      this.debris = [];
      this.combo = 0;
      this.bestCombo = 0;
      this.perfects = 0;
      this.camY = 0;
      this.zoom = 1;
      this.moving = null;
      this.floors = 0;
      this.ringT = 0;
      this.best = Save.game('stack').best;
      this.passedBest = false;
      this.workers = [
        { av: { skin: 1, hair: 0, hairColor: 1, jacketHex: '#0E8A4E', cap: '#F6B92B' }, cheer: 0 },
        { av: { skin: 0, hair: 3, hairColor: 3, jacketHex: '#0E8A4E', cap: '#F6B92B' }, cheer: 0 },
      ];
      this.far = Art.skylinePath(1400, 41, { landmarks: ['library', 'stele'] });
      // фундамент
      this.blocks.push({ cx: 0, cz: 0, w: BASE, d: BASE, y: -LH * 3, h: LH * 3, color: '#B9B2A6', base: true });
      this.windowsSeed = Math.random() * 1000;
    }
    buildHud() {
      const root = UI.setHud(`
        <div class="hud-top">
          <div class="hud-row"><span class="hud-pill"><small>рекорд</small><span data-h="best">${this.best}</span></span></div>
          <div class="hud-row">${this.hudPauseButton()}</div>
        </div>
        <div class="hint" data-h="hint">${U.isTouch() ? 'Тапни, чтобы опустить блок' : 'Пробел или клик — опустить блок'}</div>`);
      this.bindPause(root);
      this.hint = root.querySelector('[data-h=hint]');
    }
    resize(W, H) {
      this.W = W;
      this.H = H;
      this.sc = Math.min(W * 0.44, H * 0.36, 300) / ((BASE + BASE) * C30);
    }
    get top() {
      return this.blocks[this.blocks.length - 1];
    }
    start() {
      this.state = 'play';
      this.spawn();
    }
    spawn() {
      const top = this.top;
      const n = this.blocks.length;
      const axis = n % 2 ? 'x' : 'z';
      const color = U.gradientAt(PALETTE, ((n - 1) * 0.045) % 1);
      const speed = Math.min(420, 150 + (n - 1) * 4.2);
      this.moving = {
        cx: axis === 'x' ? top.cx - RANGE : top.cx, cz: axis === 'z' ? top.cz - RANGE : top.cz,
        w: top.w, d: top.d, y: top.y + top.h, h: LH, color, axis, dir: 1, speed, t: 0,
      };
    }
    drop() {
      if (this.state !== 'play' || !this.moving) return;
      if (this.hint) {
        this.hint.classList.add('is-gone');
        this.hint = null;
      }
      const m = this.moving, top = this.top;
      const ax = m.axis, size = ax === 'x' ? 'w' : 'd', c = ax === 'x' ? 'cx' : 'cz';
      const delta = m[c] - top[c];
      const ad = Math.abs(delta);
      this.moving = null;
      if (ad <= PERFECT) {
        m[c] = top[c];
        this.combo++;
        this.perfects++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        if (this.combo >= 4) m[size] = Math.min(BASE, m[size] + 6);
        B.Audio.sfx('perfect', this.combo - 1);
        this.ringT = 0.6;
        this.ringBlock = m;
        this.workers.forEach((w) => (w.cheer = 1.5));
        const [sx, sy] = this.proj(m.cx, m.y + m.h, m.cz);
        this.floaters.add(sx, sy - 40, this.combo > 1 ? `Идеально ×${this.combo}` : 'Идеально!', { color: '#FFE08A', size: 24, life: 1 });
        if (this.combo >= 8) Save.awardBadge('precise');
      } else {
        const overlap = top[size] - ad;
        if (overlap <= 0) {
          // промах — блок падает целиком
          this.debris.push({ b: m, vy: 0, a: 1 });
          B.Audio.sfx('fall');
          this.gameOver();
          return;
        }
        this.combo = 0;
        const cut = Object.assign({}, m);
        m[size] = overlap;
        m[c] = top[c] + delta / 2;
        cut[size] = ad;
        cut[c] = m[c] + U.sign(delta) * (overlap / 2 + ad / 2);
        this.debris.push({ b: cut, vy: 0, a: 1 });
        B.Audio.sfx('place', this.blocks.length);
        B.Audio.sfx('cut');
        this.shake.add(0.12);
      }
      this.blocks.push(m);
      this.floors = this.blocks.length - 1;
      const [sx, sy] = this.proj(m.cx, m.y + m.h, m.cz);
      this.particles.burst(sx, sy, 10, { colors: ['#fff', U.shade(m.color, 0.4)], speedMin: 60, speedMax: 180, sizeMin: 2, sizeMax: 4, gravity: 300 });
      if (!this.passedBest && this.best > 0 && this.floors > this.best) {
        this.passedBest = true;
        this.floaters.add(this.W / 2, this.H * 0.3, 'Новый рекорд!', { color: '#FFE08A', size: 30, life: 1.5 });
        B.Audio.sfx('badge');
      }
      if (this.floors >= 30) Save.awardBadge('builder');
      this.spawn();
    }
    gameOver() {
      this.over = true;
      this.zoomTarget = true;
      B.Audio.sfx('fail');
      const floors = this.floors;
      this.finish({
        score: floors,
        stars: this.starsFor(floors),
        delay: 2400,
        lines: [
          ['Этажей', String(floors)],
          ['Идеальных', String(this.perfects)],
          ['Лучшая серия', String(this.bestCombo)],
        ],
      });
    }
    keydown(e) {
      if (super.keydown(e)) return;
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') this.drop();
    }
    pointerdown() {
      this.drop();
    }
    update(dt) {
      super.update(dt);
      const m = this.moving;
      if (m && this.state === 'play') {
        const c = m.axis === 'x' ? 'cx' : 'cz';
        const center = m.axis === 'x' ? this.top.cx : this.top.cz;
        m[c] += m.dir * m.speed * dt;
        if (m[c] > center + RANGE) {
          m[c] = center + RANGE;
          m.dir = -1;
        } else if (m[c] < center - RANGE) {
          m[c] = center - RANGE;
          m.dir = 1;
        }
      }
      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        d.vy += 900 * dt;
        d.b.y -= d.vy * dt;
        d.a -= dt * 0.6;
        if (d.a <= 0) this.debris.splice(i, 1);
      }
      this.ringT = Math.max(0, this.ringT - dt);
      for (const w of this.workers) w.cheer = Math.max(0, w.cheer - dt);
      // камера
      const topY = this.top.y + this.top.h;
      if (this.zoomTarget) {
        const towerH = topY + LH * 3 + 40;
        const fit = Math.min(1, (this.H * 0.62) / (towerH * this.sc + 200));
        this.zoom = U.damp(this.zoom, fit, 2.2, dt);
        this.camY = U.damp(this.camY, (topY * 0.5) * this.sc, 2.2, dt);
      } else {
        this.camY = U.damp(this.camY, Math.max(0, topY * this.sc - this.H * 0.06), 4, dt);
      }
    }
    // Проекция: мир → экран
    proj(x, y, z) {
      const s = this.sc * this.zoom;
      const ox = this.W / 2, oy = this.H * 0.52 + this.camY * this.zoom;
      return [ox + (x - z) * C30 * s, oy + (x + z) * S30 * s - y * s];
    }
    drawBox(ctx, b, alpha = 1, glow = 0) {
      const x0 = b.cx - b.w / 2, x1 = b.cx + b.w / 2, z0 = b.cz - b.d / 2, z1 = b.cz + b.d / 2;
      const yb = b.y, yt = b.y + b.h;
      const P = (x, y, z) => this.proj(x, y, z);
      const poly = (pts, fill) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fill();
      };
      ctx.globalAlpha = alpha;
      const col = b.color;
      // правая грань (x1)
      poly([P(x1, yt, z0), P(x1, yt, z1), P(x1, yb, z1), P(x1, yb, z0)], U.shade(col, -0.12));
      // левая грань (z1)
      poly([P(x0, yt, z1), P(x1, yt, z1), P(x1, yb, z1), P(x0, yb, z1)], U.shade(col, -0.3));
      // верх
      poly([P(x0, yt, z0), P(x1, yt, z0), P(x1, yt, z1), P(x0, yt, z1)], glow ? U.shade(col, 0.35 + glow * 0.4) : U.shade(col, 0.18));
      if (!b.base) {
        // окна
        const night = U.clamp((this.blocks.length - 30) / 15, 0, 1);
        const lvl = Math.round(b.y / LH);
        const win = (fx, fz, along, len, faceX) => {
          const n = Math.max(1, Math.floor(len / 17));
          const step = len / n;
          for (let i = 0; i < n; i++) {
            const a0 = along + step * (i + 0.28), a1 = along + step * (i + 0.72);
            const lit = Math.sin(lvl * 12.9898 + i * 78.233 + this.windowsSeed) * 43758.5453 % 1;
            const on = Math.abs(lit) > 0.45;
            const c = night > 0.3 && on ? `rgba(255,214,120,${0.6 + night * 0.4})` : `rgba(255,255,255,${0.45 - night * 0.2})`;
            const ya = yb + b.h * 0.28, yb2 = yb + b.h * 0.74;
            const pts = faceX ? [P(fx, yb2, a0), P(fx, yb2, a1), P(fx, ya, a1), P(fx, ya, a0)] : [P(a0, yb2, fz), P(a1, yb2, fz), P(a1, ya, fz), P(a0, ya, fz)];
            poly(pts, c);
          }
        };
        win(x1, 0, z0, b.d, true);
        win(0, z1, x0, b.w, false);
      } else {
        // фундамент: надпись
        ctx.fillStyle = 'rgba(30,26,29,.6)';
      }
      // светлые рёбра
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const a = P(x0, yt, z1), bb = P(x1, yt, z1), c2 = P(x1, yt, z0);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(bb[0], bb[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    skyColors() {
      const lvl = this.blocks.length - 1;
      for (let i = 0; i < SKY.length - 1; i++) {
        const a = SKY[i], b = SKY[i + 1];
        if (lvl >= a[0] && lvl <= b[0]) {
          const t = (lvl - a[0]) / (b[0] - a[0]);
          return [U.mixHex(a[1], b[1], t), U.mixHex(a[2], b[2], t), U.clamp((lvl - 34) / 16, 0, 1)];
        }
      }
      const l = SKY[SKY.length - 1];
      return [l[1], l[2], 1];
    }
    render(ctx) {
      const W = this.W, H = this.H, t = this.t;
      // плавное небо
      const target = this.skyColors();
      this.skyA = this.skyA || target.slice();
      this.skyA[0] = U.mixHex(this.skyA[0], target[0], 0.03);
      this.skyA[1] = U.mixHex(this.skyA[1], target[1], 0.03);
      this.skyA[2] = U.lerp(this.skyA[2], target[2], 0.03);
      const [top, bot, night] = this.skyA;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, top);
      g.addColorStop(1, bot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (night > 0.02) {
        const rnd = U.rng(9);
        for (let i = 0; i < 90; i++) {
          const x = rnd() * W, y = ((rnd() * H * 1.4 + this.camY * 0.05) % (H * 1.1)), tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 3);
          ctx.fillStyle = `rgba(255,255,255,${night * tw})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
      ctx.save();
      ctx.translate(this.shake.x, this.shake.y);
      // облака проплывают по высоте
      for (let i = 0; i < 7; i++) {
        const cy = H * 0.5 - i * 420 + this.camY * 0.55;
        if (cy < -100 || cy > H + 100) continue;
        const cx = ((i * 337 + t * (10 + i * 3)) % (W + 300)) - 150;
        Art.cloud(ctx, cx, cy, 1 + (i % 3) * 0.4, `rgba(255,255,255,${0.7 - night * 0.5})`);
      }
      // город внизу
      const baseY = this.proj(0, -LH * 3, 0)[1];
      const cityY = H * 0.52 + 110 + this.camY * 0.35 * this.zoom;
      if (cityY < H + 260) {
        ctx.save();
        ctx.translate(-((t * 4) % this.far.width), cityY);
        ctx.fillStyle = U.mix('#9DB4CF', '#1C2148', night);
        for (let r = 0; r < Math.ceil(W / this.far.width) + 2; r++) {
          ctx.save();
          ctx.translate(r * this.far.width, 0);
          ctx.fill(this.far.path);
          ctx.restore();
        }
        ctx.restore();
        ctx.fillStyle = U.mix('#7DB860', '#1E3A2C', night);
        ctx.fillRect(0, cityY - 2, W, H);
      }
      // площадка
      const pz = 125;
      const P = (x, y, z) => this.proj(x, y, z);
      const ground = [P(-pz, -LH * 3, -pz), P(pz, -LH * 3, -pz), P(pz, -LH * 3, pz), P(-pz, -LH * 3, pz)];
      ctx.fillStyle = U.mix('#8DBB6A', '#2A4535', night * 0.8);
      ctx.beginPath();
      ground.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
      // забор стройки
      for (let i = -6; i < 5; i++) {
        const p0 = P(pz, -LH * 3, i * 22), p1 = P(pz, -LH * 3, i * 22 + 22);
        ctx.fillStyle = i % 2 ? '#F6B92B' : '#fff';
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p1[0], p1[1] - 14 * this.sc * this.zoom);
        ctx.lineTo(p0[0], p0[1] - 14 * this.sc * this.zoom);
        ctx.closePath();
        ctx.fill();
      }
      // кольцо рекорда
      if (this.best > 0) {
        const ry = -LH * 3 + LH * 3 + this.best * LH;
        const pts = [P(-70, ry, -70), P(70, ry, -70), P(70, ry, 70), P(-70, ry, 70)];
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255,224,138,.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,224,138,.95)';
        ctx.font = `700 12px ${B.FONT_BODY}`;
        ctx.textAlign = 'left';
        ctx.fillText('рекорд ' + this.best, pts[1][0] + 8, pts[1][1]);
      }
      // башня
      for (const b of this.blocks) this.drawBox(ctx, b, 1, b === this.ringBlock ? this.ringT : 0);
      // рабочие студотряда стоят перед домом
      this.workers.forEach((w, i) => {
        const [wx, wy] = P(i ? 84 : 34, -LH * 3, i ? 34 : 84);
        Art.avatar(ctx, wx, wy, 0.36 * this.sc * this.zoom, w.av, { kind: w.cheer > 0 ? 'cheer' : 'idle', t: t + i, flip: i === 0 });
      });
      for (const d of this.debris) this.drawBox(ctx, d.b, Math.max(0, d.a));
      if (this.moving) this.drawBox(ctx, this.moving);
      // кольцо «идеально»
      if (this.ringT > 0 && this.ringBlock) {
        const b = this.ringBlock, k = 1 + (0.6 - this.ringT) * 0.8;
        const yt = b.y + b.h;
        const pts = [P(b.cx - (b.w / 2) * k, yt, b.cz - (b.d / 2) * k), P(b.cx + (b.w / 2) * k, yt, b.cz - (b.d / 2) * k), P(b.cx + (b.w / 2) * k, yt, b.cz + (b.d / 2) * k), P(b.cx - (b.w / 2) * k, yt, b.cz + (b.d / 2) * k)];
        ctx.strokeStyle = `rgba(255,255,255,${this.ringT / 0.6})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.stroke();
      }
      this.particles.render(ctx);
      this.floaters.render(ctx);
      ctx.restore();
      // счётчик этажей
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fs = Math.min(96, Math.max(56, W * 0.09));
      ctx.font = `900 ${fs}px ${B.FONT_DISPLAY}`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(30,26,29,.85)';
      const ty = 70 + fs * 0.55;
      ctx.strokeText(String(this.floors), W / 2, ty);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(this.floors), W / 2, ty);
      ctx.font = `700 14px ${B.FONT_BODY}`;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText(U.plural(this.floors, 'этаж', 'этажа', 'этажей').toUpperCase(), W / 2, ty + fs * 0.6);
      void baseY;
    }
  }

  B.Scenes.stack = StackScene;
})(window.B);
