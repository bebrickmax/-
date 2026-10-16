/* БРСМ: Команда 212 — заставка: утренний Минск, флаг БРСМ, школа №212 */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save;

  class TitleScene extends B.Scene {
    constructor(p) {
      super(p);
      this.music = 'menu';
      this.season = Art.season();
      this.far = Art.skylinePath(1800, 11, { landmarks: ['tv', 'library', 'gates', 'stele'] });
      this.mid = Art.skylinePath(1600, 29, { landmarks: [] });
      this.mx = 0;
      this.my = 0;
      this.walkers = [];
      const rnd = U.rng(5);
      for (let i = 0; i < 5; i++) {
        this.walkers.push({
          x: rnd(), speed: 0.025 + rnd() * 0.02, dir: rnd() < 0.5 ? 1 : -1,
          av: { skin: (rnd() * 4) | 0, hair: (rnd() * 6) | 0, hairColor: (rnd() * 6) | 0, jacket: i % 2 ? 0 : 1, glasses: rnd() < 0.3, seed: i * 7 },
          phase: rnd() * 6,
        });
      }
      this.birds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: 0.12 + Math.random() * 0.2, s: 0.6 + Math.random() * 0.6, ph: Math.random() * 6, v: 0.015 + Math.random() * 0.02 }));
      this.leafT = 0;
    }
    enter() {
      B.Audio.playMusic('menu');
      this.buildUI();
    }
    buildUI() {
      const p = Save.profile();
      const s = UI.setScreen(`
        <div class="title">
          <button type="button" class="hud-btn title__sound is-interactive" aria-label="Звук">${UI.icon(B.settings.sound ? 'sound' : 'mute')}</button>
          <div class="title__logo">
            <div class="title__brsm" aria-label="БРСМ"><span>Б</span><span>Р</span><span>С</span><span>М</span></div>
            <div class="title__team">команда <b>212</b></div>
            <p class="title__tag">Волонтёры, стройотряд, экология, фестиваль и знания — пройди путь от новичка до легенды школы!</p>
          </div>
          <div class="title__menu">
            <button type="button" class="btn btn--big btn--primary" data-a="play">${UI.icon('play')}<span>Играть</span></button>
            <div class="title__row">
              <button type="button" class="btn btn--gold" data-a="board">${UI.icon('trophy')}<span>Рекорды</span></button>
              <button type="button" class="btn btn--ghost" data-a="about">${UI.icon('info')}<span>Об игре</span></button>
            </div>
            ${p ? `<div class="title__who">Играет: <b>${U.esc(p.name)}</b> · <button type="button" data-a="players">сменить</button></div>` : ''}
          </div>
          <div class="title__foot">${B.Data.SCHOOL.name} · ${B.Data.SCHOOL.address}<br>Неофициальная фан-игра о Белорусском республиканском союзе молодёжи</div>
        </div>`);
      s.querySelector('[data-a=play]').addEventListener('click', () => {
        B.Audio.unlock();
        B.Audio.sfx('click');
        if (Save.profile()) B.App.go('hub');
        else B.Menus.profileEditor({ closable: true, onDone: () => B.App.go('hub') });
      });
      s.querySelector('[data-a=board]').addEventListener('click', () => {
        B.Audio.sfx('click');
        B.Menus.leaderboard();
      });
      s.querySelector('[data-a=about]').addEventListener('click', () => {
        B.Audio.sfx('click');
        B.Menus.about();
      });
      const pl = s.querySelector('[data-a=players]');
      if (pl)
        pl.addEventListener('click', () => {
          B.Audio.sfx('click');
          B.Menus.players(() => this.buildUI());
        });
      s.querySelector('.title__sound').addEventListener('click', (e) => {
        B.settings.sound = !B.settings.sound;
        Save.save();
        B.applySettings();
        e.currentTarget.innerHTML = UI.icon(B.settings.sound ? 'sound' : 'mute');
        B.Audio.sfx('tap');
      });
    }
    resize(W, H) {
      this.W = W;
      this.H = H;
    }
    pointermove(p) {
      this.mx = (p.x / this.W - 0.5) * 2;
      this.my = (p.y / this.H - 0.5) * 2;
    }
    pointerdown(p) {
      // искры от касания — просто приятно
      this.particles.burst(p.x, p.y, 12, { colors: ['#F6B92B', '#fff', '#D21F2B'], shape: 'star', speedMin: 80, speedMax: 260, sizeMin: 3, sizeMax: 7, gravity: 300 });
      B.Audio.sfx('pop');
    }
    update(dt) {
      super.update(dt);
      this.cx = U.damp(this.cx || 0, this.mx, 3, dt);
      this.cy = U.damp(this.cy || 0, this.my, 3, dt);
      for (const w of this.walkers) {
        w.x += w.speed * w.dir * dt;
        if (w.x > 1.15) w.x = -0.15;
        if (w.x < -0.15) w.x = 1.15;
        w.phase += dt * 7;
      }
      for (const b of this.birds) {
        b.x += b.v * dt;
        b.ph += dt * 8;
        if (b.x > 1.1) {
          b.x = -0.1;
          b.y = 0.1 + Math.random() * 0.22;
        }
      }
      // листья / снег / лепестки
      this.leafT -= dt;
      if (this.leafT <= 0) {
        this.leafT = this.season === 'winter' ? 0.05 : 0.22;
        const cols = Art.leafColors(this.season);
        const winter = this.season === 'winter';
        this.particles.emit({
          x: Math.random() * this.W * 1.2 - this.W * 0.1, y: -20, vx: U.rand(10, 40), vy: U.rand(30, 60),
          life: 14, size: winter ? U.rand(2, 4) : U.rand(5, 9), color: U.pick(cols), shape: winter ? 'circle' : 'leaf',
          rot: Math.random() * 6, vr: U.rand(-2, 2), fade: false, shrink: false, drag: 0,
          update: (q, d) => {
            q.vx = 25 + Math.sin(q.life * 1.3 + q.size) * 40;
          },
        });
      }
    }
    render(ctx) {
      const W = this.W, H = this.H, t = this.t;
      const k = Math.min(W, H * 1.2) / 900 + 0.25;
      const horizon = H * 0.72;
      // небо
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, '#2F6FBF');
      g.addColorStop(0.55, '#8FCBEE');
      g.addColorStop(1, '#FFD9A3');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // солнце
      const sx = W * 0.5 + this.cx * -10, sy = horizon - H * 0.2;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.5);
      sg.addColorStop(0, 'rgba(255,240,190,.95)');
      sg.addColorStop(0.15, 'rgba(255,220,140,.6)');
      sg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(t * 0.03);
      ctx.fillStyle = 'rgba(255,245,210,.16)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(U.TAU / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-H * 0.06, -H * 0.9);
        ctx.lineTo(H * 0.06, -H * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#FFF4D6';
      ctx.beginPath();
      ctx.arc(sx, sy, 46 * k, 0, U.TAU);
      ctx.fill();
      // облака
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 0.27 + t * 0.006 * (1 + i * 0.2)) % 1.3) * W * 1.1 - W * 0.15 + this.cx * -6;
        Art.cloud(ctx, cx, H * (0.12 + (i % 3) * 0.09), k * (0.7 + (i % 2) * 0.4), 'rgba(255,255,255,.75)');
      }
      // птицы
      ctx.strokeStyle = 'rgba(40,40,70,.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const b of this.birds) {
        const bx = b.x * W, by = b.y * H + Math.sin(b.ph * 0.3) * 6, f = Math.sin(b.ph) * 4 * b.s;
        ctx.beginPath();
        ctx.moveTo(bx - 8 * b.s, by - f);
        ctx.quadraticCurveTo(bx - 3 * b.s, by - 2, bx, by);
        ctx.quadraticCurveTo(bx + 3 * b.s, by - 2, bx + 8 * b.s, by - f);
        ctx.stroke();
      }
      // дальний город
      const drawSky = (sp, col, scale, par, light) => {
        ctx.save();
        const off = (-(t * 4) % (sp.width * scale)) + this.cx * par;
        ctx.translate(off, horizon + 2 + this.cy * par * 0.3);
        ctx.scale(scale, scale);
        ctx.fillStyle = col;
        for (let rep = -1; rep < Math.ceil(W / (sp.width * scale)) + 1; rep++) {
          ctx.save();
          ctx.translate(rep * sp.width, 0);
          ctx.fill(sp.path);
          if (light) {
            ctx.fillStyle = light;
            ctx.fill(sp.lights);
            ctx.fillStyle = col;
          }
          ctx.restore();
        }
        ctx.restore();
      };
      drawSky(this.far, 'rgba(120,140,190,.55)', k * 1.05, -8);
      drawSky(this.mid, 'rgba(84,96,150,.75)', k * 0.8, -16, 'rgba(255,230,150,.25)');
      // земля
      const gg = ctx.createLinearGradient(0, horizon, 0, H);
      gg.addColorStop(0, '#6DB35C');
      gg.addColorStop(1, '#3E8A44');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(0, horizon + 6);
      ctx.quadraticCurveTo(W * 0.5, horizon - 10, W, horizon + 6);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      // дорожка
      ctx.fillStyle = '#E8D9BC';
      ctx.fillRect(0, H * 0.86, W, H * 0.05);
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      for (let x = (-(t * 30) % 40); x < W; x += 40) ctx.fillRect(x, H * 0.86, 2, H * 0.05);
      // деревья
      const trees = Math.ceil(W / (120 * k)) + 1;
      for (let i = 0; i < trees; i++) {
        const kind = i % 3 === 0 ? 'birch' : i % 3 === 1 ? 'maple' : 'pine';
        const sp = Art.treeSprite(kind, this.season, i + 3, 90);
        const x = i * 120 * k + 40 * k + this.cx * -22;
        Art.drawSprite(ctx, sp, x, horizon + 18 * k, k * (0.85 + (i % 2) * 0.25));
      }
      // школа
      const schS = k * 0.95;
      Art.school(ctx, W * (W > H ? 0.78 : 0.7) + this.cx * -30, H * 0.86, schS, t);
      // флаг БРСМ на большом флагштоке (на узких экранах флаги есть у школы)
      if (W > H) {
        const fx = W * 0.055 + this.cx * -36, fy = H * 0.88;
        const ph = H * 0.56;
        Art.flagpole(ctx, fx, fy, ph);
        const fw = Math.min(W * 0.17, 230), fh = fw * 0.5;
        Art.wavingFlag(ctx, 'brsm', fx + 2, fy - ph + 4, fw, fh, t, 1.3);
      }
      // прохожие-волонтёры
      for (const w of this.walkers) {
        Art.avatar(ctx, w.x * W, H * 0.905, k * 0.75, w.av, { kind: 'walk', phase: w.phase, t, flip: w.dir < 0 });
      }
      const p = Save.profile();
      if (p) Art.avatar(ctx, W * 0.5 + (W > H ? -W * 0.27 : -W * 0.18), H * 0.93, k * 1.1, p.av, { kind: 'wave', t });
      // виньетка
      const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(20,10,30,.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      this.particles.render(ctx);
    }
  }
  B.Scenes.title = TitleScene;
})(window.B);
