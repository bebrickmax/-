/* БРСМ: Команда 212 — «Знаток БРСМ»: викторина-шоу */
'use strict';

(function (B) {
  const U = B.U, Art = B.Art, UI = B.UI, Save = B.Save, D = B.Data;

  const Q_COUNT = 10, Q_TIME = 20;
  const LETTERS = ['А', 'Б', 'В', 'Г'];

  function pickQuestions() {
    const all = U.shuffle(D.QUIZ);
    const groups = {
      hero: all.filter((q) => q.cat === 'Герои' || q.cat === 'Школа'),
      world: all.filter((q) => q.cat === 'Беларусь' || q.cat === 'Экология'),
      brsm: all.filter((q) => ['БРСМ', 'Символика', 'Проекты'].includes(q.cat)),
    };
    const out = [...groups.hero.slice(0, 2), ...groups.world.slice(0, 2), ...groups.brsm.slice(0, Q_COUNT - 4)];
    return U.shuffle(out).map((q) => {
      const order = U.shuffle([0, 1, 2, 3]);
      return { q, opts: order.map((i) => q.opts[i]), correct: order.indexOf(q.a) };
    });
  }

  class QuizScene extends B.GameScene {
    get missionId() {
      return 'quiz';
    }
    constructor(p) {
      super(p);
      this.music = 'quiz';
      this.qs = pickQuestions();
      this.idx = -1;
      this.correct = 0;
      this.points = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.timeLeft = Q_TIME;
      this.phase = 'wait';
      this.used = { half: false, time: false, hall: false };
      this.marks = [];
      this.qmarks = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.2, r: Math.random() * 6, v: 0.01 + Math.random() * 0.02 }));
    }
    buildHud() {
      const root = UI.setHud(`
        <div class="hud-top">
          <div class="hud-row">
            <span class="hud-pill" data-h="points">0</span>
            <span class="hud-pill" data-h="streak"><small>серия</small><span>0</span></span>
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
    }
    start() {
      this.state = 'play';
      this.next();
    }
    next() {
      this.idx++;
      if (this.idx >= this.qs.length) {
        this.end();
        return;
      }
      const cur = this.qs[this.idx];
      this.cur = cur;
      this.timeLeft = Q_TIME;
      this.phase = 'ask';
      this.lastTick = Q_TIME;
      const tool = (id, label, icon) => `<button type="button" class="btn btn--small btn--ghost" data-tool="${id}" ${this.used[id] ? 'disabled style="opacity:.4"' : ''}>${icon}<span>${label}</span></button>`;
      const s = UI.setScreen(`
        <div class="quiz">
          <div class="quiz__card">
            <div class="quiz__meta"><span class="quiz__cat">${U.esc(cur.q.cat)}</span><span class="quiz__num">Вопрос ${this.idx + 1} из ${this.qs.length}</span></div>
            <div class="quiz__timer"><i></i></div>
            <h2 class="quiz__q">${U.esc(cur.q.q)}</h2>
          </div>
          <div class="quiz__answers">${cur.opts
            .map((o, i) => `<button type="button" class="ans" data-i="${i}"><span class="ans__k">${LETTERS[i]}</span><span class="ans__t">${U.esc(o)}</span></button>`)
            .join('')}</div>
          <div class="quiz__tools">
            ${tool('half', '50 / 50', '')}
            ${tool('time', '+10 секунд', UI.icon('retry'))}
            ${tool('hall', 'Помощь зала', UI.icon('users'))}
          </div>
        </div>`);
      this.ui = s;
      this.timerEl = s.querySelector('.quiz__timer');
      this.timerBar = s.querySelector('.quiz__timer i');
      s.querySelectorAll('.ans').forEach((b) => b.addEventListener('click', () => this.answer(+b.dataset.i)));
      s.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => this.useTool(b.dataset.tool, b)));
      B.Audio.sfx('open');
    }
    useTool(id, btn) {
      if (this.phase !== 'ask' || this.used[id]) return;
      this.used[id] = true;
      btn.disabled = true;
      btn.style.opacity = '.4';
      B.Audio.sfx('power');
      const cur = this.cur;
      const btns = [...this.ui.querySelectorAll('.ans')];
      if (id === 'half') {
        const wrong = U.shuffle([0, 1, 2, 3].filter((i) => i !== cur.correct)).slice(0, 2);
        wrong.forEach((i) => {
          btns[i].classList.add('is-hidden');
          btns[i].disabled = true;
        });
      } else if (id === 'time') {
        this.timeLeft = Math.min(Q_TIME + 10, this.timeLeft + 10);
        this.floaters.add(this.W / 2, this.H * 0.3, '+10 сек', { color: '#B9F6CA', size: 30 });
      } else if (id === 'hall') {
        const visible = [0, 1, 2, 3].filter((i) => !btns[i].classList.contains('is-hidden'));
        const pc = {};
        let rest = 100 - (pc[cur.correct] = U.randInt(46, 74));
        const others = visible.filter((i) => i !== cur.correct);
        others.forEach((i, k) => {
          const v = k === others.length - 1 ? rest : U.randInt(0, rest);
          pc[i] = v;
          rest -= v;
        });
        visible.forEach((i) => btns[i].insertAdjacentHTML('beforeend', `<span class="ans__poll">${pc[i] || 0}%</span>`));
      }
    }
    answer(i) {
      if (this.phase !== 'ask' || this.state !== 'play') return;
      this.phase = 'shown';
      const cur = this.cur;
      const btns = [...this.ui.querySelectorAll('.ans')];
      btns.forEach((b) => (b.disabled = true));
      const ok = i === cur.correct;
      if (i >= 0) btns[i].classList.add(ok ? 'is-correct' : 'is-wrong');
      btns[cur.correct].classList.add('is-correct');
      let gained = 0;
      if (ok) {
        this.correct++;
        this.streak++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        gained = 100 + Math.round(this.timeLeft * 5) + (this.streak - 1) * 20;
        this.points += gained;
        B.Audio.sfx('correct', this.streak);
        const r = btns[i].getBoundingClientRect();
        this.particles.burst(r.left + r.width / 2, r.top + r.height / 2, 24, { colors: ['#3DDC84', '#FFE08A', '#fff'], shape: 'star', speedMin: 120, speedMax: 340, gravity: 400 });
      } else {
        this.streak = 0;
        B.Audio.sfx('wrong');
        this.shake.add(0.3);
        this.flash = 0.2;
      }
      this.marks.push(ok);
      this.h.points.textContent = U.fmt(this.points);
      this.h.streak.querySelector('span').textContent = this.streak;
      const head = ok ? `Верно! +${gained}` : i < 0 ? 'Время вышло' : 'Неверно';
      const last = this.idx === this.qs.length - 1;
      const ex = UI.el(`<div class="quiz__ex"><p><b>${head}.</b> ${U.esc(cur.q.ex)}</p><button type="button" class="btn btn--gold">${last ? 'Итоги' : 'Далее'}${UI.icon('arrow')}</button></div>`);
      this.ui.querySelector('.quiz__tools').replaceWith(ex);
      const nb = ex.querySelector('button');
      nb.addEventListener('click', () => {
        B.Audio.sfx('click');
        this.next();
      });
      if (!U.isTouch()) setTimeout(() => nb.focus({ preventScroll: true }), 50);
    }
    keydown(e) {
      if (super.keydown(e)) return;
      if (this.state !== 'play') return;
      if (this.phase === 'ask') {
        let i = ['1', '2', '3', '4'].indexOf(e.key);
        if (i < 0) i = ['а', 'б', 'в', 'г', 'a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase()) % 4;
        if (i >= 0 && !this.ui.querySelectorAll('.ans')[i].disabled) this.answer(i);
      } else if (this.phase === 'shown' && (e.key === 'Enter' || e.key === ' ')) {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
        e.preventDefault();
        this.next();
      }
    }
    end() {
      this.phase = 'done';
      UI.clearScreen();
      if (this.correct === Q_COUNT) Save.awardBadge('erudite');
      this.finish({
        score: this.correct,
        stars: this.starsFor(this.correct),
        boardScore: this.points,
        boardLabel: `${this.correct} из ${Q_COUNT}`,
        scoreLabel: 'правильных из 10',
        title: this.correct === Q_COUNT ? 'Настоящий знаток!' : null,
        delay: 300,
        lines: [
          ['Очки', U.fmt(this.points)],
          ['Лучшая серия', String(this.bestStreak)],
          ['Подсказок', String(Object.values(this.used).filter(Boolean).length)],
        ],
      });
    }
    update(dt) {
      super.update(dt);
      for (const q of this.qmarks) {
        q.y -= q.v * dt;
        q.r += dt * 0.3;
        if (q.y < -0.1) {
          q.y = 1.1;
          q.x = Math.random();
        }
      }
      if (this.state !== 'play' || this.phase !== 'ask') return;
      this.timeLeft -= dt;
      const p = U.clamp(this.timeLeft / Q_TIME, 0, 1);
      if (this.timerBar) this.timerBar.style.transform = `scaleX(${p})`;
      if (this.timerEl) this.timerEl.classList.toggle('is-low', this.timeLeft <= 5);
      if (this.timeLeft <= 5 && Math.ceil(this.timeLeft) < this.lastTick) {
        this.lastTick = Math.ceil(this.timeLeft);
        B.Audio.sfx('tick');
      }
      if (this.timeLeft <= 0) this.answer(-1);
    }
    render(ctx) {
      const W = this.W, H = this.H, t = this.t;
      const g = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      g.addColorStop(0, '#2A4FA0');
      g.addColorStop(0.6, '#14275C');
      g.addColorStop(1, '#0A1433');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(this.shake.x, this.shake.y);
      // прожекторы студии
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x = W * (0.15 + i * 0.23);
        const a = Math.sin(t * 0.6 + i * 1.7) * 0.35;
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, 'rgba(160,200,255,.22)');
        bg.addColorStop(1, 'rgba(160,200,255,0)');
        ctx.save();
        ctx.translate(x, -20);
        ctx.rotate(a);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(H * 0.25, H);
        ctx.lineTo(-H * 0.25, H);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      // плавающие вопросительные знаки
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const q of this.qmarks) {
        ctx.save();
        ctx.translate(q.x * W, q.y * H);
        ctx.rotate(Math.sin(q.r) * 0.4);
        ctx.font = `900 ${40 * q.s}px ${B.FONT_DISPLAY}`;
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        ctx.fillText('?', 0, 0);
        ctx.restore();
      }
      // подиум с орнаментом
      const by = H - 26;
      ctx.fillStyle = '#C8202C';
      ctx.fillRect(0, by, W, 26);
      if (!this.orn) this.orn = Art.ornamentStrip(2, '#FFE08A');
      for (let x = 0; x < W; x += this.orn.width * 0.6) ctx.drawImage(this.orn, x, by + 2, this.orn.width * 0.6, this.orn.height * 0.6);
      // прогресс ответов — огоньки
      const n = this.qs.length;
      const dw = Math.min(26, (W - 40) / n);
      for (let i = 0; i < n; i++) {
        const x = W / 2 + (i - (n - 1) / 2) * dw;
        const m = this.marks[i];
        ctx.fillStyle = m === true ? '#3DDC84' : m === false ? '#FF5252' : i === this.idx ? '#FFE08A' : 'rgba(255,255,255,.2)';
        ctx.beginPath();
        ctx.arc(x, by - 14, i === this.idx ? 6 : 5, 0, U.TAU);
        ctx.fill();
      }
      this.particles.render(ctx);
      this.floaters.render(ctx);
      ctx.restore();
      if (this.flash > 0) {
        this.flash -= 1 / 60;
        ctx.fillStyle = `rgba(255,60,60,${Math.max(0, this.flash)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  B.Scenes.quiz = QuizScene;
})(window.B);
