/* БРСМ: Команда 212 — общие утилиты */
'use strict';
window.B = window.B || {};

(function (B) {
  const U = (B.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (v - a) / (b - a);
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  U.chance = (p) => Math.random() < p;
  U.sign = (v) => (v < 0 ? -1 : 1);
  U.TAU = Math.PI * 2;

  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Экспоненциальное сглаживание, не зависящее от частоты кадров
  U.damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  // Детерминированный генератор для стабильных декораций
  U.rng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) => {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },
  };

  // ---------- Цвета ----------
  U.hexToRgb = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgb = (r, g, b, a = 1) =>
    a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  U.mix = (c1, c2, t) => {
    const a = U.hexToRgb(c1), b = U.hexToRgb(c2);
    return U.rgb(U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t));
  };
  U.mixHex = (c1, c2, t) => {
    const a = U.hexToRgb(c1), b = U.hexToRgb(c2);
    const h = (v) => Math.round(U.lerp(v[0], v[1], t)).toString(16).padStart(2, '0');
    return '#' + h([a[0], b[0]]) + h([a[1], b[1]]) + h([a[2], b[2]]);
  };
  U.alpha = (hex, a) => {
    const c = U.hexToRgb(hex);
    return U.rgb(c[0], c[1], c[2], a);
  };
  U.shade = (hex, amt) => (amt >= 0 ? U.mixHex(hex, '#ffffff', amt) : U.mixHex(hex, '#000000', -amt));
  // Палитра из нескольких опорных цветов: t от 0 до 1
  U.gradientAt = (stops, t) => {
    t = U.clamp(t, 0, 1) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(t));
    return U.mixHex(stops[i], stops[i + 1], t - i);
  };

  // ---------- Строки ----------
  U.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  U.fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  U.plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  U.dateStr = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ---------- Хранилище ----------
  U.store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  // ---------- Холст ----------
  U.rr = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  U.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  U.aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------- Твины ----------
  class Tweens {
    constructor() {
      this.list = [];
    }
    to(obj, props, dur, opts = {}) {
      const tw = {
        obj, dur, t: -(opts.delay || 0), ease: opts.ease || U.ease.outCubic,
        from: {}, to: props, done: opts.done, started: false,
      };
      this.list.push(tw);
      return tw;
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const tw = this.list[i];
        tw.t += dt;
        if (tw.t < 0) continue;
        if (!tw.started) {
          tw.started = true;
          for (const k in tw.to) tw.from[k] = tw.obj[k];
        }
        const p = Math.min(1, tw.t / tw.dur);
        const e = tw.ease(p);
        for (const k in tw.to) tw.obj[k] = U.lerp(tw.from[k], tw.to[k], e);
        if (p >= 1) {
          this.list.splice(i, 1);
          if (tw.done) tw.done();
        }
      }
    }
    clear() {
      this.list.length = 0;
    }
  }
  U.Tweens = Tweens;

  // ---------- Частицы ----------
  class Particles {
    constructor() {
      this.list = [];
    }
    emit(p) {
      const q = Object.assign(
        {
          x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 4, color: '#fff', gravity: 0, drag: 0,
          shape: 'circle', rot: 0, vr: 0, fade: true, shrink: false, alpha: 1, glow: false,
        },
        p
      );
      q.maxLife = q.life;
      this.list.push(q);
      if (this.list.length > 900) this.list.shift();
      return q;
    }
    burst(x, y, n, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = opts.angle != null ? opts.angle + U.rand(-opts.spread || 0, opts.spread || 0) : U.rand(0, U.TAU);
        const sp = U.rand(opts.speedMin || 60, opts.speedMax || 220);
        this.emit({
          x: x + U.rand(-(opts.jitter || 0), opts.jitter || 0),
          y: y + U.rand(-(opts.jitter || 0), opts.jitter || 0),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: U.rand(opts.lifeMin || 0.4, opts.lifeMax || 0.9),
          size: U.rand(opts.sizeMin || 2, opts.sizeMax || 5),
          color: Array.isArray(opts.colors) ? U.pick(opts.colors) : opts.color || '#fff',
          gravity: opts.gravity || 0,
          drag: opts.drag != null ? opts.drag : 1.5,
          shape: opts.shape || 'circle',
          rot: U.rand(0, U.TAU),
          vr: U.rand(-8, 8),
          shrink: opts.shrink != null ? opts.shrink : true,
          glow: opts.glow || false,
        });
      }
    }
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) {
          L.splice(i, 1);
          continue;
        }
        p.vy += p.gravity * dt;
        if (p.drag) {
          const d = Math.exp(-p.drag * dt);
          p.vx *= d;
          p.vy *= d;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.update) p.update(p, dt);
      }
    }
    render(ctx) {
      for (const p of this.list) {
        const k = p.life / p.maxLife;
        const s = p.shrink ? p.size * (0.3 + 0.7 * k) : p.size;
        ctx.globalAlpha = (p.fade ? Math.min(1, k * 1.6) : 1) * p.alpha;
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, U.TAU);
          ctx.fill();
        } else if (p.shape === 'rect') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
          ctx.restore();
        } else if (p.shape === 'star') {
          B.Art.star(ctx, p.x, p.y, s, s * 0.45, 5, p.rot);
          ctx.fill();
        } else if (p.shape === 'heart') {
          B.Art.heartPath(ctx, p.x, p.y, s);
          ctx.fill();
        } else if (p.shape === 'leaf') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, 0.55 + 0.45 * Math.sin(p.rot * 2));
          B.Art.leafPath(ctx, s);
          ctx.fill();
          ctx.restore();
        } else if (p.shape === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, 3 * k);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, U.TAU);
          ctx.stroke();
        } else if (p.shape === 'diamond') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.7, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.shape === 'text') {
          ctx.font = p.font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text, p.x, p.y);
        }
      }
      ctx.globalAlpha = 1;
    }
    clear() {
      this.list.length = 0;
    }
  }
  U.Particles = Particles;

  // ---------- Всплывающий текст ----------
  class Floaters {
    constructor() {
      this.list = [];
    }
    add(x, y, text, opts = {}) {
      this.list.push({
        x, y, text, t: 0, life: opts.life || 0.9, color: opts.color || '#fff',
        size: opts.size || 22, vy: opts.vy != null ? opts.vy : -60, stroke: opts.stroke || 'rgba(0,0,0,.55)',
        font: opts.font || B.FONT_DISPLAY, pop: opts.pop != null ? opts.pop : true,
      });
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const f = this.list[i];
        f.t += dt;
        f.y += f.vy * dt;
        if (f.t >= f.life) this.list.splice(i, 1);
      }
    }
    render(ctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of this.list) {
        const p = f.t / f.life;
        const sc = f.pop ? (p < 0.15 ? U.ease.outBack(p / 0.15) : 1) : 1;
        ctx.globalAlpha = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(sc, sc);
        ctx.font = `700 ${f.size}px ${f.font}`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, f.size / 5);
        ctx.strokeStyle = f.stroke;
        ctx.strokeText(f.text, 0, 0);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    clear() {
      this.list.length = 0;
    }
  }
  U.Floaters = Floaters;

  // ---------- Тряска экрана ----------
  class Shaker {
    constructor() {
      this.trauma = 0;
      this.x = 0;
      this.y = 0;
      this.seed = Math.random() * 1000;
    }
    add(v) {
      this.trauma = Math.min(1, this.trauma + v);
    }
    update(dt, t) {
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
      const s = this.trauma * this.trauma * (B.settings && B.settings.reduceMotion ? 0.25 : 1);
      this.x = s * 18 * Math.sin(t * 47 + this.seed);
      this.y = s * 14 * Math.sin(t * 59 + this.seed * 2);
    }
  }
  U.Shaker = Shaker;

  U.isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
})(window.B);
