/* БРСМ: Команда 212 — «Доброе Сердце»: волонтёрский забег по Минску */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save;

  const GRAV = 2600, JUMP_V = -930, DJUMP_V = -820, CUT_V = -460;
  const PLAYER_W = 30, PLAYER_H = 90, SLIDE_H = 42;
  const M = 40; // единиц в метре

  // Ключевые цвета неба: [доля цикла, верх, низ, силуэт города, ночь 0..1]
  const SKY = [
    [0.0, '#4FA3E0', '#BFE6F7', '#9DB4CF', 0],
    [0.4, '#4FA3E0', '#C9EAF8', '#9DB4CF', 0],
    [0.5, '#5C6FB8', '#FFB677', '#7C6A92', 0.25],
    [0.58, '#283066', '#C9707A', '#3D3A64', 0.7],
    [0.66, '#0E1435', '#2A3168', '#1C2148', 1],
    [0.88, '#0E1435', '#2A3168', '#1C2148', 1],
    [0.95, '#6C7FC4', '#FFC9A0', '#7F86AE', 0.3],
    [1.0, '#4FA3E0', '#BFE6F7', '#9DB4CF', 0],
  ];
  function skyAt(p) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (p >= a[0] && p <= b[0]) {
        const t = (p - a[0]) / (b[0] - a[0]);
        return { top: U.mixHex(a[1], b[1], t), bot: U.mixHex(a[2], b[2], t), city: U.mixHex(a[3], b[3], t), night: U.lerp(a[4], b[4], t) };
      }
    }
    return { top: SKY[0][1], bot: SKY[0][2], city: SKY[0][3], night: 0 };
  }

  const BUILD_COLS = ['#E9E2D3', '#D9CFC0', '#F2E7D5', '#C9D6DF', '#E4D3C4', '#DCE4D2', '#F0DDC8'];

  class RunnerScene extends B.GameScene {
    get missionId() {
      return 'runner';
    }
    constructor(p) {
      super(p);
      this.music = 'runner';
      this.season = Art.season();
      this.av = (Save.profile() || {}).av || Art.randomAvatar();
      this.far = Art.skylinePath(2200, 77, { landmarks: ['gates', 'library', 'stele', 'tv'] });
      this.reset();
    }
    reset() {
      this.cam = 0;
      this.speed = 340;
      this.playT = 0;
      this.hearts = 0;
      this.heartPts = 0;
      this.deeds = 0;
      this.lives = 3;
      this.streak = 0;
      this.bestStreak = 0;
      this.objs = [];
      this.nextSpawn = 900;
      this.pw = { shield: 0, team: 0, x2: 0 };
      this.pl = { y: 0, vy: 0, ground: true, jumps: 0, slide: 0, inv: 0, phase: 0, coyote: 0, buffer: 0, holdDown: false, dead: false, land: 0 };
      this.mids = [];
      this.midNext = -200;
      this.nears = [];
      this.nearNext = -100;
      this.awarded = {};
      this.dayOffset = 0.05;
    }
    buildHud() {
      const touch = U.isTouch();
      const root = UI.setHud(`
        <div class="hud-top">
          <div class="hud-row">
            <span class="hud-pill" data-h="dist">0<small>м</small></span>
            <span class="hud-pill" data-h="hearts">${UI.icon('heart')}<span>0</span></span>
            <span class="hud-pill" data-h="score">0</span>
          </div>
          <div class="hud-row">
            <span class="hud-pill"><small>силы</small><span class="hud-lives" data-h="lives"><i></i><i></i><i></i></span></span>
            ${this.hudPauseButton()}
          </div>
        </div>
        <div class="hint" data-h="hint">${touch ? 'Тап — прыжок, ещё тап — двойной. Кнопка ▼ — пригнуться' : 'Пробел или ↑ — прыжок (дважды — двойной). ↓ — пригнуться'}</div>
        ${touch ? `<div class="hud-bottom"><button type="button" class="touch-btn" data-h="down" aria-label="Пригнуться"><svg class="ico" viewBox="0 0 24 24"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="touch-btn" data-h="jump" aria-label="Прыжок"><svg class="ico" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>` : ''}`);
      this.bindPause(root);
      this.h = {};
      root.querySelectorAll('[data-h]').forEach((el) => (this.h[el.dataset.h] = el));
      const bindHold = (el, down, up) => {
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          B.Audio.unlock();
          el.classList.add('is-down');
          down();
        });
        const rel = () => {
          el.classList.remove('is-down');
          up();
        };
        el.addEventListener('pointerup', rel);
        el.addEventListener('pointercancel', rel);
        el.addEventListener('pointerleave', rel);
      };
      bindHold(this.h.down, () => this.downPress(), () => this.downRelease());
      bindHold(this.h.jump, () => this.jumpPress(), () => this.jumpRelease());
      this.hudCache = {};
    }
    setHud(key, val, bump) {
      if (this.hudCache[key] === val) return;
      this.hudCache[key] = val;
      const el = this.h[key];
      if (!el) return;
      if (key === 'dist') el.innerHTML = `${val}<small>м</small>`;
      else if (key === 'hearts') el.querySelector('span').textContent = val;
      else if (key === 'lives') el.innerHTML = [0, 1, 2].map((i) => `<i class="${i < val ? '' : 'is-off'}"></i>`).join('');
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
      this.port = H > W;
      this.k = Math.min(H / 560, W / 520);
      this.vw = W / this.k;
      this.vh = H / this.k;
      this.gy = this.vh * (this.port ? 0.66 : 0.79);
      this.px = this.vw * (this.port ? 0.2 : 0.24);
    }
    start() {
      this.state = 'play';
      setTimeout(() => this.h && this.h.hint && this.h.hint.classList.add('is-gone'), 5200);
    }
    // ---------- Управление ----------
    jumpPress() {
      if (this.state !== 'play' || this.pl.dead) return;
      this.pl.buffer = 0.13;
      this.jumpHeld = true;
    }
    jumpRelease() {
      this.jumpHeld = false;
      if (this.pl.vy < CUT_V) this.pl.vy = CUT_V;
    }
    downPress() {
      if (this.state !== 'play' || this.pl.dead) return;
      this.pl.holdDown = true;
      if (this.pl.ground) this.startSlide();
      else this.pl.vy = Math.max(this.pl.vy, 1500);
    }
    downRelease() {
      this.pl.holdDown = false;
    }
    startSlide() {
      if (this.pl.slide <= 0) B.Audio.sfx('slide');
      this.pl.slide = 0.7;
    }
    keydown(e) {
      if (super.keydown(e)) return;
      const k = e.key;
      if (e.repeat) return;
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'ц' || k === 'Ц') this.jumpPress();
      else if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'ы' || k === 'Ы') this.downPress();
    }
    keyup(e) {
      const k = e.key;
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'ц' || k === 'Ц') this.jumpRelease();
      else if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'ы' || k === 'Ы') this.downRelease();
    }
    pointerdown(p) {
      if (this.state !== 'play') return;
      this.touch = { x: p.x, y: p.y, id: p.id, swiped: false };
      this.jumpPress();
    }
    pointermove(p) {
      const t = this.touch;
      if (!t || t.id !== p.id || t.swiped) return;
      if (p.y - t.y > 34 && Math.abs(p.y - t.y) > Math.abs(p.x - t.x)) {
        t.swiped = true;
        this.pl.buffer = 0;
        this.jumpHeld = false;
        this.pl.holdDown = true;
        if (this.pl.ground) this.startSlide();
        else this.pl.vy = Math.max(this.pl.vy, 1700);
        setTimeout(() => (this.pl.holdDown = false), 250);
      }
    }
    pointerup(p) {
      if (this.touch && this.touch.id === p.id) {
        this.touch = null;
        this.jumpRelease();
      }
    }
    onPause() {
      this.jumpHeld = false;
      this.pl.holdDown = false;
    }

    // ---------- Генерация ----------
    spawnPattern(x0) {
      const d = U.clamp((this.speed - 340) / 380, 0, 1);
      const sp = this.speed;
      const add = (o) => {
        this.objs.push(o);
        return o;
      };
      const heart = (x, y) => add({ type: 'heart', x, y, r: 13, ph: Math.random() * 6 });
      const arc = (cx, n, peak) => {
        for (let i = 0; i < n; i++) {
          const u = n === 1 ? 0.5 : i / (n - 1);
          heart(cx + (u - 0.5) * 190, -30 - peak * (1 - Math.pow(2 * u - 1, 2)));
        }
      };
      const obstacle = (x, kind) => {
        const defs = { cones: [46, 48], barrier: [74, 62], puddle: [86, 10], boxes: [52, 58] };
        const [w, h] = defs[kind];
        return add({ type: 'obst', kind, x, y: -h, w, h });
      };
      const weights = [
        ['single', 3],
        ['line', 1.6],
        ['high', 1 + d],
        ['double', d > 0.15 ? 1.2 + d : 0],
        ['scaffold', 1.3 + d * 0.5],
        ['granny', 1.1],
        ['balloon', 0.9],
        ['trash', 1],
        ['scooter', d > 0.1 ? 0.8 + d : 0],
        ['power', 0.55],
        ['combo', d > 0.45 ? 1.2 : 0],
      ];
      let tot = 0;
      weights.forEach((w) => (tot += w[1]));
      let r = Math.random() * tot, kind = 'single';
      for (const w of weights) {
        r -= w[1];
        if (r <= 0) {
          kind = w[0];
          break;
        }
      }
      if (kind === this.lastPattern && kind !== 'single') kind = 'single';
      this.lastPattern = kind;
      const obstKinds = ['cones', 'barrier', 'puddle', 'boxes'];
      let len = 200;
      switch (kind) {
        case 'single': {
          const o = obstacle(x0, U.pick(obstKinds));
          arc(x0 + o.w / 2, 5, 150);
          len = 240;
          break;
        }
        case 'line':
          for (let i = 0; i < 8; i++) heart(x0 + i * 46, -30);
          len = 8 * 46;
          break;
        case 'high':
          obstacle(x0 + 60, 'puddle');
          for (let i = 0; i < 6; i++) heart(x0 + i * 44, -150);
          len = 6 * 44 + 40;
          break;
        case 'double': {
          const gap = sp * 0.8 + 60;
          obstacle(x0, U.pick(['cones', 'boxes']));
          obstacle(x0 + gap, U.pick(['cones', 'barrier']));
          heart(x0 + gap / 2 + 20, -60);
          len = gap + 120;
          break;
        }
        case 'scaffold': {
          const w = 150 + d * 60;
          add({ type: 'obst', kind: 'scaffold', x: x0, y: -900, w, h: 900 - 60 });
          for (let i = 0; i < 4; i++) heart(x0 + 10 + i * (w / 4), -20);
          len = w + 80;
          break;
        }
        case 'granny':
          add({ type: 'npc', kind: 'granny', x: x0 + 40, y: -80, w: 40, h: 80, helped: false, t: 0 });
          for (let i = 0; i < 3; i++) heart(x0 + 120 + i * 40, -30);
          len = 260;
          break;
        case 'balloon':
          {
            const kid = add({ type: 'npc', kind: 'kid', x: x0 + 300, y: -62, w: 30, h: 62, helped: false, t: 0, decor: true });
            add({ type: 'npc', kind: 'balloon', x: x0, y: -175, w: 34, h: 44, helped: false, ph: 0, t: 0, kid });
          }
          len = 380;
          break;
        case 'trash':
          add({ type: 'npc', kind: 'trash', x: x0 + 20, y: -34, w: 34, h: 34, helped: false, t: 0 });
          arc(x0 + 160, 3, 60);
          len = 260;
          break;
        case 'scooter':
          add({ type: 'obst', kind: 'scooter', x: x0 + 300, y: -70, w: 52, h: 70, vx: -170 - d * 120, warn: true });
          len = 160;
          break;
        case 'power': {
          const kinds = ['shield', 'team', 'x2'];
          add({ type: 'power', kind: U.pick(kinds), x: x0 + 60, y: -125, r: 22, ph: 0 });
          for (let i = 0; i < 4; i++) heart(x0 + 150 + i * 44, -30);
          len = 340;
          break;
        }
        case 'combo': {
          obstacle(x0, 'cones');
          const gap = sp * 1.05 + 80;
          add({ type: 'obst', kind: 'scaffold', x: x0 + gap, y: -900, w: 150, h: 840 });
          arc(x0 + 23, 3, 140);
          len = gap + 220;
          break;
        }
      }
      return len;
    }
    spawnMid(x) {
      const rnd = Math.random;
      const w = 110 + rnd() * 110;
      const h = 110 + rnd() * 130;
      const cols = Math.max(3, Math.floor(w / 26)), rows = Math.max(4, Math.floor(h / 32));
      const lit = [];
      for (let i = 0; i < cols * rows; i++) lit.push(rnd() < 0.45);
      this.mids.push({ x, w, h, col: U.pick(BUILD_COLS), cols, rows, lit, stripe: rnd() < 0.4 ? U.pick(['#C8313E', '#4AA657', '#3A6EA5', '#E07A1F']) : null, roof: rnd() < 0.3 });
      return w + (rnd() < 0.45 ? 160 + rnd() * 260 : 14 + rnd() * 30);
    }
    spawnNear(x) {
      const r = Math.random();
      let kind;
      if (r < 0.45) kind = 'tree';
      else if (r < 0.68) kind = 'lamp';
      else if (r < 0.8) kind = 'bench';
      else if (r < 0.9) kind = 'stop';
      else kind = 'bush';
      this.nears.push({ x, kind, tree: U.pick(['birch', 'maple', 'birch', 'pine']), seed: (Math.random() * 30) | 0, s: 0.9 + Math.random() * 0.5 });
      return kind === 'stop' ? 260 : 130 + Math.random() * 160;
    }

    // ---------- Обновление ----------
    update(dt) {
      super.update(dt);
      const pl = this.pl;
      const playing = this.state === 'play';
      if (playing && !pl.dead) {
        this.playT += dt;
        this.speed = Math.min(740, 340 + this.playT * 5.4);
      }
      if (pl.dead) this.speed = U.damp(this.speed, 0, 2.5, dt);
      const moving = this.state === 'play' || pl.dead;
      const sp = moving ? this.speed : 0;
      this.cam += sp * dt;
      this.meters = Math.floor(this.cam / M);

      // фоновые слои
      const midCam = this.cam * 0.35;
      while (this.midNext < midCam + this.vw + 300) this.midNext += this.spawnMid(this.midNext);
      this.mids = this.mids.filter((b) => b.x + b.w > midCam - 50);
      while (this.nearNext < this.cam + this.vw + 300) this.nearNext += this.spawnNear(this.nearNext);
      this.nears = this.nears.filter((n) => n.x > this.cam - 400);

      if (!moving) {
        pl.phase += dt * 2;
        return;
      }

      // спавн
      if (playing && !pl.dead) {
        while (this.nextSpawn < this.cam + this.vw + 260) {
          const len = this.spawnPattern(this.nextSpawn);
          this.nextSpawn += len + this.speed * U.rand(0.62, 1.0);
        }
      }

      // игрок
      if (!pl.dead) {
        pl.coyote = pl.ground ? 0.09 : pl.coyote - dt;
        pl.buffer -= dt;
        if (pl.buffer > 0) {
          if (pl.ground || pl.coyote > 0) {
            pl.vy = JUMP_V;
            pl.ground = false;
            pl.jumps = 1;
            pl.slide = 0;
            pl.buffer = 0;
            pl.coyote = 0;
            B.Audio.sfx('jump');
            this.dust(4);
          } else if (pl.jumps < 2) {
            pl.vy = DJUMP_V;
            pl.jumps = 2;
            pl.buffer = 0;
            B.Audio.sfx('djump');
            this.particles.burst(this.px, pl.y - 10, 10, { colors: ['#fff', '#FFE08A'], speedMin: 60, speedMax: 160, shape: 'ring', sizeMin: 6, sizeMax: 10, lifeMin: 0.3, lifeMax: 0.4 });
          }
        }
      }
      pl.vy += GRAV * dt;
      pl.y += pl.vy * dt;
      if (pl.y >= 0) {
        if (!pl.ground && pl.vy > 300) {
          B.Audio.sfx('land');
          this.dust(5);
          pl.land = 0.12;
        }
        pl.y = 0;
        pl.vy = 0;
        if (!pl.ground && pl.holdDown) this.startSlide();
        pl.ground = true;
        pl.jumps = 0;
      } else pl.ground = false;
      pl.land = Math.max(0, pl.land - dt);
      if (pl.slide > 0) {
        pl.slide -= dt;
        if (pl.slide <= 0 && pl.holdDown && pl.ground) pl.slide = 0.1;
      }
      pl.inv = Math.max(0, pl.inv - dt);
      pl.phase += dt * (8 + this.speed / 55);
      for (const k in this.pw) this.pw[k] = Math.max(0, this.pw[k] - dt);
      if (pl.ground && !pl.dead && Math.random() < dt * 9) this.dust(1);

      // объекты
      const pxW = this.cam + this.px;
      const sliding = pl.slide > 0 && pl.ground;
      const ph = sliding ? SLIDE_H : PLAYER_H;
      const pbox = { x: pxW - (sliding ? 26 : PLAYER_W / 2), y: pl.y - ph, w: sliding ? 52 : PLAYER_W, h: ph };
      for (let i = this.objs.length - 1; i >= 0; i--) {
        const o = this.objs[i];
        if (o.vx) o.x += o.vx * dt;
        if (o.t != null) o.t += dt;
        if (o.ph != null) o.ph += dt;
        if (o.x + (o.w || 40) < this.cam - 200) {
          this.objs.splice(i, 1);
          continue;
        }
        if (pl.dead) continue;
        if (o.type === 'heart') {
          if (this.pw.team > 0) {
            const dx = pxW - o.x, dy = pl.y - 45 - o.y;
            const dd = Math.hypot(dx, dy);
            if (dd < 360) {
              o.x += (dx / dd) * 900 * dt;
              o.y += (dy / dd) * 900 * dt;
            }
          }
          if (Math.abs(o.x - pxW) < o.r + 18 && o.y > pbox.y - o.r && o.y < pbox.y + pbox.h + o.r) {
            this.collectHeart(o);
            this.objs.splice(i, 1);
          }
        } else if (o.type === 'power') {
          if (Math.abs(o.x - pxW) < o.r + 18 && o.y > pbox.y - o.r && o.y < pbox.y + pbox.h + o.r) {
            this.collectPower(o);
            this.objs.splice(i, 1);
          }
        } else if (o.type === 'npc') {
          if (o.helped || o.decor) continue;
          if (U.aabb(pbox, { x: o.x, y: o.y, w: o.w, h: o.h })) this.help(o);
        } else if (o.type === 'obst' && !o.hit) {
          const m = 6;
          const hb = o.kind === 'puddle' ? { x: o.x + 10, y: -8, w: o.w - 20, h: 8 } : { x: o.x + m, y: o.y + m, w: o.w - m * 2, h: o.h - m };
          if (o.kind === 'scaffold') {
            hb.y = -900;
            hb.h = 900 - 62;
          }
          if (U.aabb(pbox, hb)) this.hitObstacle(o);
        }
      }

      // очки
      this.score = this.meters + this.heartPts + this.deeds * 100;
      this.setHud('dist', this.meters);
      this.setHud('hearts', this.hearts);
      this.setHud('score', U.fmt(this.score));
      this.setHud('lives', this.lives);
      if (this.meters >= 1500) this.award('marathon');
    }
    award(id) {
      if (this.awarded[id]) return;
      this.awarded[id] = true;
      Save.awardBadge(id);
    }
    dust(n) {
      for (let i = 0; i < n; i++)
        this.particles.emit({
          x: this.px - 10 + U.rand(-6, 6), y: this.pl.y - 2, vx: -U.rand(60, 140), vy: -U.rand(10, 60), life: U.rand(0.3, 0.5),
          size: U.rand(3, 6), color: 'rgba(220,210,190,.8)', drag: 3, world: true,
        });
    }
    collectHeart(o) {
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const mult = Math.min(4, 1 + Math.floor(this.streak / 15)) * (this.pw.x2 > 0 ? 2 : 1);
      this.hearts++;
      this.heartPts += 10 * mult;
      B.Audio.sfx('heart', this.streak % 8);
      const sx = o.x - this.cam, sy = o.y;
      this.particles.burst(sx, sy, 6, { colors: ['#FF5D73', '#FFD1DA', '#fff'], speedMin: 40, speedMax: 140, sizeMin: 2, sizeMax: 4, lifeMin: 0.25, lifeMax: 0.45 });
      this.floaters.add(sx, sy - 16, '+' + 10 * mult, { color: mult > 1 ? '#FFE08A' : '#fff', size: 16, life: 0.6, vy: -70 });
      if (this.streak % 15 === 0 && this.streak <= 45) {
        this.floaters.add(this.px, this.pl.y - 140, `Серия ×${Math.min(4, 1 + this.streak / 15)}`, { color: '#FFE08A', size: 24, life: 1.1 });
        B.Audio.sfx('power');
      }
      this.setHud('hearts', this.hearts, true);
      if (this.hearts >= 100) this.award('gold_heart');
    }
    collectPower(o) {
      const names = { shield: 'Щит-значок!', team: 'Команда рядом!', x2: 'Энергия ×2!' };
      const dur = { shield: 12, team: 9, x2: 10 };
      this.pw[o.kind] = dur[o.kind];
      B.Audio.sfx('power');
      this.floaters.add(this.px, this.pl.y - 130, names[o.kind], { color: '#FFE08A', size: 24, life: 1.2 });
      this.particles.burst(o.x - this.cam, o.y, 18, { colors: ['#FFE08A', '#fff', '#F6B92B'], shape: 'star', speedMin: 80, speedMax: 240, sizeMin: 3, sizeMax: 6 });
    }
    help(o) {
      o.helped = true;
      o.t = 0;
      this.deeds++;
      const sx = o.x - this.cam;
      const texts = { granny: 'Сумки донесены!', balloon: 'Шарик пойман!', trash: 'Мусор убран!' };
      if (o.kid) {
        o.kid.helped = true;
        o.kid.t = 0;
      }
      B.Audio.sfx('deed');
      this.floaters.add(sx + 10, o.y - 30, texts[o.kind] || 'Доброе дело!', { color: '#B9F6CA', size: 20, life: 1.2 });
      this.floaters.add(sx + 10, o.y - 4, '+100', { color: '#fff', size: 18, life: 1 });
      this.particles.burst(sx + o.w / 2, o.y + o.h / 2, 16, { colors: ['#FF5D73', '#FFE08A', '#B9F6CA'], shape: 'heart', speedMin: 60, speedMax: 220, sizeMin: 4, sizeMax: 7, gravity: 200 });
      if (this.deeds >= 6) this.award('helper');
    }
    hitObstacle(o) {
      const pl = this.pl;
      if (pl.inv > 0) return;
      o.hit = true;
      const sx = o.x - this.cam + o.w / 2;
      if (this.pw.shield > 0) {
        this.pw.shield = 0;
        pl.inv = 0.8;
        B.Audio.sfx('shield');
        this.floaters.add(this.px, pl.y - 120, 'Щит спас!', { color: '#FFE08A', size: 22 });
        this.particles.burst(sx, o.y + o.h / 2, 20, { colors: ['#FFE08A', '#fff'], shape: 'diamond', speedMin: 120, speedMax: 320, gravity: 500 });
        o.smashed = true;
        return;
      }
      this.lives--;
      this.streak = 0;
      pl.inv = 1.6;
      this.shake.add(0.55);
      B.Audio.sfx('hit');
      this.flash = 0.25;
      this.particles.burst(this.px, pl.y - 45, 14, { colors: ['#fff', '#FFD54F', '#FF7043'], shape: 'star', speedMin: 100, speedMax: 260, gravity: 400 });
      this.floaters.add(this.px, pl.y - 120, U.pick(['Ой!', 'Осторожно!', 'Бывает!']), { color: '#FFCDD2', size: 22 });
      this.setHud('lives', this.lives, true);
      if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* нет вибрации */ }
      if (this.lives <= 0) this.die();
    }
    die() {
      const pl = this.pl;
      pl.dead = true;
      pl.vy = -620;
      pl.ground = false;
      B.Audio.sfx('fail');
      const meters = this.meters;
      const score = this.meters + this.heartPts + this.deeds * 100;
      this.finish({
        score,
        stars: this.starsFor(score),
        delay: 1600,
        lines: [
          ['Дистанция', `${U.fmt(meters)} м`],
          ['Сердца', U.fmt(this.hearts)],
          ['Добрые дела', String(this.deeds)],
          ['Лучшая серия', String(this.bestStreak)],
        ],
      });
    }

    // ---------- Отрисовка ----------
    render(ctx) {
      const W = this.W, H = this.H, k = this.k, vw = this.vw, vh = this.vh, gy = this.gy, t = this.t;
      const cyc = ((this.cam / M) / 1100 + this.dayOffset) % 1;
      const sky = skyAt(cyc);
      this.sky = sky;
      ctx.save();
      ctx.translate(this.shake.x, this.shake.y);
      ctx.scale(k, k);
      // небо
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, sky.top);
      g.addColorStop(1, sky.bot);
      ctx.fillStyle = g;
      ctx.fillRect(-40, -40, vw + 80, vh + 80);
      // звёзды
      if (sky.night > 0.05) {
        const rnd = U.rng(3);
        for (let i = 0; i < 70; i++) {
          const x = rnd() * vw, y = rnd() * gy * 0.7, tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
          ctx.fillStyle = `rgba(255,255,255,${sky.night * tw * 0.9})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
      // солнце и луна
      const sunA = cyc * U.TAU;
      const sunX = vw * 0.75 - Math.sin(sunA) * vw * 0.1, sunY = gy * 0.25 + (1 - Math.cos(sunA * 1)) * gy * 0.35;
      if (sky.night < 0.9) {
        ctx.fillStyle = `rgba(255,236,170,${1 - sky.night})`;
        ctx.beginPath();
        ctx.arc(sunX, Math.min(sunY, gy + 20), 34, 0, U.TAU);
        ctx.fill();
      }
      if (sky.night > 0.2) {
        const mx = vw * 0.2, my = gy * 0.22;
        ctx.fillStyle = `rgba(245,240,220,${sky.night})`;
        ctx.beginPath();
        ctx.arc(mx, my, 24, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = sky.top;
        ctx.beginPath();
        ctx.arc(mx + 10, my - 6, 21, 0, U.TAU);
        ctx.fill();
      }
      // облака
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 520 - this.cam * 0.05 - t * 6) % 2100 + 2100) % 2100 - 300;
        Art.cloud(ctx, cx, 60 + (i % 3) * 45, 0.9 + (i % 2) * 0.5, `rgba(255,255,255,${0.75 - sky.night * 0.6})`);
      }
      // дальний город
      ctx.save();
      const fScale = 1.0;
      const fOff = -((this.cam * 0.1) % (this.far.width * fScale));
      for (let rep = 0; rep < 3; rep++) {
        ctx.save();
        ctx.translate(fOff + rep * this.far.width * fScale, gy - 40);
        ctx.scale(fScale, fScale);
        ctx.fillStyle = sky.city;
        ctx.fill(this.far.path);
        if (sky.night > 0.3) {
          ctx.fillStyle = `rgba(255,215,120,${(sky.night - 0.3) * 0.9})`;
          ctx.fill(this.far.lights);
        }
        ctx.restore();
      }
      ctx.restore();
      // средний план: дома
      const midCam = this.cam * 0.35;
      const night = sky.night;
      for (const b of this.mids) {
        const x = b.x - midCam, y = gy - 26 - b.h;
        if (x > vw + 10 || x + b.w < -10) continue;
        ctx.fillStyle = U.mix(b.col, '#2A2F55', night * 0.75);
        ctx.fillRect(x, y, b.w, b.h);
        if (b.stripe) {
          ctx.fillStyle = U.mix(b.stripe, '#202040', night * 0.6);
          ctx.fillRect(x, y, 8, b.h);
        }
        if (b.roof) {
          ctx.fillStyle = U.mix('#8A8F9C', '#1A1D33', night * 0.7);
          ctx.fillRect(x + b.w * 0.2, y - 14, b.w * 0.25, 14);
        }
        const cw = (b.w - 20) / b.cols;
        const rh = (b.h - 20) / b.rows;
        for (let r = 0; r < b.rows; r++)
          for (let c = 0; c < b.cols; c++) {
            const lit = b.lit[r * b.cols + c];
            ctx.fillStyle = night > 0.4 ? (lit ? 'rgba(255,214,120,.95)' : 'rgba(30,34,70,.9)') : U.mix('#A9CFE6', '#1F2547', night);
            ctx.fillRect(x + 12 + c * cw, y + 12 + r * rh, cw * 0.55, rh * 0.5);
          }
      }
      // дальняя трава/газон
      ctx.fillStyle = U.mix(this.season === 'winter' ? '#E3ECF2' : '#7DB860', '#1E3A2C', night * 0.75);
      ctx.fillRect(-10, gy - 28, vw + 20, 28);
      // ближний план: деревья, фонари, скамейки
      for (const n of this.nears) {
        const x = n.x - this.cam;
        if (x < -200 || x > vw + 200) continue;
        this.drawNear(ctx, n, x, gy - 20, night);
      }
      // тротуар
      ctx.fillStyle = U.mix('#D9D2C5', '#3C3E58', night * 0.7);
      ctx.fillRect(-10, gy - 22, vw + 20, 40);
      ctx.strokeStyle = U.mix('#C3BBAD', '#2E3048', night * 0.7);
      ctx.lineWidth = 2;
      const tileOff = -(this.cam % 60);
      ctx.beginPath();
      for (let x = tileOff; x < vw + 60; x += 60) {
        ctx.moveTo(x, gy - 22);
        ctx.lineTo(x - 14, gy + 18);
      }
      ctx.moveTo(-10, gy - 2);
      ctx.lineTo(vw + 10, gy - 2);
      ctx.stroke();
      // бордюр и дорога
      ctx.fillStyle = U.mix('#B9B2A6', '#2A2C40', night * 0.7);
      ctx.fillRect(-10, gy + 18, vw + 20, 8);
      ctx.fillStyle = U.mix('#5B5E6B', '#1E2030', night * 0.6);
      ctx.fillRect(-10, gy + 26, vw + 20, vh - gy);
      ctx.fillStyle = U.mix('#F2F2F2', '#8C8FA0', night * 0.5);
      const dashOff = -((this.cam * 1.0) % 120);
      for (let x = dashOff; x < vw + 120; x += 120) ctx.fillRect(x, gy + 26 + (vh - gy - 26) * 0.5 - 3, 60, 6);

      // объекты (в координатах экрана, земля — gy)
      ctx.save();
      ctx.translate(0, gy);
      for (const o of this.objs) {
        const x = o.x - this.cam;
        if (x > vw + 120 || x + (o.w || 40) < -120) {
          if (o.warn && o.type === 'obst' && x > vw && x < vw + 520) this.drawWarn(ctx, vw - 30, o.y + o.h / 2 - 10);
          continue;
        }
        this.drawObj(ctx, o, x);
      }
      // команда бежит рядом
      if (this.pw.team > 0) {
        const mates = [{ skin: 1, hair: 3, hairColor: 3, jacket: 1 }, { skin: 2, hair: 0, hairColor: 0, jacket: 0, glasses: true }];
        mates.forEach((av, i) => {
          const a = Math.min(1, this.pw.team);
          ctx.globalAlpha = a;
          Art.avatar(ctx, this.px - 54 - i * 40, 0, 0.72, av, { kind: 'run', phase: this.pl.phase + 1 + i, t });
          ctx.globalAlpha = 1;
        });
      }
      this.drawPlayer(ctx);
      ctx.restore();
      // частицы и подписи (частицы пыли — относительно земли)
      ctx.save();
      ctx.translate(0, gy);
      this.particles.render(ctx);
      this.floaters.render(ctx);
      ctx.restore();
      // ночная тонировка вокруг фонарей
      ctx.restore();
      if (this.flash > 0) {
        this.flash -= 1 / 60;
        ctx.fillStyle = `rgba(255,80,80,${Math.max(0, this.flash)})`;
        ctx.fillRect(0, 0, W, H);
      }
      // индикаторы бонусов
      this.drawPowers(ctx);
      // скоростные линии
      if (this.speed > 560 && this.state === 'play') {
        const a = (this.speed - 560) / 180;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 * a})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const y = ((i * 97 + t * 40) % 1) * H + ((i * 131) % H);
          const x = W - ((t * 1400 + i * 300) % (W + 200));
          ctx.beginPath();
          ctx.moveTo(x, y % H);
          ctx.lineTo(x + 80, y % H);
          ctx.stroke();
        }
      }
    }
    drawWarn(ctx, x, y) {
      const p = 0.6 + Math.sin(this.t * 14) * 0.4;
      ctx.fillStyle = `rgba(210,31,43,${p})`;
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 18, y + 14);
      ctx.lineTo(x - 18, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `900 18px ${B.FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y + 3);
    }
    drawPowers(ctx) {
      const items = Object.entries(this.pw).filter(([, v]) => v > 0);
      if (!items.length) return;
      const icons = { shield: 'shield', team: 'team', x2: 'bolt' };
      const cols = { shield: '#2563C9', team: '#0E8A4E', x2: '#E07A1F' };
      const max = { shield: 12, team: 9, x2: 10 };
      let x = 22;
      const y = this.H - (U.isTouch() ? 120 : 40) - 10;
      for (const [k, v] of items) {
        ctx.fillStyle = 'rgba(20,14,18,.6)';
        ctx.beginPath();
        ctx.arc(x + 16, y, 22, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = cols[k];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + 16, y, 20, -Math.PI / 2, -Math.PI / 2 + U.TAU * (v / max[k]));
        ctx.stroke();
        Art.icon(ctx, icons[k], x + 16, y, 13, '#fff');
        x += 52;
      }
    }
    drawNear(ctx, n, x, base, night) {
      if (n.kind === 'tree') {
        const sp = Art.treeSprite(n.tree, this.season, n.seed, 90);
        if (night < 0.98) Art.drawSprite(ctx, sp, x, base + 4, 1.25 * n.s);
        if (night > 0.02) {
          ctx.globalAlpha = night;
          Art.drawSprite(ctx, Art.nightSprite(sp), x, base + 4, 1.25 * n.s);
          ctx.globalAlpha = 1;
        }
      } else if (n.kind === 'lamp') {
        ctx.fillStyle = U.mix('#4B4F5C', '#1D2033', night * 0.5);
        ctx.fillRect(x - 3, base - 170, 6, 170);
        ctx.fillRect(x - 3, base - 170, 30, 5);
        ctx.fillStyle = night > 0.4 ? '#FFF2B3' : '#D9DCE3';
        ctx.fillRect(x + 18, base - 166, 16, 6);
        if (night > 0.4) {
          const a = (night - 0.4) * 0.5;
          const g = ctx.createLinearGradient(0, base - 160, 0, base + 20);
          g.addColorStop(0, `rgba(255,230,150,${a})`);
          g.addColorStop(1, 'rgba(255,230,150,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x + 18, base - 160);
          ctx.lineTo(x + 34, base - 160);
          ctx.lineTo(x + 90, base + 20);
          ctx.lineTo(x - 40, base + 20);
          ctx.closePath();
          ctx.fill();
        }
      } else if (n.kind === 'bench') {
        ctx.fillStyle = U.mix('#9C6B3F', '#3A2A20', night * 0.6);
        ctx.fillRect(x - 40, base - 30, 80, 7);
        ctx.fillRect(x - 40, base - 46, 80, 6);
        ctx.fillStyle = U.mix('#3B3F4A', '#16182A', night * 0.5);
        ctx.fillRect(x - 34, base - 24, 5, 24);
        ctx.fillRect(x + 29, base - 24, 5, 24);
      } else if (n.kind === 'stop') {
        // остановка общественного транспорта
        ctx.fillStyle = U.mix('#3B3F4A', '#16182A', night * 0.5);
        ctx.fillRect(x - 70, base - 110, 5, 110);
        ctx.fillRect(x + 65, base - 110, 5, 110);
        ctx.fillStyle = U.mix('#2E7BC4', '#1B2E55', night * 0.5);
        ctx.fillRect(x - 80, base - 120, 160, 12);
        ctx.fillStyle = `rgba(190,225,245,${0.35 - night * 0.15})`;
        ctx.fillRect(x - 64, base - 106, 128, 70);
        ctx.fillStyle = U.mix('#F6B92B', '#6B5A20', night * 0.4);
        ctx.fillRect(x + 76, base - 150, 26, 26);
        ctx.fillStyle = '#1E1A1D';
        ctx.font = `900 13px ${B.FONT_DISPLAY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('А', x + 89, base - 136);
        ctx.fillRect(x + 88, base - 124, 3, 124);
      } else if (n.kind === 'bush') {
        const c = U.mix(Art.leafColors(this.season)[0], '#1A2A20', night * 0.6);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x - 20, base - 14, 20, 0, U.TAU);
        ctx.arc(x + 4, base - 22, 24, 0, U.TAU);
        ctx.arc(x + 28, base - 12, 18, 0, U.TAU);
        ctx.fill();
      }
    }
    drawObj(ctx, o, x) {
      const t = this.t;
      if (o.type === 'heart') {
        const bob = Math.sin(o.ph * 4) * 3;
        const s = 1 + Math.sin(o.ph * 6) * 0.06;
        ctx.fillStyle = 'rgba(255,90,110,.25)';
        ctx.beginPath();
        ctx.arc(x, o.y + bob, o.r * 1.5, 0, U.TAU);
        ctx.fill();
        Art.heart(ctx, x, o.y + bob, o.r * s, '#F0334E');
        return;
      }
      if (o.type === 'power') {
        const bob = Math.sin(o.ph * 3) * 5;
        const cols = { shield: '#2563C9', team: '#0E8A4E', x2: '#E07A1F' };
        const icons = { shield: 'shield', team: 'team', x2: 'bolt' };
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.arc(x, o.y + bob, o.r + 8 + Math.sin(o.ph * 5) * 3, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = cols[o.kind];
        ctx.beginPath();
        ctx.arc(x, o.y + bob, o.r, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        Art.icon(ctx, icons[o.kind], x, o.y + bob, o.r * 0.75, '#fff');
        return;
      }
      if (o.type === 'npc') {
        if (o.kind === 'granny') {
          const av = { skin: 0, scarf: '#C2185B', coat: true, jacketHex: '#6D4C7D', bags: !o.helped, hairHex: '#C9C4C0', noBadge: true, pants: '#4A3B4F', seed: 3 };
          Art.avatar(ctx, x + o.w / 2, 0, 0.8, av, { kind: o.helped ? 'wave' : 'idle', t, flip: true });
          if (o.helped && o.t < 2.2) this.bubble(ctx, x + o.w / 2, -110, 'Спасибо!');
        } else if (o.kind === 'kid') {
          const av = { skin: 1, hair: 4, hairColor: 3, jacketHex: '#F6B92B', noBadge: true, seed: 8 };
          Art.avatar(ctx, x + o.w / 2, 0, 0.6, av, { kind: o.helped ? 'cheer' : 'idle', t, flip: true, mouth: o.helped ? 'grin' : 'o' });
          if (o.helped) {
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + o.w / 2 - 8, -50);
            ctx.lineTo(x + o.w / 2 - 14, -100);
            ctx.stroke();
            this.balloonShape(ctx, x + o.w / 2 - 14, -112, 1);
            if (o.t < 2) this.bubble(ctx, x + o.w / 2, -140, 'Ура!');
          }
        } else if (o.kind === 'balloon') {
          if (o.helped) return;
          const bob = Math.sin(t * 3) * 6;
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + 17, o.y + 30 + bob);
          ctx.quadraticCurveTo(x + 10, o.y + 55 + bob, x + 18, o.y + 75 + bob);
          ctx.stroke();
          this.balloonShape(ctx, x + 17, o.y + 14 + bob, 1.2);
        } else if (o.kind === 'trash') {
          if (o.helped) return;
          ctx.fillStyle = '#2B2D35';
          ctx.beginPath();
          ctx.moveTo(x + 4, 0);
          ctx.quadraticCurveTo(x - 2, -26, x + 12, -30);
          ctx.lineTo(x + 22, -30);
          ctx.quadraticCurveTo(x + 36, -26, x + 30, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#F6B92B';
          ctx.fillRect(x + 12, -36, 10, 6);
          ctx.fillStyle = 'rgba(255,255,255,.2)';
          ctx.fillRect(x + 9, -24, 3, 16);
          // подсказка: «подбери»
          const a = 0.6 + Math.sin(t * 6) * 0.4;
          ctx.fillStyle = `rgba(185,246,202,${a})`;
          Art.icon(ctx, 'recycle', x + 17, -50, 10, `rgba(46,158,91,${a})`);
        }
        return;
      }
      // препятствия
      if (o.smashed) return;
      switch (o.kind) {
        case 'cones':
          for (let i = 0; i < 2; i++) {
            const cx = x + 12 + i * 22;
            ctx.fillStyle = '#F26B1D';
            ctx.beginPath();
            ctx.moveTo(cx - 12, 0);
            ctx.lineTo(cx - 3, -46);
            ctx.lineTo(cx + 3, -46);
            ctx.lineTo(cx + 12, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 8, -26, 16, 6);
            ctx.fillRect(cx - 5, -38, 10, 4);
            ctx.fillStyle = '#C24E10';
            ctx.fillRect(cx - 14, -4, 28, 4);
          }
          break;
        case 'barrier':
          ctx.fillStyle = '#3B3F4A';
          ctx.fillRect(x + 6, -62, 5, 62);
          ctx.fillRect(x + o.w - 11, -62, 5, 62);
          for (let i = 0; i < 2; i++) {
            const y = -60 + i * 26;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, o.w, 16);
            ctx.clip();
            for (let s = -2; s < 8; s++) {
              ctx.fillStyle = s % 2 ? '#D21F2B' : '#fff';
              ctx.beginPath();
              ctx.moveTo(x + s * 14, y + 16);
              ctx.lineTo(x + s * 14 + 14, y + 16);
              ctx.lineTo(x + s * 14 + 28, y);
              ctx.lineTo(x + s * 14 + 14, y);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
            ctx.strokeStyle = '#1E1A1D';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, o.w, 16);
          }
          break;
        case 'puddle': {
          ctx.fillStyle = 'rgba(80,140,210,.85)';
          ctx.beginPath();
          ctx.ellipse(x + o.w / 2, -2, o.w / 2, 7, 0, 0, U.TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.55)';
          ctx.lineWidth = 1.5;
          const r = (t * 30) % 22;
          ctx.beginPath();
          ctx.ellipse(x + o.w / 2 - 10, -2, r, r * 0.25, 0, 0, U.TAU);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.6)';
          ctx.fillRect(x + o.w * 0.25, -5, 18, 2);
          break;
        }
        case 'boxes':
          ctx.fillStyle = '#C8955A';
          ctx.fillRect(x, -30, 52, 30);
          ctx.fillRect(x + 8, -58, 36, 28);
          ctx.strokeStyle = '#8A5E2E';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, -30, 52, 30);
          ctx.strokeRect(x + 8, -58, 36, 28);
          ctx.fillStyle = '#E7C08A';
          ctx.fillRect(x + 22, -30, 8, 30);
          ctx.fillRect(x + 22, -58, 8, 28);
          break;
        case 'scaffold': {
          // строительные леса над тротуаром
          const top = -this.gy - 40;
          ctx.fillStyle = 'rgba(46,125,80,.35)';
          ctx.fillRect(x, top, o.w, -62 - top);
          ctx.strokeStyle = '#7A808C';
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (const px of [x + 4, x + o.w - 4]) {
            ctx.moveTo(px, top);
            ctx.lineTo(px, 0);
          }
          for (let y = -62; y > top; y -= 70) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + o.w, y - 70);
            ctx.moveTo(x + o.w, y);
            ctx.lineTo(x, y - 70);
          }
          ctx.stroke();
          ctx.fillStyle = '#B07A3E';
          ctx.fillRect(x - 6, -76, o.w + 12, 14);
          ctx.fillStyle = '#8A5A28';
          ctx.fillRect(x - 6, -64, o.w + 12, 3);
          // знак «пригнись»
          ctx.fillStyle = '#F6B92B';
          ctx.save();
          ctx.translate(x + o.w / 2, -98);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-12, -12, 24, 24);
          ctx.restore();
          ctx.strokeStyle = '#1E1A1D';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + o.w / 2 - 6, -103);
          ctx.lineTo(x + o.w / 2, -95);
          ctx.lineTo(x + o.w / 2 + 6, -103);
          ctx.stroke();
          break;
        }
        case 'scooter': {
          const av = { skin: 2, hair: 1, hairColor: 0, jacketHex: '#3A3F4F', cap: '#D21F2B', noBadge: true, seed: 5 };
          ctx.fillStyle = '#2B2D35';
          ctx.fillRect(x + 6, -12, 44, 6);
          ctx.fillRect(x + 8, -60, 4, 50);
          ctx.fillRect(x + 2, -62, 16, 4);
          for (const wx of [x + 10, x + 46]) {
            ctx.beginPath();
            ctx.arc(wx, -5, 6, 0, U.TAU);
            ctx.fill();
          }
          Art.avatar(ctx, x + 30, -10, 0.58, av, { kind: 'idle', t, flip: true, shadow: false });
          // полоски ветра
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 58 + i * 6, -50 + i * 14);
            ctx.lineTo(x + 80 + i * 6, -50 + i * 14);
            ctx.stroke();
          }
          break;
        }
      }
    }
    balloonShape(ctx, x, y, s) {
      ctx.fillStyle = '#E8384F';
      ctx.beginPath();
      ctx.ellipse(x, y, 14 * s, 17 * s, 0, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.ellipse(x - 5 * s, y - 6 * s, 3.5 * s, 5 * s, -0.4, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = '#E8384F';
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 17 * s);
      ctx.lineTo(x + 3, y + 17 * s);
      ctx.lineTo(x, y + 13 * s);
      ctx.fill();
    }
    bubble(ctx, x, y, text) {
      ctx.font = `800 15px ${B.FONT_BODY}`;
      const w = ctx.measureText(text).width + 20;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1E1A1D';
      ctx.lineWidth = 2;
      U.rr(ctx, x - w / 2, y - 16, w, 30, 12);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 13);
      ctx.lineTo(x, y + 24);
      ctx.lineTo(x + 6, y + 13);
      ctx.fill();
      ctx.fillStyle = '#1E1A1D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    }
    drawPlayer(ctx) {
      const pl = this.pl, t = this.t;
      if (pl.inv > 0 && !pl.dead && Math.floor(t * 18) % 2 === 0) return;
      let kind = 'run';
      if (this.state !== 'play' && !pl.dead) kind = 'idle';
      if (!pl.ground) kind = 'jump';
      if (pl.slide > 0 && pl.ground) kind = 'slide';
      if (pl.dead) kind = 'hurt';
      // тень
      const sh = U.clamp(1 + pl.y / 300, 0.3, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.2 * sh})`;
      ctx.beginPath();
      ctx.ellipse(this.px, 1, 18 * sh, 4 * sh, 0, 0, U.TAU);
      ctx.fill();
      const sq = pl.land > 0 ? 1 - pl.land * 1.2 : 1;
      ctx.save();
      ctx.translate(this.px, pl.y);
      ctx.scale(1 / Math.max(0.8, sq) * 1, sq);
      if (this.pw.x2 > 0 && Math.random() < 0.5) {
        this.particles.emit({ x: this.px - 12, y: pl.y - U.rand(20, 80), vx: -U.rand(80, 160), vy: U.rand(-20, 20), life: 0.4, size: 3, color: '#FFD54F', shape: 'star' });
      }
      Art.avatar(ctx, 0, 0, 0.92, this.av, { kind, phase: pl.phase, t, vy: pl.vy, rot: pl.dead ? -0.4 : 0, shadow: false });
      ctx.restore();
      if (this.pw.shield > 0) {
        const a = this.pw.shield < 2 ? (Math.sin(t * 20) > 0 ? 0.6 : 0.2) : 0.55;
        ctx.strokeStyle = `rgba(255,224,138,${a})`;
        ctx.fillStyle = `rgba(255,224,138,${a * 0.25})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(this.px + 4, pl.y - (pl.slide > 0 ? 26 : 50), 46, pl.slide > 0 ? 34 : 60, 0, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  B.Scenes.runner = RunnerScene;
})(window.B);
