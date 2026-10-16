/* БРСМ: Команда 212 — «Улица героя»: история В. Е. Лобанка и возложение цветов */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save, D = B.Data;

  class MemorialScene extends B.Scene {
    constructor(p) {
      super(p);
      this.music = 'memorial';
      this.season = Art.season();
      this.ch = 0;
      this.flowers = [];
      this.placed = 0;
      this.phase = 'story';
      this.av = (Save.profile() || {}).av || Art.randomAvatar();
      this.flameT = 0;
      // уже лежащие цветы
      const rnd = U.rng(19);
      this.baseFlowers = Array.from({ length: Save.hasBadge('memory') ? 9 : 4 }, () => ({ dx: (rnd() - 0.5) * 1.6, col: U.pick(['#E8384F', '#F6B92B', '#FFFFFF', '#C2185B']), r: rnd() * 6 }));
    }
    enter() {
      B.Audio.playMusic('memorial');
      const root = UI.setHud(`
        <div class="hud-top">
          <button type="button" class="hud-btn" data-a="back" aria-label="На карту">${UI.icon('map')}</button>
          <span class="hud-pill"><small>улица героя</small></span>
        </div>`);
      root.querySelector('[data-a=back]').addEventListener('click', () => {
        B.Audio.sfx('back');
        B.App.go('hub', { from: 'memorial' });
      });
      this.renderCard();
    }
    renderCard() {
      const H = D.HERO;
      const last = this.ch >= H.chapters.length - 1;
      if (this.phase === 'story') {
        const c = H.chapters[this.ch];
        const s = UI.setScreen(`
          <div class="memo" role="region" aria-label="История героя">
            <div class="memo__year">${U.esc(c.year)}</div>
            <h2 class="memo__title">${U.esc(c.title)}</h2>
            <p class="memo__text">${U.esc(c.text)}</p>
            <div class="memo__nav">
              <div class="memo__dots">${H.chapters.map((_, i) => `<i class="${i === this.ch ? 'is-on' : ''}"></i>`).join('')}</div>
              <div class="memo__btns">
                ${this.ch > 0 ? `<button type="button" class="btn btn--small btn--ghost" data-a="prev">${UI.icon('back')}<span>Назад</span></button>` : ''}
                <button type="button" class="btn btn--small btn--${last ? 'gold' : 'primary'}" data-a="next">${last ? UI.icon('flame') + '<span>Возложить цветы</span>' : '<span>Дальше</span>' + UI.icon('arrow')}</button>
              </div>
            </div>
          </div>`);
        const nb = s.querySelector('[data-a=next]');
        nb.addEventListener('click', () => {
          B.Audio.sfx('click');
          if (last) {
            this.phase = 'flowers';
            this.renderCard();
          } else {
            this.ch++;
            this.renderCard();
          }
        });
        const pb = s.querySelector('[data-a=prev]');
        if (pb)
          pb.addEventListener('click', () => {
            B.Audio.sfx('back');
            this.ch--;
            this.renderCard();
          });
      } else {
        const done = this.placed >= 3;
        const s = UI.setScreen(`
          <div class="memo" role="region" aria-label="Возложение цветов">
            <div class="memo__year">Цветы Великой Победы</div>
            <h2 class="memo__title">${done ? 'Мы помним. Мы гордимся.' : 'Возложи цветы к памятнику'}</h2>
            <p class="memo__text">${done ? 'Спасибо! Память о героях живёт, пока мы о ней рассказываем. Расскажи историю В. Е. Лобанка друзьям.' : `Нажимай на кнопку или на экран, чтобы положить цветок. Возложено: <b>${this.placed}</b> из 3.`}</p>
            <div class="memo__nav">
              <div class="memo__dots">${[0, 1, 2].map((i) => `<i class="${i < this.placed ? 'is-on' : ''}"></i>`).join('')}</div>
              <div class="memo__btns">
                ${done ? `<button type="button" class="btn btn--small btn--primary" data-a="map">${UI.icon('map')}<span>На карту</span></button>` : `<button type="button" class="btn btn--small btn--gold" data-a="flower">${UI.icon('heart')}<span>Положить цветок</span></button>`}
              </div>
            </div>
          </div>`);
        const fb = s.querySelector('[data-a=flower]');
        if (fb) fb.addEventListener('click', () => this.placeFlower());
        const mb = s.querySelector('[data-a=map]');
        if (mb)
          mb.addEventListener('click', () => {
            B.Audio.sfx('click');
            B.App.go('hub', { from: 'memorial' });
          });
      }
    }
    placeFlower(x) {
      if (this.phase !== 'flowers') return;
      const tx = this.W / 2 + U.rand(-0.7, 0.7) * this.S * 0.9;
      this.flowers.push({
        fx: x != null ? x : this.W / 2 + U.rand(-60, 60), fy: this.H + 20, tx, ty: this.baseY - 4 + U.rand(-3, 3), t: 0,
        col: U.pick(['#E8384F', '#C2185B', '#F6B92B', '#FFFFFF']), r: U.rand(-0.5, 0.5),
      });
      B.Audio.sfx('flower');
      this.placed++;
      if (this.placed === 3) {
        setTimeout(() => {
          Save.awardBadge('memory');
          this.particles.burst(this.W / 2, this.baseY - this.S * 1.2, 30, { colors: ['#FFE08A', '#FFFFFF'], shape: 'star', speedMin: 40, speedMax: 160, gravity: -20, lifeMin: 1, lifeMax: 2 });
        }, 700);
      }
      if (this.placed <= 3) this.renderCard();
    }
    pointerdown(p) {
      if (this.phase === 'flowers' && p.y < this.H * 0.6) this.placeFlower(p.x);
    }
    keydown(e) {
      if (e.key === 'Escape') B.App.go('hub', { from: 'memorial' });
    }
    resize(W, H) {
      this.W = W;
      this.H = H;
      const cardH = Math.min(320, H * 0.42);
      this.baseY = H - cardH - Math.max(24, H * 0.04);
      this.S = U.clamp(Math.min(W * 0.32, (this.baseY - 70) / 2.6), 60, 230);
    }
    update(dt) {
      super.update(dt);
      for (const f of this.flowers) f.t = Math.min(1, f.t + dt / 0.9);
      // огонь
      if (Math.random() < dt * 40) {
        const fx = this.W / 2, fy = this.baseY - this.S * 0.04;
        this.particles.emit({
          x: fx + U.rand(-this.S * 0.06, this.S * 0.06), y: fy, vx: U.rand(-10, 10), vy: -U.rand(40, 90), life: U.rand(0.4, 0.8),
          size: U.rand(3, 6), color: U.pick(['#FFB300', '#FF7043', '#FFE082']), drag: 1,
        });
      }
      if (Math.random() < dt * (this.season === 'winter' ? 10 : 1.5)) {
        const winter = this.season === 'winter';
        this.particles.emit({
          x: Math.random() * this.W, y: -10, vx: U.rand(5, 20), vy: U.rand(20, 40), life: 20, size: winter ? 2.5 : U.rand(4, 7),
          color: winter ? '#fff' : U.pick(Art.leafColors(this.season)), shape: winter ? 'circle' : 'leaf', fade: false, shrink: false, drag: 0, vr: U.rand(-1.5, 1.5),
        });
      }
    }
    render(ctx) {
      const W = this.W, H = this.H, S = this.S, t = this.t, by = this.baseY;
      // вечернее небо
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1B1F4A');
      g.addColorStop(0.45, '#5B3E73');
      g.addColorStop(0.75, '#E07A5F');
      g.addColorStop(1, '#F2B880');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const rnd = U.rng(4);
      for (let i = 0; i < 60; i++) {
        const x = rnd() * W, y = rnd() * H * 0.4;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      // земля
      ctx.fillStyle = this.season === 'winter' ? '#D6DEE8' : '#3F5E3A';
      ctx.fillRect(0, by, W, H - by);
      ctx.fillStyle = '#9A948B';
      ctx.beginPath();
      ctx.ellipse(W / 2, by + 6, S * 1.3, S * 0.18, 0, 0, U.TAU);
      ctx.fill();
      // берёзы
      const sea = this.season;
      [[-1.25, 3, 1.25], [1.3, 8, 1.15], [-2.1, 12, 1.0], [2.2, 15, 1.05]].forEach(([dx, seed, sc]) => {
        Art.drawSprite(ctx, Art.treeSprite('birch', sea, seed, 90), W / 2 + dx * S, by + 4, (S / 70) * sc);
      });
      // стела
      ctx.fillStyle = '#8F8A82';
      ctx.fillRect(W / 2 - S * 0.5, by - S * 0.16, S, S * 0.16);
      ctx.fillStyle = '#A9A39B';
      ctx.fillRect(W / 2 - S * 0.38, by - S * 0.3, S * 0.76, S * 0.15);
      const sg = ctx.createLinearGradient(W / 2 - S * 0.2, 0, W / 2 + S * 0.2, 0);
      sg.addColorStop(0, '#B8B2A9');
      sg.addColorStop(0.5, '#D6D0C6');
      sg.addColorStop(1, '#9D978E');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(W / 2 - S * 0.2, by - S * 0.3);
      ctx.lineTo(W / 2 - S * 0.09, by - S * 2.2);
      ctx.lineTo(W / 2 + S * 0.09, by - S * 2.2);
      ctx.lineTo(W / 2 + S * 0.2, by - S * 0.3);
      ctx.closePath();
      ctx.fill();
      // звезда
      const glow = 0.6 + Math.sin(t * 2) * 0.2;
      ctx.fillStyle = `rgba(255,120,100,${glow * 0.3})`;
      ctx.beginPath();
      ctx.arc(W / 2, by - S * 2.36, S * 0.22, 0, U.TAU);
      ctx.fill();
      Art.star(ctx, W / 2, by - S * 2.36, S * 0.15, S * 0.065);
      ctx.fillStyle = '#D21F2B';
      ctx.fill();
      // гранитная плита с именем героя
      {
        const pw = S * 0.78, ph = S * 0.44;
        const px = W / 2 - S * 1.02 - pw / 2, py = by - ph + S * 0.04;
        ctx.save();
        ctx.translate(px + pw / 2, py + ph / 2);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.ellipse(0, ph / 2, pw * 0.55, S * 0.05, 0, 0, U.TAU);
        ctx.fill();
        const pg = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
        pg.addColorStop(0, '#3A3634');
        pg.addColorStop(1, '#1F1C1B');
        ctx.fillStyle = pg;
        U.rr(ctx, -pw / 2, -ph / 2, pw, ph, S * 0.03);
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,198,122,.6)';
        ctx.lineWidth = 1.5;
        U.rr(ctx, -pw / 2 + 5, -ph / 2 + 5, pw - 10, ph - 10, S * 0.02);
        ctx.stroke();
        ctx.fillStyle = '#E6C67A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fs = Math.max(9, S * 0.072);
        ctx.font = `800 ${fs}px ${B.FONT_BODY}`;
        while (ctx.measureText('ВЛАДИМИР ЕЛИСЕЕВИЧ').width > pw * 0.88 && fs > 7) {
          fs -= 0.5;
          ctx.font = `800 ${fs}px ${B.FONT_BODY}`;
        }
        ctx.fillText('ВЛАДИМИР ЕЛИСЕЕВИЧ', 0, -ph * 0.22);
        ctx.font = `900 ${fs * 1.35}px ${B.FONT_DISPLAY}`;
        ctx.fillText('ЛОБАНОК', 0, ph * 0.02);
        ctx.font = `600 ${fs * 0.85}px ${B.FONT_BODY}`;
        ctx.fillText('Герой Советского Союза', 0, ph * 0.26);
        ctx.restore();
      }
      // чаша вечного огня
      ctx.fillStyle = '#4A453F';
      ctx.beginPath();
      ctx.ellipse(W / 2, by - S * 0.02, S * 0.16, S * 0.04, 0, 0, U.TAU);
      ctx.fill();
      const fl = 1 + Math.sin(t * 12) * 0.12;
      ctx.fillStyle = 'rgba(255,170,60,.35)';
      ctx.beginPath();
      ctx.ellipse(W / 2, by - S * 0.12, S * 0.18, S * 0.18 * fl, 0, 0, U.TAU);
      ctx.fill();
      // цветы у подножия
      for (const f of this.baseFlowers) this.drawFlower(ctx, W / 2 + f.dx * S * 0.6, by - 2, f.col, f.r, S);
      for (const f of this.flowers) {
        const k = U.ease.outCubic(f.t);
        const x = U.lerp(f.fx, f.tx, k), y = U.lerp(f.fy, f.ty, k) - Math.sin(k * Math.PI) * S * 0.8;
        this.drawFlower(ctx, x, y, f.col, f.r + (1 - k) * 4, S);
      }
      // персонаж стоит у памятника
      Art.avatar(ctx, W / 2 + S * 0.85, by + 10, S / 95, Object.assign({}, this.av, { flowers: this.phase === 'flowers' && this.placed < 3 }), { kind: 'idle', t, flip: true });
      this.particles.render(ctx);
      this.floaters.render(ctx);
    }
    drawFlower(ctx, x, y, col, rot, S) {
      const s = S / 110;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot * 0.3);
      ctx.strokeStyle = '#2F7D32';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-12 * s, -4 * s);
      ctx.stroke();
      ctx.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const a = (i * U.TAU) / 5;
        ctx.beginPath();
        ctx.arc(-14 * s + Math.cos(a) * 4 * s, -5 * s + Math.sin(a) * 4 * s, 3.4 * s, 0, U.TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#F6B92B';
      ctx.beginPath();
      ctx.arc(-14 * s, -5 * s, 2.2 * s, 0, U.TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  B.Scenes.memorial = MemorialScene;
})(window.B);
