/* БРСМ: Команда 212 — карта микрорайона вокруг школы №212 (ул. Лобанка, 95) */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save, D = B.Data;

  const NODES = [
    { id: 'quiz', kind: 'school', title: 'Знаток БРСМ', sub: 'Школа №212' },
    { id: 'runner', kind: 'house', title: 'Доброе Сердце', sub: 'Волонтёры' },
    { id: 'stack', kind: 'site', title: 'Студотряд', sub: 'Стройка' },
    { id: 'sort', kind: 'park', title: 'Чистый город', sub: 'Субботник' },
    { id: 'rhythm', kind: 'stage', title: 'Фестиваль', sub: 'Сцена' },
    { id: 'memorial', kind: 'memorial', title: 'Улица героя', sub: 'Мемориал' },
  ];
  // Раскладка карты по рядам. x — доля ширины экрана
  const LAYOUT = {
    land: { back: [['runner', 0.14], ['quiz', 0.5], ['stack', 0.86]], front: [['sort', 0.17], ['memorial', 0.5], ['rhythm', 0.83]] },
    port: { top: [['runner', 0.18], ['memorial', 0.5], ['stack', 0.82]], back: [['quiz', 0.5]], front: [['sort', 0.25], ['rhythm', 0.75]] },
  };

  class HubScene extends B.Scene {
    constructor(p) {
      super(p);
      this.music = 'menu';
      this.season = Art.season();
      this.hover = null;
      this.cars = [];
      this.walkers = [];
      this.target = null;
    }
    enter() {
      B.Audio.playMusic('menu');
      const p = Save.profile();
      if (!p) {
        B.App.go('title', null, { instant: true });
        return;
      }
      this.av = p.av;
      this.buildHud();
      const prof = Save.profile();
      if (!prof.seen.hub) {
        prof.seen.hub = 1;
        Save.save();
        setTimeout(() => UI.toast('Это карта микрорайона у школы №212. Нажми на любое место, чтобы начать миссию!', { duration: 5200 }), 700);
      }
      const back = this.params.from;
      const start = this.nodes.find((n) => n.id === back) || this.nodes[0];
      this.pl = { x: start.x, y: start.y + this.S * 0.12, tx: start.x, ty: start.y + this.S * 0.12, phase: 0, flip: false };
    }
    buildHud() {
      const p = Save.profile();
      const stars = Save.totalStars(p);
      const r = D.rankFor(stars);
      const prog = r.next ? (stars - r.rank.stars) / (r.next.stars - r.rank.stars) : 1;
      const root = UI.setHud(`
        <div class="hud-top">
          <button type="button" class="hub-player" aria-label="Профиль">
            <canvas width="48" height="48"></canvas>
            <span class="hub-player__info">
              <span class="hub-player__name">${U.esc(p.name)}</span>
              <span class="hub-player__rank">${U.esc(r.rank.title)}<span class="hub-stars">${UI.icon('star')}${stars}/15</span></span>
              <span class="hub-player__bar" title="${r.next ? 'До звания «' + r.next.title + '»: ' + (r.next.stars - stars) + '★' : 'Максимальное звание'}"><i style="width:${Math.round(prog * 100)}%"></i></span>
            </span>
          </button>
          <div class="hub-tools">
            <button type="button" class="hud-btn" data-a="card" aria-label="Игровой билет" title="Игровой билет">${UI.icon('card')}</button>
            <button type="button" class="hud-btn" data-a="badges" aria-label="Значки" title="Значки">${UI.icon('medal')}</button>
            <button type="button" class="hud-btn" data-a="board" aria-label="Рекорды" title="Рекорды">${UI.icon('trophy')}</button>
            <button type="button" class="hud-btn" data-a="settings" aria-label="Настройки" title="Настройки">${UI.icon('sliders')}</button>
            <button type="button" class="hud-btn" data-a="home" aria-label="На заставку" title="На заставку">${UI.icon('home')}</button>
          </div>
        </div>
        <div class="hint hub-hint">${r.next ? `Ещё ${r.next.stars - stars}★ до звания «${U.esc(r.next.title)}»` : 'Ты легенда школы №212!'}</div>`);
      Art.portrait(root.querySelector('.hub-player canvas'), p.av, { size: 48, bg: '#F3E1C2' });
      const refresh = () => {
        this.av = Save.profile().av;
        this.buildHud();
      };
      root.querySelector('.hub-player').addEventListener('click', () => {
        B.Audio.sfx('click');
        B.Menus.profileEditor({ edit: true, closable: true, onDone: refresh });
      });
      const act = {
        card: () => B.Menus.card(),
        badges: () => B.Menus.badges(),
        board: () => B.Menus.leaderboard(),
        settings: () => B.Menus.settings(() => {
          if (!Save.profile()) B.App.go('title');
          else refresh();
        }),
        home: () => B.App.go('title'),
      };
      root.querySelectorAll('[data-a]').forEach((b) =>
        b.addEventListener('click', () => {
          B.Audio.sfx('click');
          act[b.dataset.a]();
        })
      );
    }
    resize(W, H) {
      this.W = W;
      this.H = H;
      this.port = H > W * 1.05;
      const top = this.port ? 92 : 86, bottom = 66;
      this.top = top;
      this.bottom = bottom;
      const avail = H - top - bottom;
      const L = this.port ? LAYOUT.port : LAYOUT.land;
      // высоты рядов в единицах S: здание + подпись; дорога
      const ROW = 1.5, ROAD = 0.42;
      const rows = this.port ? 3 : 2;
      const need = rows * ROW + ROAD;
      this.S = U.clamp(Math.min(W / (this.port ? 3.25 : 5.8), avail / need), 56, 210);
      const S = this.S;
      const gap = Math.max(0, (avail - need * S) / (rows + 1.5));
      let y = top + gap * 0.5;
      const pos = {};
      const place = (row) => {
        y += S * 1.02;
        for (const [id, x] of row) pos[id] = [W * x, y];
        y += S * 0.48 + gap;
      };
      if (this.port) place(L.top);
      place(L.back);
      this.roadY = y - gap * 0.6 + S * 0.12;
      y = this.roadY + S * 0.25 + gap * 0.3;
      place(L.front);
      this.nodes = NODES.map((n) => Object.assign({}, n, { x: pos[n.id][0], y: pos[n.id][1], scale: 1 }));
      this.buildBackground();
      if (this.pl) {
        const n = this.nodes[0];
        this.pl.x = this.pl.tx = n.x;
        this.pl.y = this.pl.ty = n.y + this.S * 0.12;
      }
      this.cars = [];
      for (let i = 0; i < 5; i++) this.spawnCar(Math.random() * W);
      this.walkers = [];
      for (let i = 0; i < (this.port ? 3 : 5); i++) {
        const rnd = Math.random();
        this.walkers.push({
          x: Math.random() * W, dir: rnd < 0.5 ? 1 : -1, speed: 22 + Math.random() * 20, phase: Math.random() * 6,
          av: { skin: (Math.random() * 4) | 0, hair: (Math.random() * 6) | 0, hairColor: (Math.random() * 6) | 0, jacket: (Math.random() * 6) | 0, seed: i },
        });
      }
    }
    spawnCar(x) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.cars.push({
        x: x != null ? x : dir > 0 ? -60 : this.W + 60, dir, speed: 60 + Math.random() * 50,
        color: U.pick(['#D21F2B', '#2563C9', '#F6B92B', '#FFFFFF', '#2E2C3A', '#0E8A4E', '#7A8794']), bus: Math.random() < 0.2,
      });
    }
    // Статический фон: трава, дороги, деревья
    buildBackground() {
      const W = this.W, H = this.H, dpr = B.App.dpr;
      const c = U.makeCanvas(W * dpr, H * dpr);
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      const S = this.S;
      const autumn = this.season === 'autumn', winter = this.season === 'winter';
      const g1 = winter ? '#E9F0F4' : autumn ? '#8DB255' : '#7CC05E', g2 = winter ? '#D7E3EA' : autumn ? '#7AA348' : '#69AE4E';
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, g1);
      grad.addColorStop(1, g2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // полосы газона
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let x = -H; x < W; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 22, 0);
        ctx.lineTo(x + 22 + H * 0.5, H);
        ctx.lineTo(x + H * 0.5, H);
        ctx.fill();
      }
      const rnd = U.rng(212);
      ctx.fillStyle = winter ? 'rgba(160,180,200,.25)' : 'rgba(40,80,30,.12)';
      for (let i = 0; i < W * H * 0.0012; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
      // главная дорога — ул. Лобанка
      const ry = this.roadY, rh = Math.max(34, S * 0.34);
      ctx.fillStyle = '#E3D6BF';
      ctx.fillRect(0, ry - rh / 2 - 9, W, rh + 18);
      ctx.fillStyle = '#5B5E6B';
      ctx.fillRect(0, ry - rh / 2, W, rh);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let x = 10; x < W; x += 44) ctx.fillRect(x, ry - 1.5, 24, 3);
      // пешеходный переход у школы
      const sx = this.nodes[0].x;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (let i = -3; i <= 3; i++) ctx.fillRect(sx + i * 10 - 3, ry - rh / 2 + 3, 6, rh - 6);
      // тропинки к объектам
      ctx.strokeStyle = winter ? '#C9D3DA' : '#E9DCC2';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(12, S * 0.13);
      for (const n of this.nodes) {
        if (n.id === 'quiz') continue;
        const below = n.y > ry;
        const toY = below ? ry + rh / 2 : ry - rh / 2;
        const side = sx - n.x >= 0 ? 1 : -1;
        const fx = below ? n.x + side * S * 0.6 : n.x, fy = below ? n.y - S * 0.1 : n.y + 4;
        const tx = below ? fx + side * S * 0.1 : n.x + (sx - n.x) * 0.3;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.bezierCurveTo(fx, (fy + toY) / 2, tx, (fy + toY) / 2, tx, toY);
        ctx.stroke();
      }
      // площадки под объектами
      for (const n of this.nodes) {
        ctx.fillStyle = winter ? 'rgba(170,190,205,.35)' : 'rgba(60,90,40,.18)';
        ctx.beginPath();
        ctx.ellipse(n.x, n.y + 2, S * (n.id === 'quiz' ? 1.1 : 0.62), S * 0.16, 0, 0, U.TAU);
        ctx.fill();
      }
      // деревья: не на дорогах, не на объектах и не на подписях
      const trees = [];
      const boxes = this.nodes.map((n) => {
        const hw = S * (n.id === 'quiz' ? 1.15 : 0.62);
        return { x0: n.x - hw, x1: n.x + hw, y0: n.y - S * (n.id === 'memorial' ? 1.0 : 1.05), y1: n.y + S * 0.5 };
      });
      const tries = this.port ? 90 : 140;
      for (let i = 0; i < tries; i++) {
        const x = rnd() * W, y = this.top * 0.5 + rnd() * (H - this.top * 0.5 + S * 0.3);
        const th = S * (0.45 + rnd() * 0.3);
        if (y > ry - rh / 2 - 12 && y - th < ry + rh / 2 + 14) continue;
        const tb = { x0: x - th * 0.35, x1: x + th * 0.35, y0: y - th, y1: y };
        if (boxes.some((bx) => tb.x0 < bx.x1 && tb.x1 > bx.x0 && tb.y0 < bx.y1 && tb.y1 > bx.y0)) continue;
        if (trees.some((t) => Math.abs(t.x - x) < S * 0.36 && Math.abs(t.y - y) < S * 0.3)) continue;
        trees.push({ x, y, kind: rnd() < 0.45 ? 'birch' : rnd() < 0.6 ? 'maple' : 'pine', seed: (rnd() * 20) | 0, sc: th / 144 });
      }
      this.trees = trees.sort((a, b) => a.y - b.y);
      this.bg = c;
    }
    nodeAt(x, y) {
      let best = null;
      for (const n of this.nodes) {
        const w = this.S * (n.id === 'quiz' ? 1.0 : 0.62), h = this.S * (n.id === 'quiz' ? 0.95 : 1.0);
        if (x > n.x - w && x < n.x + w && y > n.y - h && y < n.y + this.S * 0.42) best = n;
      }
      return best;
    }
    pointermove(p) {
      const n = this.nodeAt(p.x, p.y);
      if (n !== this.hover) {
        this.hover = n;
        B.App.canvas.style.cursor = n ? 'pointer' : 'default';
        if (n) B.Audio.sfx('tap');
      }
    }
    pointerdown(p) {
      const n = this.nodeAt(p.x, p.y);
      if (!n) {
        this.particles.burst(p.x, p.y, 6, { colors: Art.leafColors(this.season), shape: 'leaf', sizeMin: 4, sizeMax: 7, speedMin: 40, speedMax: 120, gravity: 120 });
        return;
      }
      this.select(n);
    }
    keydown(e) {
      const idx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
      if (idx >= 0 && this.nodes[idx]) this.select(this.nodes[idx]);
    }
    select(n) {
      B.Audio.sfx('click');
      n.scale = 1.18;
      if (this.target === n) {
        this.arrive(n);
        return;
      }
      this.target = n;
      this.pl.tx = n.x;
      this.pl.ty = n.y + this.S * 0.12;
      if (Math.hypot(this.pl.tx - this.pl.x, this.pl.ty - this.pl.y) < 8) this.arrive(n);
    }
    arrive(n) {
      this.target = null;
      this.pl.x = this.pl.tx;
      this.pl.y = this.pl.ty;
      B.App.canvas.style.cursor = 'default';
      B.App.go(n.id);
    }
    update(dt) {
      super.update(dt);
      if (!this.pl) return;
      // персонаж идёт к цели
      const dx = this.pl.tx - this.pl.x, dy = this.pl.ty - this.pl.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const sp = Math.max(260, d * 2.2) * dt;
        this.pl.x += (dx / d) * Math.min(sp, d);
        this.pl.y += (dy / d) * Math.min(sp, d);
        this.pl.phase += dt * 13;
        this.pl.flip = dx < -1;
        this.pl.moving = true;
      } else {
        this.pl.moving = false;
        if (this.target) this.arrive(this.target);
      }
      for (const n of this.nodes) n.scale = U.damp(n.scale, this.hover === n ? 1.07 : 1, 12, dt);
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const c = this.cars[i];
        c.x += c.dir * c.speed * dt;
        if (c.x < -80 || c.x > this.W + 80) {
          this.cars.splice(i, 1);
          this.spawnCar();
        }
      }
      for (const w of this.walkers) {
        w.x += w.dir * w.speed * dt;
        w.phase += dt * 7;
        if (w.x > this.W + 30) w.x = -30;
        if (w.x < -30) w.x = this.W + 30;
      }
      // сердечки над домом волонтёров, ноты над сценой
      if (Math.random() < dt * 1.6) {
        const n = this.nodes.find((q) => q.id === 'runner');
        this.particles.emit({ x: n.x + U.rand(-10, 10), y: n.y - this.S * 0.85, vx: U.rand(-8, 8), vy: -28, life: 2, size: 6, color: '#E8384F', shape: 'heart', shrink: false });
      }
      if (Math.random() < dt * 1.4) {
        const n = this.nodes.find((q) => q.id === 'rhythm');
        this.particles.emit({ x: n.x + U.rand(-30, 30), y: n.y - this.S * 0.7, vx: U.rand(-10, 10), vy: -30, life: 1.8, size: 5, color: U.pick(['#FFD54F', '#B388FF', '#4FC3F7']), shape: 'diamond', shrink: false });
      }
      if (this.season !== 'summer' && Math.random() < dt * (this.season === 'winter' ? 12 : 2.5)) {
        const winter = this.season === 'winter';
        this.particles.emit({
          x: Math.random() * this.W, y: -10, vx: U.rand(10, 30), vy: U.rand(25, 45), life: 20, size: winter ? U.rand(1.5, 3.5) : U.rand(4, 7),
          color: U.pick(Art.leafColors(this.season)), shape: winter ? 'circle' : 'leaf', fade: false, shrink: false, drag: 0, vr: U.rand(-2, 2),
        });
      }
    }
    render(ctx) {
      const W = this.W, H = this.H, S = this.S, t = this.t;
      if (!this.bg || !this.pl) {
        ctx.fillStyle = '#7CC05E';
        ctx.fillRect(0, 0, W, H);
        return;
      }
      ctx.drawImage(this.bg, 0, 0, W, H);
      // машины
      const ry = this.roadY, rh = Math.max(34, S * 0.34);
      for (const c of this.cars) {
        const y = c.dir > 0 ? ry + rh * 0.22 : ry - rh * 0.22;
        const len = c.bus ? 64 : 34, hh = c.bus ? 16 : 13;
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        U.rr(ctx, c.x - len / 2 + 2, y - hh / 2 + 3, len, hh, 5);
        ctx.fill();
        ctx.fillStyle = c.bus ? '#2E9E5B' : c.color;
        U.rr(ctx, c.x - len / 2, y - hh / 2, len, hh, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(30,40,60,.65)';
        if (c.bus) for (let i = 0; i < 5; i++) ctx.fillRect(c.x - len / 2 + 6 + i * 11, y - hh / 2 + 3, 8, hh - 6);
        else ctx.fillRect(c.x + (c.dir > 0 ? 2 : -12), y - hh / 2 + 2, 10, hh - 4);
        ctx.fillStyle = '#FFF3B0';
        ctx.fillRect(c.x + (c.dir > 0 ? len / 2 - 3 : -len / 2), y - hh / 2 + 2, 3, 3);
        ctx.fillRect(c.x + (c.dir > 0 ? len / 2 - 3 : -len / 2), y + hh / 2 - 5, 3, 3);
      }
      // всё, что «стоит», рисуем по глубине
      const items = [];
      for (const tr of this.trees) items.push({ y: tr.y, draw: () => Art.drawSprite(ctx, Art.treeSprite(tr.kind, this.season, tr.seed, 90), tr.x, tr.y, tr.sc) });
      for (const n of this.nodes) items.push({ y: n.y, draw: () => this.drawNode(ctx, n) });
      for (const w of this.walkers) {
        const y = ry + (w.dir > 0 ? rh / 2 + 8 : -rh / 2 - 6);
        items.push({ y, draw: () => Art.avatar(ctx, w.x, y, S / 260, w.av, { kind: 'walk', phase: w.phase, t, flip: w.dir < 0 }) });
      }
      items.push({
        y: this.pl.y + 0.1,
        draw: () => {
          const s = S / 235;
          Art.avatar(ctx, this.pl.x, this.pl.y, s, this.av, { kind: this.pl.moving ? 'run' : 'idle', phase: this.pl.phase, t, flip: this.pl.flip });
          // маркер «это ты»
          const by = this.pl.y - 112 * s - 10 + Math.sin(t * 4) * 3;
          ctx.fillStyle = '#F6B92B';
          ctx.strokeStyle = '#1E1A1D';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(this.pl.x, by + 8);
          ctx.lineTo(this.pl.x - 7, by - 2);
          ctx.lineTo(this.pl.x + 7, by - 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        },
      });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw();
      // подписи поверх
      this.drawStreetSign(ctx);
      for (const n of this.nodes) this.drawLabel(ctx, n);
      this.particles.render(ctx);
    }
    drawNode(ctx, n) {
      const S = this.S * n.scale, t = this.t;
      ctx.save();
      ctx.translate(n.x, n.y);
      if (this.hover === n) {
        ctx.fillStyle = 'rgba(255,240,180,.45)';
        ctx.beginPath();
        ctx.ellipse(0, 2, S * (n.id === 'quiz' ? 1.05 : 0.6), S * 0.15, 0, 0, U.TAU);
        ctx.fill();
      }
      const draw = HubScene.NODE_ART[n.kind];
      draw(ctx, S, t, this);
      ctx.restore();
    }
    drawStreetSign(ctx) {
      const S = this.S, rh = Math.max(34, S * 0.34);
      const fs = U.clamp(S * 0.085, 10, 13);
      ctx.font = `700 ${fs}px ${B.FONT_BODY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = 'ул. Лобанка';
      const lw = ctx.measureText(label).width + 16, lh = fs + 10;
      const school = this.nodes[0];
      const lx = school.x + S * 0.42, ly = this.roadY - rh / 2 - lh - 4;
      ctx.fillStyle = '#1F5FA8';
      U.rr(ctx, lx, ly, lw, lh, 4);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.4;
      U.rr(ctx, lx + 2.5, ly + 2.5, lw - 5, lh - 5, 3);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, lx + 8, ly + lh / 2 + 0.5);
    }
    drawLabel(ctx, n) {
      const S = this.S;
      const m = D.missionById(n.id);
      const g = m ? Save.game(n.id) : null;
      const fs = U.clamp(S * 0.105, 11, 15);
      ctx.font = `800 ${fs}px ${B.FONT_BODY}`;
      const tw = ctx.measureText(n.title).width;
      const starW = m ? fs * 3.6 : 0;
      const w = Math.max(tw, starW) + 20, h = m ? fs * 2.75 : fs * 1.9;
      const x = n.x - w / 2, y = n.y + S * 0.13;
      ctx.fillStyle = 'rgba(30,26,29,.9)';
      U.rr(ctx, x, y + 3, w, h, 10);
      ctx.fill();
      ctx.fillStyle = '#FFF7EA';
      U.rr(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = '#1E1A1D';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#1E1A1D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.title, n.x, y + fs * 0.95);
      if (m) {
        for (let i = 0; i < 3; i++) {
          Art.star(ctx, n.x + (i - 1) * fs * 1.15, y + fs * 2.02, fs * 0.5, fs * 0.22);
          ctx.fillStyle = i < g.stars ? '#F6B92B' : '#E2D4BD';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        if (!g.plays) {
          const bx = x + w - 6, by = y - 4;
          const pulse = 1 + Math.sin(this.t * 5) * 0.08;
          ctx.save();
          ctx.translate(bx, by);
          ctx.scale(pulse, pulse);
          ctx.fillStyle = '#D21F2B';
          U.rr(ctx, -22, -9, 44, 18, 9);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `800 10px ${B.FONT_BODY}`;
          ctx.fillText('НОВОЕ', 0, 0.5);
          ctx.restore();
        }
      } else if (n.id === 'memorial' && Save.hasBadge('memory')) {
        Art.icon(ctx, 'flame', x + w - 4, y - 2, 9, '#E2572B');
      }
    }
  }

  // ---------- Рисунки объектов на карте (S — масштаб, основание в 0,0) ----------
  HubScene.NODE_ART = {
    school(ctx, S, t) {
      Art.school(ctx, 0, 0, S / 175, t);
    },
    house(ctx, S, t) {
      const w = S * 0.95, h = S * 0.78;
      ctx.fillStyle = '#9EC7E6';
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.fillStyle = '#86B3D6';
      ctx.fillRect(-w / 2, -h, w * 0.08, h);
      ctx.fillStyle = '#5C86B0';
      ctx.fillRect(-w / 2 - 3, -h - 5, w + 6, 6);
      const cols = 5, rows = 4;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const wx = -w / 2 + w * 0.12 + c * (w * 0.78) / cols, wy = -h + h * 0.1 + r * (h * 0.78) / rows;
          ctx.fillStyle = (r + c) % 3 === 0 ? '#FFE9A8' : '#E8F4FB';
          ctx.fillRect(wx, wy, w * 0.1, h * 0.12);
          ctx.fillStyle = 'rgba(80,110,140,.35)';
          ctx.fillRect(wx, wy + h * 0.12, w * 0.12, 2);
        }
      ctx.fillStyle = '#6B4A2E';
      ctx.fillRect(-w * 0.07, -h * 0.2, w * 0.14, h * 0.2);
      // вывеска-сердце
      const pulse = 1 + Math.sin(t * 4) * 0.07;
      ctx.save();
      ctx.translate(0, -h - S * 0.17);
      ctx.scale(pulse, pulse);
      Art.heart(ctx, 0, 0, S * 0.16, '#E8384F');
      ctx.restore();
      ctx.strokeStyle = '#5C86B0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-S * 0.08, -h - 5);
      ctx.lineTo(-S * 0.05, -h - S * 0.08);
      ctx.moveTo(S * 0.08, -h - 5);
      ctx.lineTo(S * 0.05, -h - S * 0.08);
      ctx.stroke();
    },
    site(ctx, S, t) {
      const w = S * 0.6;
      // недостроенный дом
      const floors = 4, fh = S * 0.15;
      for (let i = 0; i < floors; i++) {
        const y = -fh * (i + 1);
        if (i < floors - 1) {
          ctx.fillStyle = i % 2 ? '#E9C9A0' : '#DDB98C';
          ctx.fillRect(-w / 2 - S * 0.12, y, w, fh);
          ctx.fillStyle = '#7FB2D6';
          for (let k = 0; k < 4; k++) ctx.fillRect(-w / 2 - S * 0.12 + w * 0.08 + k * w * 0.23, y + fh * 0.25, w * 0.12, fh * 0.5);
        } else {
          ctx.strokeStyle = '#9C7A55';
          ctx.lineWidth = 3;
          ctx.strokeRect(-w / 2 - S * 0.12, y, w, fh);
          ctx.beginPath();
          ctx.moveTo(-w / 2 - S * 0.12, y);
          ctx.lineTo(w / 2 - S * 0.12, y + fh);
          ctx.stroke();
        }
      }
      // кран
      const mx = S * 0.36, mh = S * 0.9;
      ctx.strokeStyle = '#E07A1F';
      ctx.lineWidth = Math.max(2, S * 0.025);
      ctx.beginPath();
      ctx.moveTo(mx - 5, 0);
      ctx.lineTo(mx - 5, -mh);
      ctx.moveTo(mx + 5, 0);
      ctx.lineTo(mx + 5, -mh);
      for (let y = 0; y > -mh; y -= 12) {
        ctx.moveTo(mx - 5, y);
        ctx.lineTo(mx + 5, y - 12);
      }
      ctx.moveTo(mx + 14, -mh);
      ctx.lineTo(mx - S * 0.75, -mh);
      ctx.stroke();
      ctx.fillStyle = '#E07A1F';
      ctx.fillRect(mx - 8, -mh - 10, 18, 12);
      ctx.fillStyle = '#5B5E6B';
      ctx.fillRect(mx + 8, -mh - 4, 14, 10);
      // трос и груз
      const hx = mx - S * 0.5 + Math.sin(t * 0.8) * S * 0.12;
      const hy = -mh + S * 0.3 + Math.sin(t * 1.3) * 6;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, -mh);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = '#D21F2B';
      ctx.fillRect(hx - S * 0.1, hy, S * 0.2, S * 0.07);
      // забор
      for (let i = -5; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#F6B92B' : '#fff';
        ctx.fillRect(i * S * 0.07, -S * 0.07, S * 0.07, S * 0.07);
      }
      ctx.strokeStyle = '#1E1A1D';
      ctx.lineWidth = 1;
      ctx.strokeRect(-S * 0.35, -S * 0.07, S * 0.7, S * 0.07);
    },
    park(ctx, S, t, scene) {
      const sea = scene.season;
      Art.drawSprite(ctx, Art.treeSprite('maple', sea, 4, 90), -S * 0.38, -S * 0.05, S / 120);
      Art.drawSprite(ctx, Art.treeSprite('birch', sea, 9, 90), S * 0.4, -S * 0.07, S / 130);
      const cols = ['#F6C343', '#2F7BD8', '#2E9E5B', '#D9502B'];
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * S * 0.17, w = S * 0.14, h = S * 0.2;
        ctx.fillStyle = cols[i];
        U.rr(ctx, x - w / 2, -h, w, h, 3);
        ctx.fill();
        ctx.fillStyle = U.shade(cols[i], -0.25);
        const lid = Math.max(0, Math.sin(t * 2 + i * 1.6)) * 0.4;
        ctx.save();
        ctx.translate(x - w / 2, -h);
        ctx.rotate(-lid);
        ctx.fillRect(-1, -4, w + 2, 5);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath();
        ctx.arc(x, -h * 0.5, w * 0.18, 0, U.TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(0, -S * 0.42 + Math.sin(t * 2) * 4);
      ctx.rotate(t * 0.6);
      Art.icon(ctx, 'recycle', 0, 0, S * 0.13, '#2E9E5B');
      ctx.restore();
    },
    stage(ctx, S, t) {
      const w = S * 1.0, h = S * 0.22;
      // лучи прожекторов
      const beams = [['#FFD54F', -0.3], ['#B388FF', 0.25], ['#4FC3F7', 0.0]];
      ctx.globalCompositeOperation = 'lighter';
      beams.forEach(([c, off], i) => {
        const a = Math.sin(t * 1.4 + i * 2) * 0.5 + off;
        ctx.save();
        ctx.translate((i - 1) * w * 0.3, -S * 0.78);
        ctx.rotate(a);
        const g = ctx.createLinearGradient(0, 0, 0, S * 0.7);
        g.addColorStop(0, U.alpha(c, 0.5));
        g.addColorStop(1, U.alpha(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-S * 0.13, S * 0.7);
        ctx.lineTo(S * 0.13, S * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.globalCompositeOperation = 'source-over';
      // сцена
      ctx.fillStyle = '#2E2C3A';
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.fillStyle = '#4A465C';
      ctx.fillRect(-w / 2, -h, w, 5);
      // экран
      ctx.fillStyle = '#1E1A1D';
      ctx.fillRect(-w * 0.3, -S * 0.66, w * 0.6, S * 0.36);
      const pulse = 0.6 + Math.sin(t * 8) * 0.4;
      ctx.fillStyle = `rgba(210,31,43,${0.6 + pulse * 0.4})`;
      ctx.font = `900 ${S * 0.12}px ${B.FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FEST', 0, -S * 0.52);
      ctx.fillStyle = '#F6B92B';
      ctx.font = `700 ${S * 0.06}px ${B.FONT_DISPLAY}`;
      ctx.fillText('212', 0, -S * 0.4);
      // ферма
      ctx.strokeStyle = '#8B4BB8';
      ctx.lineWidth = Math.max(2, S * 0.03);
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, -h);
      ctx.lineTo(-w / 2 + 4, -S * 0.8);
      ctx.lineTo(w / 2 - 4, -S * 0.8);
      ctx.lineTo(w / 2 - 4, -h);
      ctx.stroke();
      // колонки
      for (const d of [-1, 1]) {
        ctx.fillStyle = '#1E1A1D';
        ctx.fillRect(d * w * 0.44 - S * 0.06, -h - S * 0.22, S * 0.12, S * 0.22);
        ctx.fillStyle = '#5B5E6B';
        const b = 1 + Math.max(0, Math.sin(t * 8.5)) * 0.15;
        ctx.beginPath();
        ctx.arc(d * w * 0.44, -h - S * 0.08, S * 0.035 * b, 0, U.TAU);
        ctx.fill();
      }
    },
    memorial(ctx, S, t, scene) {
      Art.drawSprite(ctx, Art.treeSprite('birch', scene.season, 2, 90), -S * 0.42, -S * 0.02, S / 130);
      Art.drawSprite(ctx, Art.treeSprite('birch', scene.season, 6, 90), S * 0.42, -S * 0.02, S / 125);
      // постамент и стела
      ctx.fillStyle = '#A9A39B';
      ctx.fillRect(-S * 0.26, -S * 0.08, S * 0.52, S * 0.08);
      ctx.fillStyle = '#C4BEB5';
      ctx.beginPath();
      ctx.moveTo(-S * 0.08, -S * 0.08);
      ctx.lineTo(-S * 0.04, -S * 0.82);
      ctx.lineTo(S * 0.04, -S * 0.82);
      ctx.lineTo(S * 0.08, -S * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#B0AAA1';
      ctx.fillRect(-S * 0.01, -S * 0.8, S * 0.05, S * 0.72);
      Art.star(ctx, 0, -S * 0.88, S * 0.07, S * 0.03);
      ctx.fillStyle = '#D21F2B';
      ctx.fill();
      // вечный огонь
      const fy = -S * 0.1;
      for (let i = 0; i < 3; i++) {
        const fl = 1 + Math.sin(t * 13 + i * 2) * 0.18;
        ctx.fillStyle = ['#FFB300', '#FF7043', '#FFE082'][i];
        ctx.beginPath();
        ctx.ellipse(S * 0.17, fy - S * 0.05 * fl, S * (0.035 - i * 0.008), S * (0.07 - i * 0.015) * fl, 0, 0, U.TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#5B5E6B';
      ctx.fillRect(S * 0.12, fy, S * 0.1, S * 0.03);
      // цветы
      const n = Save.hasBadge('memory') ? 7 : 3;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = ['#E8384F', '#F6B92B', '#fff'][i % 3];
        ctx.beginPath();
        ctx.arc(-S * 0.2 + i * S * 0.045, -S * 0.1 - (i % 2) * 3, S * 0.022, 0, U.TAU);
        ctx.fill();
      }
    },
  };

  B.Scenes.hub = HubScene;
})(window.B);
