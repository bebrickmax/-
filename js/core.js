/* БРСМ: Команда 212 — ядро: сохранения, цикл игры, сцены, переходы, результаты */
'use strict';

(function (B) {
  const U = B.U;
  const D = B.Data;

  // =====================================================================
  // Сохранения (на этом устройстве)
  // =====================================================================
  const KEY = 'brsm212.save.v1';
  const Save = (B.Save = {
    data: null,
    load() {
      const d = U.store.get(KEY, null);
      this.data = d && d.v === 1 ? d : { v: 1, settings: {}, current: null, profiles: {}, board: {} };
      this.data.settings = Object.assign({ sound: true, music: true, reduceMotion: false }, this.data.settings);
      B.settings = this.data.settings;
      return this.data;
    },
    save() {
      U.store.set(KEY, this.data);
    },
    profile() {
      return this.data.profiles[this.data.current] || null;
    },
    profiles() {
      return Object.values(this.data.profiles).sort((a, b) => (b.last || 0) - (a.last || 0));
    },
    createProfile(name, av) {
      const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const p = { id, name, av, created: Date.now(), last: Date.now(), games: {}, badges: {}, seen: {} };
      this.data.profiles[id] = p;
      this.data.current = id;
      this.save();
      return p;
    },
    switchProfile(id) {
      if (this.data.profiles[id]) {
        this.data.current = id;
        this.data.profiles[id].last = Date.now();
        this.save();
      }
    },
    deleteProfile(id) {
      delete this.data.profiles[id];
      for (const g in this.data.board) this.data.board[g] = this.data.board[g].filter((e) => e.pid !== id);
      if (this.data.current === id) this.data.current = (this.profiles()[0] || {}).id || null;
      this.save();
    },
    game(id, p = this.profile()) {
      if (!p) return { best: 0, stars: 0, plays: 0 };
      if (!p.games[id]) p.games[id] = { best: 0, stars: 0, plays: 0 };
      return p.games[id];
    },
    totalStars(p = this.profile()) {
      if (!p) return 0;
      return D.MISSIONS.reduce((s, m) => s + ((p.games[m.id] && p.games[m.id].stars) || 0), 0);
    },
    hasBadge(id, p = this.profile()) {
      return !!(p && p.badges[id]);
    },
    // Возвращает значок, если он новый (и сразу показывает тост)
    awardBadge(id, quiet) {
      const p = this.profile();
      if (!p || p.badges[id]) return null;
      p.badges[id] = Date.now();
      this.save();
      const b = D.badgeById(id);
      if (b && !quiet) B.UI.badgeToast(b);
      return b;
    },
    recordResult(gameId, res) {
      const p = this.profile();
      if (!p) return {};
      const g = this.game(gameId, p);
      const before = this.totalStars(p);
      const rankBefore = D.rankFor(before).index;
      g.plays++;
      const prevBest = g.best;
      const newBest = res.score > g.best;
      if (newBest) g.best = res.score;
      const prevStars = g.stars;
      g.stars = Math.max(g.stars, res.stars);
      p.last = Date.now();
      const after = this.totalStars(p);
      // таблица рекордов
      const board = (this.data.board[gameId] = this.data.board[gameId] || []);
      board.push({ pid: p.id, name: p.name, score: res.boardScore != null ? res.boardScore : res.score, label: res.boardLabel || '', date: Date.now() });
      board.sort((a, b) => b.score - a.score);
      this.data.board[gameId] = board.slice(0, 12);
      // общие значки
      const newBadges = [];
      const award = (id) => {
        const b = this.awardBadge(id, true);
        if (b) newBadges.push(b);
      };
      award('first');
      if (D.MISSIONS.every((m) => p.games[m.id] && p.games[m.id].plays > 0)) award('team');
      if (after >= 15) award('all_stars');
      this.save();
      return {
        newBest, prevBest, starsBefore: prevStars, starsTotal: after, totalBefore: before,
        rankUp: D.rankFor(after).index > rankBefore ? D.rankFor(after).rank : null, newBadges,
      };
    },
    resetProfile() {
      const p = this.profile();
      if (!p) return;
      p.games = {};
      p.badges = {};
      p.seen = {};
      for (const g in this.data.board) this.data.board[g] = this.data.board[g].filter((e) => e.pid !== p.id);
      this.save();
    },
  });

  // =====================================================================
  // Базовая сцена
  // =====================================================================
  class Scene {
    constructor(params) {
      this.params = params || {};
      this.t = 0;
      this.particles = new U.Particles();
      this.floaters = new U.Floaters();
      this.shake = new U.Shaker();
      this.tweens = new U.Tweens();
    }
    enter() {}
    exit() {}
    resize() {}
    update(dt) {
      this.t += dt;
      this.particles.update(dt);
      this.floaters.update(dt);
      this.tweens.update(dt);
      this.shake.update(dt, this.t);
    }
    render() {}
    pointerdown() {}
    pointermove() {}
    pointerup() {}
    keydown() {}
    keyup() {}
    onBlur() {}
  }
  B.Scene = Scene;
  B.Scenes = {};

  // =====================================================================
  // Приложение
  // =====================================================================
  const App = (B.App = {
    W: 0, H: 0, dpr: 1, t: 0, scene: null, sceneName: '', trans: null, paused: false, last: 0,

    init() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.wipe = document.getElementById('wipe');
      this.wctx = this.wipe.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));

      const pt = (e) => ({ x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType, e });
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => {
        B.Audio.unlock();
        if (this.trans || UI.modalOpen()) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
        if (this.scene && !this.paused) this.scene.pointerdown(pt(e));
        e.preventDefault();
      });
      c.addEventListener('pointermove', (e) => {
        if (this.scene && !this.trans && !this.paused) this.scene.pointermove(pt(e));
      });
      const up = (e) => {
        if (this.scene && !this.trans) this.scene.pointerup(pt(e));
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('contextmenu', (e) => e.preventDefault());

      window.addEventListener('keydown', (e) => {
        B.Audio.unlock();
        if (UI.handleKey(e)) {
          e.preventDefault();
          return;
        }
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (UI.modalOpen()) return;
        if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
          // кнопки HUD не должны «съедать» прыжок; остальные кнопки срабатывают как обычно
          if (e.target.closest('#hud')) e.target.blur();
          else return;
        }
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
        if (this.scene && !this.trans && !this.paused) this.scene.keydown(e);
      });
      window.addEventListener('keyup', (e) => {
        if (this.scene && !this.trans) this.scene.keyup(e);
      });
      window.addEventListener('pointerdown', () => B.Audio.unlock(), { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.scene) this.scene.onBlur();
      });
      window.addEventListener('blur', () => this.scene && this.scene.onBlur());

      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    },

    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth, H = window.innerHeight;
      this.W = W;
      this.H = H;
      for (const cv of [this.canvas, this.wipe]) {
        cv.width = Math.round(W * this.dpr);
        cv.height = Math.round(H * this.dpr);
        cv.style.width = W + 'px';
        cv.style.height = H + 'px';
      }
      document.documentElement.style.setProperty('--vh', H / 100 + 'px');
      if (this.scene) this.scene.resize(W, H);
    },

    go(name, params, opts = {}) {
      const doSwap = () => {
        UI.closeAll();
        UI.clearHud();
        UI.clearScreen();
        this.paused = false;
        if (this.scene) this.scene.exit();
        const S = B.Scenes[name];
        this.scene = new S(params);
        this.sceneName = name;
        this.scene.resize(this.W, this.H);
        this.scene.enter();
      };
      if (opts.instant || !this.scene) {
        doSwap();
        return;
      }
      if (this.trans) return;
      B.Audio.sfx('whoosh');
      this.trans = { p: 0, phase: 'in', swap: doSwap };
    },

    loop(ts) {
      const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
      this.last = ts;
      this.t += dt;
      const ctx = this.ctx;
      try {
        if (this.scene && !this.paused) this.scene.update(dt);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        if (this.scene) this.scene.render(ctx);
      } catch (err) {
        console.error(err);
      }
      this.renderWipe(dt);
      requestAnimationFrame((t) => this.loop(t));
    },

    // Переход «ромбы-вышиванка»
    renderWipe(dt) {
      const ctx = this.wctx;
      const tr = this.trans;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      if (!tr) {
        this.wipe.style.display = 'none';
        return;
      }
      this.wipe.style.display = 'block';
      tr.p += dt / 0.42;
      if (tr.phase === 'in' && tr.p >= 1) {
        tr.swap();
        tr.phase = 'out';
        tr.p = 0;
      } else if (tr.phase === 'out' && tr.p >= 1) {
        this.trans = null;
        ctx.clearRect(0, 0, this.W, this.H);
        this.wipe.style.display = 'none';
        return;
      }
      const W = this.W, H = this.H;
      const cell = Math.max(48, Math.min(W, H) / 7);
      const p = tr.phase === 'in' ? tr.p : 1 - tr.p;
      for (let y = -cell; y < H + cell; y += cell) {
        for (let x = -cell; x < W + cell; x += cell) {
          const ox = (Math.round(y / cell) % 2) * (cell / 2);
          const delay = ((x + ox) / W + y / H) * 0.35;
          const k = U.clamp((p * 1.7 - delay) / 0.9, 0, 1);
          if (k <= 0) continue;
          const s = U.ease.inOutCubic(k) * cell * 1.02;
          ctx.fillStyle = (Math.round(x / cell) + Math.round(y / cell)) % 3 === 0 ? '#0E8A4E' : '#C8202C';
          B.Art.diamond(ctx, x + ox, y, s, s);
          ctx.fill();
        }
      }
    },
  });

  const UI = B.UI;

  // =====================================================================
  // Игровая сцена: брифинг → отсчёт → игра → пауза → результат
  // =====================================================================
  class GameScene extends Scene {
    constructor(params) {
      super(params);
      this.state = 'intro';
      this.mission = D.missionById(this.missionId);
    }
    get missionId() {
      return '';
    }
    enter() {
      B.Audio.playMusic(this.music || 'menu');
      this.buildHud();
      if (this.params.skipBrief) this.beginCountdown();
      else this.showBriefing();
    }
    exit() {
      if (this._cdTimer) clearTimeout(this._cdTimer);
    }
    buildHud() {}
    hudPauseButton() {
      return `<button type="button" class="hud-btn hud-pause" aria-label="Пауза">${UI.icon('pause')}</button>`;
    }
    bindPause(root) {
      const b = root.querySelector('.hud-pause');
      if (b)
        b.addEventListener('click', () => {
          B.Audio.sfx('click');
          this.pause();
        });
    }
    briefExtra() {
      return '';
    }
    showBriefing() {
      const m = this.mission;
      const g = Save.game(m.id);
      const controls = m.controls.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('');
      const best = g.plays
        ? `<div class="brief__best"><span>Твой рекорд</span><b>${U.fmt(g.best)} ${m.scoreLabel}</b>${UI.starsHtml(g.stars)}</div>`
        : `<div class="brief__best"><span>Цели</span><b>${m.stars.map((s, i) => `${'★'.repeat(i + 1)} ${U.fmt(s)}`).join(' · ')}</b></div>`;
      UI.modal({
        eyebrow: m.tag,
        title: m.title,
        cls: 'modal--brief',
        closable: false,
        body: `
          <p class="lead">${m.brief}</p>
          ${this.briefExtra()}
          <ul class="controls">${controls}</ul>
          ${best}
          <div class="fact"><div class="fact__label">А ты знал?</div><p>${m.fact}</p></div>`,
        actions: [
          { label: 'На карту', kind: 'ghost', icon: 'map', onClick: () => App.go('hub', { from: this.missionId }) },
          { label: 'Старт', kind: 'primary', icon: 'play', onClick: () => this.onBriefStart() },
        ],
        onKey: (e, h) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            h.close(true);
            this.onBriefStart();
            return true;
          }
          return false;
        },
      });
    }
    onBriefStart() {
      this.beginCountdown();
    }
    beginCountdown(cb) {
      this.state = 'countdown';
      const hud = UI.hud();
      const el = UI.el('<div class="countdown" aria-live="assertive"></div>');
      hud.appendChild(el);
      let n = 3;
      const step = () => {
        if (this.state !== 'countdown') {
          el.remove();
          return;
        }
        el.innerHTML = `<span class="countdown__n ${n === 0 ? 'is-go' : ''}">${n === 0 ? 'Вперёд!' : n}</span>`;
        B.Audio.sfx(n === 0 ? 'go' : 'count');
        if (n === 0) {
          this._cdTimer = setTimeout(() => el.remove(), 650);
          this.state = 'play';
          (cb || (() => this.start()))();
          // вкладку свернули во время отсчёта — сразу ставим на паузу
          if (document.hidden) this.pause();
          return;
        }
        n--;
        this._cdTimer = setTimeout(step, 620);
      };
      step();
    }
    start() {}
    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused';
      App.paused = true;
      this.onPause();
      UI.modal({
        title: 'Пауза',
        eyebrow: this.mission.title,
        cls: 'modal--pause',
        closable: false,
        body: `<p class="lead">Отдышись — команда подождёт.</p>`,
        actions: [
          { label: 'На карту', kind: 'ghost', icon: 'map', onClick: () => { this.resumeState(); App.go('hub', { from: this.missionId }); } },
          { label: 'Заново', kind: 'gold', icon: 'retry', onClick: () => { this.resumeState(); App.go(this.missionId, { skipBrief: true }); } },
          { label: 'Продолжить', kind: 'primary', icon: 'play', onClick: () => this.resume() },
        ],
        onKey: (e, h) => {
          if (e.key === 'Escape' || e.key === 'p' || e.key === 'з' || e.key === 'Enter') {
            e.preventDefault();
            h.close(true);
            this.resume();
            return true;
          }
          return false;
        },
      });
    }
    resumeState() {
      App.paused = false;
      this.onResume();
    }
    resume() {
      if (this.state !== 'paused') return;
      App.paused = false;
      this.state = 'play';
      this.onResume();
    }
    onPause() {}
    onResume() {}
    onBlur() {
      if (this.state === 'play') this.pause();
    }
    keydown(e) {
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'з') && this.state === 'play') {
        this.pause();
        return true;
      }
      return false;
    }
    // res: { score, stars, lines: [[label, value]], title, boardScore, boardLabel }
    finish(res) {
      if (this.state === 'over') return;
      this.state = 'over';
      const rec = Save.recordResult(this.missionId, res);
      setTimeout(() => B.showResults(this.mission, res, rec, () => App.go(this.missionId, { skipBrief: true })), res.delay != null ? res.delay : 900);
    }
    starsFor(score) {
      const th = this.mission.stars;
      return score >= th[2] ? 3 : score >= th[1] ? 2 : score >= th[0] ? 1 : 0;
    }
  }
  B.GameScene = GameScene;

  // Поделиться: системное меню телефона или копирование текста
  B.share = function (text, url) {
    const full = url ? text + ' ' + url : text;
    if (navigator.share && U.isTouch()) {
      navigator.share({ title: 'БРСМ: Команда 212', text, url: url || undefined }).catch(() => {});
      return;
    }
    const done = () => UI.toast('Текст скопирован — вставь его в чат класса!');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = full;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {
        UI.toast('Не удалось скопировать. Сделай скриншот!');
      }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(done, fallback);
    else fallback();
  };

  // =====================================================================
  // Окно результатов
  // =====================================================================
  B.showResults = function (mission, res, rec, onRetry) {
    const stars = res.stars;
    const titles = ['Неплохое начало!', 'Хороший результат!', 'Отличная работа!', 'Великолепно!'];
    const lines = (res.lines || []).map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('');
    const extra = [];
    if (rec.rankUp) extra.push(`<div class="result__rank">${UI.icon('medal')}<div><div class="toast__eyebrow">Новое звание</div><b>${U.esc(rec.rankUp.title)}</b></div></div>`);
    if (rec.newBadges && rec.newBadges.length)
      extra.push(
        `<div class="result__badges">${rec.newBadges
          .map((b) => `<div class="result__badge"><img src="${B.Art.badgeImage(b, true, 56)}" alt=""><span>${U.esc(b.title)}</span></div>`)
          .join('')}</div>`
      );
    const next = mission.stars[stars] != null ? `<p class="result__next">До следующей звезды: <b>${U.fmt(mission.stars[stars])} ${mission.scoreLabel}</b></p>` : '<p class="result__next">Все звёзды миссии собраны!</p>';
    const h = UI.modal({
      eyebrow: mission.title,
      title: res.title || titles[stars],
      cls: 'modal--result',
      closable: false,
      body: `
        <div class="result__score">
          <div class="result__num" data-to="${res.score}">0</div>
          <div class="result__label">${res.scoreLabel || mission.scoreLabel}</div>
          ${rec.newBest && rec.prevBest > 0 ? '<div class="result__record">Новый рекорд!</div>' : ''}
        </div>
        <div class="result__stars">${UI.starsHtml(0)}</div>
        ${next}
        ${lines ? `<ul class="result__lines">${lines}</ul>` : ''}
        ${extra.join('')}
        <div class="result__share"><button type="button" class="btn btn--small btn--ghost" data-share>${UI.icon('arrow')}<span>Поделиться результатом</span></button></div>`,
      actions: [
        { label: 'На карту', kind: 'ghost', icon: 'map', onClick: () => App.go('hub', { from: mission.id }) },
        { label: 'Ещё раз', kind: 'primary', icon: 'retry', onClick: onRetry },
      ],
      onKey: (e, hh) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hh.close(true);
          onRetry();
          return true;
        }
        return false;
      },
    });
    h.el.querySelector('[data-share]').addEventListener('click', () => {
      B.Audio.sfx('click');
      const p = Save.profile();
      const text = `${p ? p.name + ': ' : ''}«${mission.title}» — ${U.fmt(res.score)} ${res.scoreLabel || mission.scoreLabel} ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}. Игра «БРСМ: Команда 212» для СШ №212 г. Минска`;
      const url = /^https?:/.test(location.href) ? location.href.split('#')[0] : '';
      B.share(text, url);
    });
    // анимация счёта и звёзд
    const num = h.el.querySelector('.result__num');
    const to = res.score;
    const t0 = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      num.textContent = U.fmt(to * U.ease.outCubic(p));
      if (p < 1 && !h.closed) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const starEls = h.el.querySelectorAll('.result__stars .star');
    for (let i = 0; i < stars; i++) {
      setTimeout(() => {
        if (h.closed) return;
        starEls[i].classList.add('is-on', 'is-pop');
        B.Audio.sfx('star', i);
      }, 700 + i * 380);
    }
    setTimeout(() => {
      if (h.closed) return;
      if (stars >= 2) B.Audio.sfx('fanfare');
      if (rec.newBadges && rec.newBadges.length) B.Audio.sfx('badge');
    }, 700 + stars * 380 + 100);
  };
})(window.B);
