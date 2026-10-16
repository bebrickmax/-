/* БРСМ: Команда 212 — процедурная графика: персонажи, город, флаги, иконки */
'use strict';

(function (B) {
  const U = B.U;
  const Art = (B.Art = {});

  B.FONT_DISPLAY = "'Unbounded', 'Arial Black', 'Segoe UI', system-ui, sans-serif";
  B.FONT_BODY = "'Golos Text', 'Segoe UI', Roboto, system-ui, sans-serif";

  Art.C = {
    red: '#D21F2B', redD: '#99121C', green: '#0E8A4E', greenD: '#08593A', gold: '#F6B92B', goldL: '#FFE08A',
    linen: '#FFF7EA', ink: '#1E1A1D', white: '#FFFFFF', sky: '#8FD3F4',
  };

  Art.SKIN = ['#FBDCC6', '#F1C29E', '#D9A07A', '#A9704C'];
  Art.HAIR = ['#2A1D17', '#5B3A22', '#93552B', '#D8A543', '#EED79B', '#B8432B', '#C9C4C0'];
  Art.JACKET = ['#D21F2B', '#0E8A4E', '#2563C9', '#F6B92B', '#2E2C3A', '#8B4BB8'];
  Art.HAIR_NAMES = ['Короткая', 'Ёжик', 'Длинные', 'Хвост', 'Кудри', 'Пучок'];
  Art.HAIR_STYLES = 6;

  // ---------- Простые фигуры ----------
  Art.heartPath = (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.3, y + r * 0.05, x - r * 1.05, y - r * 1.05, x, y - r * 0.38);
    ctx.bezierCurveTo(x + r * 1.05, y - r * 1.05, x + r * 1.3, y + r * 0.05, x, y + r * 0.9);
    ctx.closePath();
  };
  Art.heart = (ctx, x, y, r, color, shine = true) => {
    Art.heartPath(ctx, x, y, r);
    ctx.fillStyle = color;
    ctx.fill();
    if (shine) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.42, y - r * 0.35, r * 0.22, r * 0.14, -0.6, 0, U.TAU);
      ctx.fill();
    }
  };
  Art.star = (ctx, x, y, R, r, n = 5, rot = 0) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / n;
      const rad = i % 2 ? r : R;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  Art.leafPath = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.9, s, 0);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.9, -s, 0);
    ctx.closePath();
  };
  Art.diamond = (ctx, x, y, w, h) => {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w, y);
    ctx.closePath();
  };

  // ---------- Персонаж ----------
  // Конечность из двух сегментов. Угол 0 — вниз, положительный — вперёд (вправо).
  function limb(ctx, x, y, a1, a2, l1, l2, w, color) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    const ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    return [ex, ey, a2];
  }

  function shoe(ctx, x, y, a, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-a);
    ctx.fillStyle = color;
    U.rr(ctx, -4.5, -3.5, 13, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(-4, 2, 12, 1.6);
    ctx.restore();
  }

  function hand(ctx, x, y, skin) {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, U.TAU);
    ctx.fill();
  }

  function drawHairBack(ctx, style, c, swing) {
    ctx.fillStyle = c;
    switch (style) {
      case 2: // длинные
        U.rr(ctx, -21, -19, 30, 42, 12);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-2, -3, 19.5, 0, U.TAU);
        ctx.fill();
        break;
      case 3: // хвост
        ctx.beginPath();
        ctx.arc(-2, -3, 19, 0, U.TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(-17, -8);
        ctx.rotate(0.5 + swing * 0.35);
        ctx.beginPath();
        ctx.ellipse(0, 13, 7, 15, 0, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = '#D21F2B';
        ctx.beginPath();
        ctx.arc(0, -1, 3.4, 0, U.TAU);
        ctx.fill();
        ctx.restore();
        break;
      case 4: { // кудри
        const pts = [[-18, 4], [-19, -6], [-15, -15], [-7, -21], [3, -22], [12, -18], [-16, 12], [-10, -19]];
        for (const [px, py] of pts) {
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, U.TAU);
          ctx.fill();
        }
        break;
      }
      case 5: // пучок
        ctx.beginPath();
        ctx.arc(-2, -3, 19, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-6, -23, 8.5, 0, U.TAU);
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(-2, -3, 18.6, 0, U.TAU);
        ctx.fill();
    }
  }

  function drawHairFront(ctx, style, c) {
    ctx.fillStyle = c;
    if (style === 1) {
      // ёжик — шипы
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      const sp = [[-14, -22], [-8, -14], [-3, -26], [2, -15], [8, -24], [10, -12], [17, -16], [15, -6]];
      for (const [px, py] of sp) ctx.lineTo(px, py);
      ctx.lineTo(10, -8);
      ctx.quadraticCurveTo(0, -12, -16, -6);
      ctx.fill();
      return;
    }
    if (style === 4) {
      for (const [px, py] of [[5, -16], [12, -12], [-2, -18]]) {
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, U.TAU);
        ctx.fill();
      }
      return;
    }
    // чёлка
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.quadraticCurveTo(-4, -24, 13, -15);
    ctx.quadraticCurveTo(17, -10, 16, -4);
    ctx.quadraticCurveTo(9, -10, 4, -8);
    ctx.quadraticCurveTo(-4, -6, -15, -8);
    ctx.fill();
  }

  function drawFace(ctx, opts, t) {
    const blink = (Math.sin(t * 1.3 + (opts.seed || 0)) > 0.985) || opts.eyesClosed;
    // ухо
    ctx.fillStyle = opts.skinD;
    ctx.beginPath();
    ctx.arc(-5, 3, 3.6, 0, U.TAU);
    ctx.fill();
    // глаза
    ctx.fillStyle = '#231A1C';
    for (const ex of [4.5, 11.5]) {
      ctx.beginPath();
      if (blink) ctx.ellipse(ex, 1.5, 2.6, 0.6, 0, 0, U.TAU);
      else ctx.ellipse(ex, 1, 2.3, 3, 0, 0, U.TAU);
      ctx.fill();
    }
    if (!blink) {
      ctx.fillStyle = '#fff';
      for (const ex of [5.3, 12.3]) {
        ctx.beginPath();
        ctx.arc(ex, -0.2, 0.9, 0, U.TAU);
        ctx.fill();
      }
    }
    // брови
    ctx.strokeStyle = opts.hair;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2.5, -4.5);
    ctx.lineTo(6.5, -5.2);
    ctx.moveTo(9.5, -5.2);
    ctx.lineTo(13.5, -4.5);
    ctx.stroke();
    // щёки
    ctx.fillStyle = 'rgba(240,110,110,.35)';
    ctx.beginPath();
    ctx.arc(14.5, 6, 2.8, 0, U.TAU);
    ctx.arc(1.5, 6.5, 2.6, 0, U.TAU);
    ctx.fill();
    // рот
    ctx.strokeStyle = '#7A2E2E';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    if (opts.mouth === 'o') {
      ctx.fillStyle = '#7A2E2E';
      ctx.ellipse(8.5, 9, 2, 2.6, 0, 0, U.TAU);
      ctx.fill();
    } else if (opts.mouth === 'grin') {
      ctx.fillStyle = '#7A2E2E';
      ctx.arc(8.5, 7, 4.2, 0.1, Math.PI - 0.1);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.arc(8.5, 6.5, 3.6, 0.35, Math.PI - 0.35);
      ctx.stroke();
    }
    if (opts.glasses) {
      ctx.strokeStyle = '#2B2530';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(4.5, 1, 4.6, 0, U.TAU);
      ctx.moveTo(16.1, 1);
      ctx.arc(11.5, 1, 4.6, 0, U.TAU);
      ctx.moveTo(7.8, 0);
      ctx.lineTo(8.2, 0);
      ctx.moveTo(-0.1, 0);
      ctx.lineTo(-4, -1);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.beginPath();
      ctx.arc(4.5, 1, 4, 0, U.TAU);
      ctx.arc(11.5, 1, 4, 0, U.TAU);
      ctx.fill();
    }
  }

  // Главная функция персонажа. (x, y) — точка между ступнями, рост ≈ 104·s
  Art.avatar = function (ctx, x, y, s, av, pose = {}) {
    const t = pose.t || 0;
    const kind = pose.kind || 'idle';
    const ph = pose.phase || 0;
    const skin = av.skinColor || Art.SKIN[av.skin | 0];
    const skinD = U.shade(skin, -0.12);
    const hairC = av.hairHex || Art.HAIR[av.hairColor | 0];
    const jacket = av.jacketHex || Art.JACKET[av.jacket | 0];
    const jacketD = U.shade(jacket, -0.22);
    const pants = av.pants || '#2E3A5C';
    const pantsD = U.shade(pants, -0.25);
    const shoes = av.shoes || '#2A2730';

    let bob = 0, lean = 0;
    let thF = 0.05, bnF = 0.05, thB = -0.05, bnB = 0.05;
    let arF = 0.12, elF = 0.25, arB = -0.12, elB = 0.25;
    let mouth = pose.mouth || 'smile';
    let swing = 0;

    if (kind === 'idle') {
      const b = Math.sin(t * 2.6);
      bob = b * 0.8;
      arF = 0.14 + b * 0.04;
      arB = -0.14 - b * 0.04;
    } else if (kind === 'walk' || kind === 'run') {
      const k = kind === 'run' ? 1 : 0.5;
      const a = Math.sin(ph), c = Math.cos(ph);
      thF = a * 0.95 * k;
      thB = -a * 0.95 * k;
      bnF = (0.15 + Math.max(0, c) * 1.25) * k;
      bnB = (0.15 + Math.max(0, -c) * 1.25) * k;
      arF = -a * 1.05 * k;
      arB = a * 1.05 * k;
      elF = elB = kind === 'run' ? 1.35 : 0.4;
      lean = kind === 'run' ? 0.16 : 0.04;
      bob = -Math.abs(c) * (kind === 'run' ? 5 : 2);
      swing = a;
    } else if (kind === 'jump') {
      const up = pose.vy != null ? U.clamp(-pose.vy / 900, -1, 1) : 1;
      thF = 0.9; bnF = 1.5; thB = -0.25; bnB = 0.9;
      arF = 2.65 - (1 - up) * 0.55; elF = 0.15; arB = -2.65 + (1 - up) * 0.55; elB = -0.15;
      lean = 0.08;
      mouth = 'grin';
      swing = -up;
    } else if (kind === 'slide') {
      thF = 1.45; bnF = 0.1; thB = 1.2; bnB = 0.25;
      arF = -1.9; elF = 0.2; arB = -2.4; elB = 0.2;
      lean = -1.05;
      mouth = 'grin';
      swing = 1;
    } else if (kind === 'cheer') {
      const w = Math.sin(t * 9);
      bob = -Math.abs(Math.sin(t * 6)) * 6;
      arF = 2.75 + w * 0.2; elF = 0.2; arB = -2.75 - w * 0.2; elB = -0.2;
      thF = 0.1; thB = -0.1;
      mouth = 'grin';
    } else if (kind === 'hurt') {
      lean = -0.35;
      arF = 2.2; arB = -2.3; elF = 0.4; elB = -0.4;
      thF = 0.5; bnF = 0.8; thB = -0.3; bnB = 0.4;
      mouth = 'o';
    } else if (kind === 'wave') {
      const w = Math.sin(t * 8);
      arF = 2.55 + w * 0.15; elF = 0.35 + w * 0.35;
      bob = Math.sin(t * 2.6) * 0.8;
    } else if (kind === 'carry') {
      const a = Math.sin(ph) * 0.3;
      thF = a; thB = -a; bnF = 0.2; bnB = 0.2;
      arF = 0.05; elF = 0.1; arB = -0.05; elB = 0.1;
    }

    const coat = av.coat;
    ctx.save();
    ctx.translate(x, y);
    const sx = pose.flip ? -s : s;
    ctx.scale(sx, s);
    if (pose.rot) ctx.rotate(pose.rot);

    // тень
    if (pose.shadow !== false && kind !== 'slide') {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 15, 3.5, 0, 0, U.TAU);
      ctx.fill();
    }

    const hipY = -36 + bob;
    ctx.translate(0, hipY);
    if (kind === 'slide') ctx.translate(-4, 20);

    // Верх тела поворачивается вокруг бедра
    const upper = (fn) => {
      ctx.save();
      ctx.rotate(lean);
      fn();
      ctx.restore();
    };

    // дальняя рука
    upper(() => {
      const [hx, hy] = limb(ctx, -1, -28, arB, arB + elB, 13, 12, 8.5, jacketD);
      hand(ctx, hx, hy, skinD);
      if (av.bags) {
        ctx.fillStyle = '#B5651D';
        U.rr(ctx, hx - 6, hy + 1, 12, 12, 3);
        ctx.fill();
      }
    });
    // дальняя нога
    {
      const [fx, fy, fa] = limb(ctx, -2, 0, thB, thB - bnB, 18, 17, 10, pantsD);
      shoe(ctx, fx, fy, fa, U.shade(shoes, -0.2));
    }
    // туловище
    upper(() => {
      ctx.fillStyle = jacket;
      if (coat) {
        U.rr(ctx, -13, -34, 26, 52, 9);
        ctx.fill();
        ctx.fillStyle = jacketD;
        ctx.fillRect(-12, 12, 24, 3);
      } else {
        U.rr(ctx, -13, -34, 26, 38, 10);
        ctx.fill();
        ctx.fillStyle = jacketD;
        U.rr(ctx, -13, -2, 26, 6, 3);
        ctx.fill();
        // молния
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(5, -30);
        ctx.lineTo(5, 2);
        ctx.stroke();
      }
      // воротник
      ctx.fillStyle = av.collar || jacketD;
      ctx.beginPath();
      ctx.moveTo(-8, -34);
      ctx.lineTo(9, -34);
      ctx.lineTo(4, -28);
      ctx.closePath();
      ctx.fill();
      // нашивка: красно-зелёный значок
      if (!av.noBadge) {
        ctx.save();
        ctx.translate(-4, -22);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 4.4, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = '#D21F2B';
        ctx.beginPath();
        ctx.arc(0, 0, 3.4, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#0E8A4E';
        ctx.beginPath();
        ctx.arc(0, 0, 3.4, 0, Math.PI);
        ctx.fill();
        ctx.restore();
      }
      // голова
      ctx.save();
      ctx.translate(3, -50);
      ctx.rotate(pose.headTilt || 0);
      if (av.scarf) {
        ctx.fillStyle = av.scarf;
        ctx.beginPath();
        ctx.arc(-1, -2, 20, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-16, 10);
        ctx.lineTo(-24, 22);
        ctx.lineTo(-10, 16);
        ctx.fill();
      } else drawHairBack(ctx, av.hair | 0, hairC, swing);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, 0, 16.5, 0, U.TAU);
      ctx.fill();
      drawFace(ctx, { skinD, hair: hairC, glasses: av.glasses, mouth, seed: av.seed || 0, eyesClosed: pose.eyesClosed }, t);
      if (av.scarf) {
        ctx.fillStyle = av.scarf;
        ctx.beginPath();
        ctx.moveTo(-18, 2);
        ctx.quadraticCurveTo(-6, -26, 17, -9);
        ctx.quadraticCurveTo(4, -15, -18, 2);
        ctx.fill();
        ctx.fillStyle = U.shade(av.scarf, 0.25);
        for (const [dx, dy] of [[-9, -11], [0, -15], [-14, -4]]) {
          ctx.beginPath();
          ctx.arc(dx, dy, 1.6, 0, U.TAU);
          ctx.fill();
        }
      } else drawHairFront(ctx, av.hair | 0, hairC);
      if (av.cap) {
        ctx.fillStyle = av.cap;
        ctx.beginPath();
        ctx.arc(-1, -6, 17.5, Math.PI, U.TAU);
        ctx.fill();
        U.rr(ctx, 4, -9, 20, 4.5, 2);
        ctx.fill();
      }
      ctx.restore();
    });
    // ближняя нога
    {
      const [fx, fy, fa] = limb(ctx, 3, 0, thF, thF - bnF, 18, 17, 10.5, pants);
      shoe(ctx, fx, fy, fa, shoes);
    }
    // ближняя рука
    upper(() => {
      const [hx, hy] = limb(ctx, 5, -28, arF, arF + elF, 13, 12, 9, jacket);
      hand(ctx, hx, hy, skin);
      if (av.bags) {
        ctx.fillStyle = '#E2A23B';
        U.rr(ctx, hx - 7, hy + 1, 14, 14, 3);
        ctx.fill();
        ctx.strokeStyle = '#8A5A1A';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(hx, hy + 2, 4, Math.PI, U.TAU);
        ctx.stroke();
      }
      if (av.flowers) {
        ctx.strokeStyle = '#2F7D32';
        ctx.lineWidth = 1.6;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + i * 4 + 4, hy - 14);
          ctx.stroke();
        }
        ctx.fillStyle = '#E8384F';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(hx + i * 4 + 4, hy - 15, 3.2, 0, U.TAU);
          ctx.fill();
        }
      }
    });
    ctx.restore();
  };

  // Портрет (голова и плечи) — для интерфейса
  Art.portrait = function (canvas, av, opts = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = opts.size || 64;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, U.TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, U.TAU);
    ctx.clip();
    // крупный план: голова и плечи
    const s = size / 56;
    Art.avatar(ctx, size * 0.5 - 3 * s, size * 0.47 + 86 * s, s, av, { kind: 'idle', t: opts.t || 0, shadow: false });
    ctx.restore();
  };

  Art.randomAvatar = function () {
    return {
      skin: U.randInt(0, Art.SKIN.length - 1),
      hair: U.randInt(0, Art.HAIR_STYLES - 1),
      hairColor: U.randInt(0, 5),
      jacket: U.randInt(0, Art.JACKET.length - 1),
      glasses: U.chance(0.25),
      seed: Math.random() * 100,
    };
  };

  // ---------- Флаги ----------
  // Флаг Беларуси: красная полоса 2/3, зелёная 1/3, у древка — бело-красный орнамент
  function drawFlatFlagBY(c) {
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const bandW = Math.round(w / 9);
    ctx.fillStyle = '#C8313E';
    ctx.fillRect(0, 0, w, h * (2 / 3));
    ctx.fillStyle = '#4AA657';
    ctx.fillRect(0, h * (2 / 3), w, h / 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, bandW, h);
    // упрощённый орнамент из ромбов
    ctx.fillStyle = '#C8313E';
    const cell = bandW / 7;
    const motif = Art.ORN_SMALL;
    const rows = motif.length;
    for (let y0 = 0; y0 < h; y0 += rows * cell) {
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < 7; col++) {
          if (motif[r][col] === 'x') ctx.fillRect(col * cell, y0 + r * cell, cell + 0.4, cell + 0.4);
        }
      }
    }
  }
  // Флаг БРСМ по описанию: красное поле, зелёная дугообразная полоса внизу, золотые буквы «БРСМ»
  function drawFlatFlagBRSM(c) {
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.fillStyle = '#D21F2B';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#119150';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.86);
    ctx.quadraticCurveTo(w * 0.5, h * 0.56, w, h * 0.86);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F6C343';
    ctx.font = `900 ${Math.round(h * 0.3)}px ${B.FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('БРСМ', w / 2, h * 0.42);
  }
  Art.ORN_SMALL = [
    '...x...',
    '..x.x..',
    '.x.x.x.',
    'x.xxx.x',
    '.x.x.x.',
    '..x.x..',
    '...x...',
    '.......',
  ];

  const flagCache = {};
  Art.flagTexture = function (kind, w, h) {
    const key = kind + w + 'x' + h;
    if (!flagCache[key]) {
      const c = U.makeCanvas(w, h);
      if (kind === 'by') drawFlatFlagBY(c);
      else drawFlatFlagBRSM(c);
      flagCache[key] = c;
    }
    return flagCache[key];
  };
  Art.clearFlagCache = () => {
    for (const k in flagCache) delete flagCache[k];
  };

  // Развевающийся флаг (x, y — верхний левый угол у древка)
  Art.wavingFlag = function (ctx, kind, x, y, w, h, t, amp = 1) {
    const tex = Art.flagTexture(kind, Math.round(w * 2), Math.round(h * 2));
    const slices = Math.max(12, Math.round(w / 3));
    const sw = w / slices;
    const off = (u) => Math.sin(u * 6 - t * 5) * h * 0.07 * u * amp;
    for (let i = 0; i < slices; i++) {
      const u = (i + 0.5) / slices;
      ctx.drawImage(tex, (i * tex.width) / slices, 0, tex.width / slices, tex.height, x + i * sw, y + off(u), sw + 0.9, h);
    }
    // светотень складок — один градиент по всей ткани
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      const sh = Math.cos(u * 6 - t * 5) * u * amp;
      g.addColorStop(u, sh > 0 ? `rgba(255,255,255,${(sh * 0.14).toFixed(3)})` : `rgba(0,0,0,${(-sh * 0.2).toFixed(3)})`);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= slices; i++) {
      const u = i / slices;
      i ? ctx.lineTo(x + u * w, y + off(u)) : ctx.moveTo(x, y + off(0));
    }
    for (let i = slices; i >= 0; i--) {
      const u = i / slices;
      ctx.lineTo(x + u * w, y + h + off(u));
    }
    ctx.closePath();
    ctx.fill();
  };

  Art.flagpole = function (ctx, x, y, h, color = '#D9DCE3') {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y, 8, 2.5, 0, 0, U.TAU);
    ctx.fill();
    const g = ctx.createLinearGradient(x - 2, 0, x + 3, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, U.shade(color, -0.35));
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, y - h, 4.5, h);
    ctx.fillStyle = '#F6B92B';
    ctx.beginPath();
    ctx.arc(x + 0.2, y - h - 2, 4, 0, U.TAU);
    ctx.fill();
  };

  // ---------- Орнамент (вышиванка) ----------
  Art.ORN_BIG = [
    '......x......',
    '.....x.x.....',
    '....x.x.x....',
    '...x.x.x.x...',
    '..x.x...x.x..',
    '.x.x..x..x.x.',
    'x.x..xxx..x.x',
    '.x.x..x..x.x.',
    '..x.x...x.x..',
    '...x.x.x.x...',
    '....x.x.x....',
    '.....x.x.....',
    '......x......',
  ];
  // Полоса орнамента: ромбы и крестики между ними
  Art.ornamentStrip = function (cell, color, bg) {
    const m = Art.ORN_BIG;
    const mw = m[0].length + 4;
    const c = U.makeCanvas(mw * cell, (m.length + 2) * cell);
    const ctx = c.getContext('2d');
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.fillStyle = color;
    for (let r = 0; r < m.length; r++)
      for (let col = 0; col < m[r].length; col++)
        if (m[r][col] === 'x') ctx.fillRect((col + 2) * cell, (r + 1) * cell, cell, cell);
    // крестик-связка на стыке
    const cy = Math.floor(m.length / 2) + 1;
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillRect((0 + dx + 0.5) * cell, (cy + dy) * cell, cell, cell);
    return c;
  };
  Art.ornamentURL = function (cell, color, bg) {
    try {
      return Art.ornamentStrip(cell, color, bg).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  };

  // ---------- Природа ----------
  Art.season = function () {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) return 'spring';
    if (m >= 5 && m <= 7) return 'summer';
    if (m >= 8 && m <= 10) return 'autumn';
    return 'winter';
  };
  const SEASON_LEAVES = {
    autumn: ['#F2A33A', '#E4672E', '#F6C343', '#C9412C', '#9DAA3A'],
    summer: ['#4FAE4A', '#3D9440', '#69C25B', '#2F7D32'],
    spring: ['#7ACB5C', '#9BDB6E', '#F7B8C8', '#5DB653'],
    winter: ['#E9F1F7', '#D5E3EE', '#FFFFFF'],
  };
  Art.leafColors = (season) => SEASON_LEAVES[season || Art.season()];

  const treeCache = {};
  // Спрайт дерева: kind 'birch' | 'maple' | 'pine'
  Art.treeSprite = function (kind, season, seed, size) {
    const key = [kind, season, seed, size].join('|');
    if (treeCache[key]) return treeCache[key];
    const rnd = U.rng(seed * 9973 + 17);
    const W = size * 1.3, H = size * 1.6;
    const c = U.makeCanvas(W * 2, H * 2);
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    const cx = W / 2, base = H;
    const cols = SEASON_LEAVES[season];
    if (kind === 'pine') {
      ctx.fillStyle = '#5A3B22';
      ctx.fillRect(cx - size * 0.05, base - size * 0.3, size * 0.1, size * 0.3);
      const green = season === 'winter' ? '#2D6A4A' : '#2E7D4F';
      for (let i = 0; i < 4; i++) {
        const yy = base - size * 0.22 - i * size * 0.28;
        const ww = size * (0.5 - i * 0.09);
        ctx.fillStyle = U.shade(green, i * 0.05 - 0.05);
        ctx.beginPath();
        ctx.moveTo(cx - ww, yy);
        ctx.lineTo(cx, yy - size * 0.42);
        ctx.lineTo(cx + ww, yy);
        ctx.closePath();
        ctx.fill();
        if (season === 'winter') {
          ctx.fillStyle = '#F4F8FB';
          ctx.beginPath();
          ctx.moveTo(cx - ww * 0.5, yy - size * 0.2);
          ctx.lineTo(cx, yy - size * 0.42);
          ctx.lineTo(cx + ww * 0.5, yy - size * 0.2);
          ctx.quadraticCurveTo(cx, yy - size * 0.16, cx - ww * 0.5, yy - size * 0.2);
          ctx.fill();
        }
      }
    } else {
      const birch = kind === 'birch';
      // ствол
      const tw = size * (birch ? 0.07 : 0.09);
      ctx.fillStyle = birch ? '#F3F1EC' : '#6B4A2E';
      ctx.beginPath();
      ctx.moveTo(cx - tw, base);
      ctx.lineTo(cx - tw * 0.6, base - size * 0.95);
      ctx.lineTo(cx + tw * 0.6, base - size * 0.95);
      ctx.lineTo(cx + tw, base);
      ctx.fill();
      if (birch) {
        ctx.fillStyle = '#2D2A2A';
        for (let i = 0; i < 7; i++) {
          const yy = base - rnd() * size * 0.9;
          ctx.fillRect(cx - tw * (0.2 + rnd() * 0.6), yy, tw * (0.5 + rnd() * 0.8), 1.6);
        }
      }
      // ветки
      ctx.strokeStyle = birch ? '#E9E6DF' : '#6B4A2E';
      ctx.lineWidth = Math.max(1.5, tw * 0.5);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = base - size * (0.45 + i * 0.15);
        const dir = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(cx, yy);
        ctx.lineTo(cx + dir * size * 0.22, yy - size * 0.16);
        ctx.stroke();
      }
      // крона
      if (season !== 'winter') {
        const blobs = birch ? 14 : 11;
        const crownY = base - size * (birch ? 0.88 : 0.82);
        const crownR = size * (birch ? 0.33 : 0.42);
        for (let i = 0; i < blobs; i++) {
          const a = rnd() * U.TAU, d = Math.sqrt(rnd()) * crownR * 0.75;
          const bx = cx + Math.cos(a) * d * (birch ? 0.8 : 1.1), by = crownY + Math.sin(a) * d * (birch ? 1.35 : 0.85);
          const br = crownR * (0.35 + rnd() * 0.25);
          ctx.fillStyle = cols[(rnd() * cols.length) | 0];
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, U.TAU);
          ctx.fill();
        }
        // блик
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.beginPath();
        ctx.arc(cx - crownR * 0.3, crownY - crownR * 0.35, crownR * 0.45, 0, U.TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = '#F4F8FB';
        for (let i = 0; i < 3; i++) {
          const yy = base - size * (0.45 + i * 0.15);
          const dir = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.ellipse(cx + dir * size * 0.12, yy - size * 0.09, size * 0.08, 2, dir * -0.6, 0, U.TAU);
          ctx.fill();
        }
      }
    }
    const sprite = { c, w: W, h: H, ox: W / 2, oy: H };
    treeCache[key] = sprite;
    return sprite;
  };
  // Ночная (затемнённая) версия спрайта
  Art.nightSprite = function (sp) {
    if (sp.night) return sp.night;
    const c = U.makeCanvas(sp.c.width, sp.c.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(sp.c, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(16,20,52,.62)';
    ctx.fillRect(0, 0, c.width, c.height);
    sp.night = { c, w: sp.w, h: sp.h, ox: sp.ox, oy: sp.oy };
    return sp.night;
  };
  Art.drawSprite = (ctx, sp, x, y, scale = 1) => {
    ctx.drawImage(sp.c, x - sp.ox * scale, y - sp.oy * scale, sp.w * scale, sp.h * scale);
  };

  Art.cloud = function (ctx, x, y, s, color = '#fff') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, U.TAU);
    ctx.arc(x + 26 * s, y - 10 * s, 28 * s, 0, U.TAU);
    ctx.arc(x + 56 * s, y, 22 * s, 0, U.TAU);
    ctx.arc(x + 28 * s, y + 6 * s, 22 * s, 0, U.TAU);
    ctx.fill();
  };

  // ---------- Минск: силуэт ----------
  // Возвращает Path2D силуэта шириной ~width (в единицах), основание y=0
  Art.skylinePath = function (width, seed, opts = {}) {
    const rnd = U.rng(seed);
    const p = new Path2D();
    const lights = new Path2D();
    let x = 0;
    const landmarks = opts.landmarks || ['library', 'stele', 'gates', 'tv'];
    const marks = {};
    landmarks.forEach((m, i) => (marks[Math.floor(((i + 0.5) / landmarks.length) * width)] = m));
    const markXs = Object.keys(marks).map(Number).sort((a, b) => a - b);
    let mi = 0;
    const box = (bx, bw, bh) => {
      p.rect(bx, -bh, bw, bh);
    };
    const winRow = (bx, bw, bh) => {
      for (let yy = -bh + 8; yy < -6; yy += 9) for (let xx = bx + 4; xx < bx + bw - 4; xx += 7) if (rnd() < 0.45) lights.rect(xx, yy, 3, 4);
    };
    while (x < width) {
      if (mi < markXs.length && x >= markXs[mi] - 60) {
        const m = marks[markXs[mi]];
        mi++;
        if (m === 'library') {
          // Национальная библиотека: «алмаз» на подиуме
          box(x, 170, 22);
          const cx = x + 85, cy = -92, r = 66;
          for (let i = 0; i < 8; i++) {
            const a = Math.PI / 8 + (i * Math.PI) / 4;
            const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
            i ? p.lineTo(px, py) : p.moveTo(px, py);
          }
          p.closePath();
          p.rect(cx - 6, cy - r - 8, 12, 10);
          for (let i = 0; i < 18; i++) lights.rect(cx - 40 + rnd() * 80, cy - 40 + rnd() * 80, 3, 3);
          x += 185;
        } else if (m === 'stele') {
          // Стела «Минск — город-герой»
          p.moveTo(x, 0);
          p.lineTo(x + 8, -16);
          p.lineTo(x + 52, -16);
          p.lineTo(x + 60, 0);
          p.closePath();
          p.moveTo(x + 23, -16);
          p.lineTo(x + 27.5, -205);
          p.lineTo(x + 32.5, -205);
          p.lineTo(x + 37, -16);
          p.closePath();
          // звезда
          const sx = x + 30, sy = -214;
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const rr = i % 2 ? 4 : 10;
            const px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr;
            i ? p.lineTo(px, py) : p.moveTo(px, py);
          }
          p.closePath();
          x += 80;
        } else if (m === 'gates') {
          // «Ворота Минска»: две башни
          for (const off of [0, 104]) {
            const bx = x + off;
            box(bx, 50, 128);
            box(bx + 7, 36, 142);
            box(bx + 15, 20, 156);
            p.moveTo(bx + 17, -156);
            p.lineTo(bx + 25, -174);
            p.lineTo(bx + 33, -156);
            p.closePath();
            winRow(bx, 50, 128);
          }
          box(x + 50, 54, 46);
          x += 170;
        } else if (m === 'tv') {
          p.rect(x + 20, -230, 5, 230);
          p.rect(x + 13, -170, 19, 14);
          p.rect(x + 10, -60, 25, 6);
          x += 50;
        }
        continue;
      }
      // обычные дома: панельки и высотки
      const bw = 34 + rnd() * 50;
      const bh = 50 + rnd() * 90;
      box(x, bw, bh);
      if (rnd() < 0.35) box(x + bw * 0.3, bw * 0.4, bh + 10);
      winRow(x, bw, bh);
      x += bw + rnd() * 6;
    }
    return { path: p, lights, width: x };
  };

  // ---------- Школа №212 ----------
  Art.school = function (ctx, x, y, s, t, opts = {}) {
    // x — центр, y — уровень земли
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const night = opts.night || 0;
    const wall = U.mixHex('#F4EEE3', '#6A6478', night * 0.8);
    const wallD = U.mixHex('#E2D8C8', '#575167', night * 0.8);
    const accent = U.mixHex('#D21F2B', '#7C1A24', night * 0.6);
    const glass = night > 0.5 ? '#FFD772' : U.mixHex('#9FD3EE', '#5E7FA8', night);
    // тень
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 175, 10, 0, 0, U.TAU);
    ctx.fill();
    // крылья
    for (const dir of [-1, 1]) {
      ctx.fillStyle = wallD;
      ctx.fillRect(dir === -1 ? -170 : 70, -86, 100, 86);
      ctx.fillStyle = accent;
      ctx.fillRect(dir === -1 ? -170 : 70, -92, 100, 7);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 5; col++) {
          const wx = (dir === -1 ? -162 : 78) + col * 18.5, wy = -78 + row * 26;
          ctx.fillStyle = glass;
          ctx.fillRect(wx, wy, 12, 15);
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.fillRect(wx + 1, wy + 1, 3, 13);
        }
    }
    // центральный корпус
    ctx.fillStyle = wall;
    ctx.fillRect(-72, -122, 144, 122);
    ctx.fillStyle = accent;
    ctx.fillRect(-76, -130, 152, 9);
    // вертикальная полоса цветов флага
    ctx.fillStyle = '#C8313E';
    ctx.fillRect(-72, -121, 10, 80);
    ctx.fillStyle = '#4AA657';
    ctx.fillRect(-72, -41, 10, 40);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 6; col++) {
        if (row === 3 && col >= 2 && col <= 3) continue;
        const wx = -54 + col * 20, wy = -112 + row * 27;
        ctx.fillStyle = glass;
        ctx.fillRect(wx, wy, 13, 17);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(wx + 1, wy + 1, 3, 15);
      }
    // вход
    ctx.fillStyle = '#3B3340';
    ctx.fillRect(-16, -34, 32, 34);
    ctx.fillStyle = glass;
    ctx.fillRect(-13, -31, 12, 31);
    ctx.fillRect(1, -31, 12, 31);
    ctx.fillStyle = accent;
    ctx.fillRect(-26, -40, 52, 7);
    // табличка 212
    ctx.fillStyle = '#1E1A1D';
    U.rr(ctx, -30, -158, 60, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#F6C343';
    ctx.font = `900 17px ${B.FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('212', 0, -144.5);
    // ступени
    ctx.fillStyle = '#CFC6B8';
    ctx.fillRect(-34, -4, 68, 4);
    ctx.fillRect(-28, -8, 56, 4);
    // флагштоки у входа
    if (opts.flags !== false) {
      Art.flagpole(ctx, -110, 0, 120);
      Art.wavingFlag(ctx, 'by', -108, -118, 50, 25, t);
      Art.flagpole(ctx, 112, 0, 120);
      Art.wavingFlag(ctx, 'brsm', 114, -118, 50, 25, t + 0.7);
    }
    ctx.restore();
  };

  // ---------- Иконки значков ----------
  Art.icon = function (ctx, id, x, y, r, color = '#fff') {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 0.16;
    const k = r;
    switch (id) {
      case 'heart':
        Art.heartPath(ctx, 0, k * 0.05, k * 0.62);
        ctx.fill();
        break;
      case 'hands':
        ctx.beginPath();
        ctx.moveTo(-k * 0.75, k * 0.2);
        ctx.quadraticCurveTo(-k * 0.3, -k * 0.35, 0, -k * 0.05);
        ctx.quadraticCurveTo(k * 0.3, -k * 0.35, k * 0.75, k * 0.2);
        ctx.stroke();
        Art.heartPath(ctx, 0, -k * 0.35, k * 0.28);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-k * 0.75, k * 0.45);
        ctx.lineTo(k * 0.75, k * 0.45);
        ctx.stroke();
        break;
      case 'run':
        ctx.beginPath();
        ctx.arc(k * 0.2, -k * 0.55, k * 0.17, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(k * 0.1, -k * 0.3);
        ctx.lineTo(-k * 0.1, k * 0.1);
        ctx.lineTo(k * 0.25, k * 0.35);
        ctx.lineTo(k * 0.15, k * 0.7);
        ctx.moveTo(-k * 0.1, k * 0.1);
        ctx.lineTo(-k * 0.45, k * 0.5);
        ctx.moveTo(-k * 0.45, -k * 0.15);
        ctx.lineTo(k * 0.05, -k * 0.25);
        ctx.lineTo(k * 0.45, -k * 0.05);
        ctx.stroke();
        break;
      case 'crane':
        ctx.beginPath();
        ctx.moveTo(-k * 0.4, k * 0.7);
        ctx.lineTo(-k * 0.4, -k * 0.6);
        ctx.lineTo(k * 0.7, -k * 0.6);
        ctx.moveTo(-k * 0.7, -k * 0.6);
        ctx.lineTo(-k * 0.4, -k * 0.6);
        ctx.moveTo(k * 0.5, -k * 0.6);
        ctx.lineTo(k * 0.5, -k * 0.1);
        ctx.moveTo(-k * 0.7, k * 0.7);
        ctx.lineTo(-k * 0.1, k * 0.7);
        ctx.stroke();
        ctx.fillRect(k * 0.32, -k * 0.1, k * 0.36, k * 0.3);
        break;
      case 'target':
        ctx.beginPath();
        ctx.arc(0, 0, k * 0.65, 0, U.TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, k * 0.36, 0, U.TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, k * 0.12, 0, U.TAU);
        ctx.fill();
        break;
      case 'leaf':
        ctx.save();
        ctx.rotate(-0.7);
        Art.leafPath(ctx, k * 0.7);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.moveTo(-k * 0.45, k * 0.45);
        ctx.lineTo(k * 0.4, -k * 0.4);
        ctx.stroke();
        break;
      case 'recycle':
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i * U.TAU) / 3);
          ctx.beginPath();
          ctx.arc(0, 0, k * 0.55, -1.25, -0.25);
          ctx.stroke();
          ctx.beginPath();
          const ax = Math.cos(-0.25) * k * 0.55, ay = Math.sin(-0.25) * k * 0.55;
          ctx.moveTo(ax + k * 0.18, ay - k * 0.05);
          ctx.lineTo(ax - k * 0.02, ay + k * 0.2);
          ctx.lineTo(ax - k * 0.16, ay - k * 0.08);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        break;
      case 'note':
        ctx.beginPath();
        ctx.ellipse(-k * 0.3, k * 0.42, k * 0.22, k * 0.16, -0.4, 0, U.TAU);
        ctx.ellipse(k * 0.38, k * 0.3, k * 0.22, k * 0.16, -0.4, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-k * 0.1, k * 0.4);
        ctx.lineTo(-k * 0.1, -k * 0.6);
        ctx.lineTo(k * 0.58, -k * 0.72);
        ctx.lineTo(k * 0.58, k * 0.28);
        ctx.stroke();
        break;
      case 'star':
        Art.star(ctx, 0, k * 0.05, k * 0.7, k * 0.3);
        ctx.fill();
        break;
      case 'book':
        ctx.beginPath();
        ctx.moveTo(0, -k * 0.4);
        ctx.quadraticCurveTo(-k * 0.4, -k * 0.6, -k * 0.75, -k * 0.45);
        ctx.lineTo(-k * 0.75, k * 0.5);
        ctx.quadraticCurveTo(-k * 0.4, k * 0.35, 0, k * 0.55);
        ctx.quadraticCurveTo(k * 0.4, k * 0.35, k * 0.75, k * 0.5);
        ctx.lineTo(k * 0.75, -k * 0.45);
        ctx.quadraticCurveTo(k * 0.4, -k * 0.6, 0, -k * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.3)';
        ctx.lineWidth = k * 0.08;
        ctx.beginPath();
        ctx.moveTo(0, -k * 0.35);
        ctx.lineTo(0, k * 0.5);
        ctx.stroke();
        break;
      case 'flower':
        for (let i = 0; i < 5; i++) {
          const a = (i * U.TAU) / 5;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * k * 0.34, Math.sin(a) * k * 0.34 - k * 0.1, k * 0.25, 0, U.TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#F6B92B';
        ctx.beginPath();
        ctx.arc(0, -k * 0.1, k * 0.18, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, k * 0.2);
        ctx.lineTo(0, k * 0.75);
        ctx.stroke();
        break;
      case 'bolt':
        ctx.beginPath();
        ctx.moveTo(k * 0.15, -k * 0.75);
        ctx.lineTo(-k * 0.4, k * 0.1);
        ctx.lineTo(-k * 0.02, k * 0.1);
        ctx.lineTo(-k * 0.15, k * 0.75);
        ctx.lineTo(k * 0.42, -k * 0.12);
        ctx.lineTo(k * 0.04, -k * 0.12);
        ctx.closePath();
        ctx.fill();
        break;
      case 'team':
        for (const [dx, sc] of [[-k * 0.42, 0.8], [k * 0.42, 0.8], [0, 1]]) {
          ctx.beginPath();
          ctx.arc(dx, -k * 0.3 * sc, k * 0.17 * sc, 0, U.TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(dx, k * 0.45, k * 0.3 * sc, Math.PI, U.TAU);
          ctx.fill();
        }
        break;
      case 'crown':
        ctx.beginPath();
        ctx.moveTo(-k * 0.65, k * 0.45);
        ctx.lineTo(-k * 0.7, -k * 0.35);
        ctx.lineTo(-k * 0.3, k * 0.0);
        ctx.lineTo(0, -k * 0.55);
        ctx.lineTo(k * 0.3, k * 0.0);
        ctx.lineTo(k * 0.7, -k * 0.35);
        ctx.lineTo(k * 0.65, k * 0.45);
        ctx.closePath();
        ctx.fill();
        break;
      case 'mic':
        U.rr(ctx, -k * 0.2, -k * 0.7, k * 0.4, k * 0.8, k * 0.2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -k * 0.1, k * 0.38, 0.1, Math.PI - 0.1);
        ctx.moveTo(0, k * 0.3);
        ctx.lineTo(0, k * 0.65);
        ctx.moveTo(-k * 0.3, k * 0.67);
        ctx.lineTo(k * 0.3, k * 0.67);
        ctx.stroke();
        break;
      case 'flame':
        ctx.beginPath();
        ctx.moveTo(0, -k * 0.75);
        ctx.bezierCurveTo(k * 0.55, -k * 0.2, k * 0.55, k * 0.65, 0, k * 0.65);
        ctx.bezierCurveTo(-k * 0.55, k * 0.65, -k * 0.5, -k * 0.05, -k * 0.1, -k * 0.25);
        ctx.bezierCurveTo(-k * 0.05, k * 0.05, k * 0.12, -k * 0.2, 0, -k * 0.75);
        ctx.fill();
        break;
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(0, -k * 0.7);
        ctx.lineTo(k * 0.6, -k * 0.45);
        ctx.quadraticCurveTo(k * 0.55, k * 0.4, 0, k * 0.75);
        ctx.quadraticCurveTo(-k * 0.55, k * 0.4, -k * 0.6, -k * 0.45);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, k * 0.5, 0, U.TAU);
        ctx.fill();
    }
    ctx.restore();
  };

  // Медаль-значок в виде картинки (data URL) для интерфейса
  const badgeCache = {};
  Art.badgeImage = function (badge, earned, size = 72) {
    const key = badge.id + (earned ? 1 : 0) + size;
    if (badgeCache[key]) return badgeCache[key];
    const c = U.makeCanvas(size * 2, size * 2);
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    const r = size / 2;
    const col = earned ? badge.color : '#B9B2A8';
    // лента-орнамент по краю: 12 ромбиков
    ctx.translate(r, r);
    ctx.fillStyle = earned ? U.shade(col, -0.25) : '#9C958C';
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      const rr = i % 2 ? r * 0.9 : r * 0.99;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 0.85);
    g.addColorStop(0, U.shade(col, 0.35));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, U.TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, U.TAU);
    ctx.stroke();
    Art.icon(ctx, badge.icon, 0, 0, r * 0.62, earned ? '#fff' : 'rgba(255,255,255,.75)');
    if (!earned) {
      ctx.fillStyle = 'rgba(40,36,40,.55)';
      U.rr(ctx, -r * 0.22, r * 0.22, r * 0.44, r * 0.36, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,36,40,.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, r * 0.22, r * 0.14, Math.PI, U.TAU);
      ctx.stroke();
    }
    const url = c.toDataURL('image/png');
    badgeCache[key] = url;
    return url;
  };
})(window.B);
