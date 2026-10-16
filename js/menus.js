/* БРСМ: Команда 212 — меню: профиль, рекорды, значки, настройки, билет */
'use strict';

(function (B) {
  const U = B.U, UI = B.UI, D = B.Data, Art = B.Art, Save = B.Save;
  const M = (B.Menus = {});

  // ---------------------------------------------------------------
  // Редактор персонажа
  // ---------------------------------------------------------------
  M.profileEditor = function (opts = {}) {
    const existing = opts.edit ? Save.profile() : null;
    const av = existing ? Object.assign({}, existing.av) : Art.randomAvatar();
    let name = existing ? existing.name : '';
    let pose = 'wave', poseT = 0;

    const sw = (key, colors) =>
      colors
        .map((c, i) => `<button type="button" class="swatch" data-k="${key}" data-v="${i}" style="--c:${c}" aria-label="Цвет ${i + 1}"></button>`)
        .join('');
    const body = UI.el(`
      <div class="editor">
        <div class="editor__stage"><canvas class="editor__canvas" aria-label="Твой персонаж"></canvas></div>
        <div class="editor__form">
          <label class="field">
            <span class="field__label">Как тебя зовут?</span>
            <input id="pf-name" class="field__input" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Имя или ник" value="${U.esc(name)}">
            <span class="field__err" hidden>Впиши имя — оно появится в рекордах и в билете</span>
          </label>
          <div class="opt"><span class="opt__label">Кожа</span><div class="opt__row">${sw('skin', Art.SKIN)}</div></div>
          <div class="opt"><span class="opt__label">Причёска</span><div class="opt__row">${Art.HAIR_NAMES.map((n, i) => `<button type="button" class="chip" data-k="hair" data-v="${i}">${n}</button>`).join('')}</div></div>
          <div class="opt"><span class="opt__label">Цвет волос</span><div class="opt__row">${sw('hairColor', Art.HAIR.slice(0, 6))}</div></div>
          <div class="opt"><span class="opt__label">Куртка</span><div class="opt__row">${sw('jacket', Art.JACKET)}</div></div>
          <div class="opt"><span class="opt__label">Очки</span><div class="opt__row"><button type="button" class="chip" data-k="glasses" data-v="0">Без очков</button><button type="button" class="chip" data-k="glasses" data-v="1">В очках</button></div></div>
        </div>
      </div>`);

    const sync = () => {
      body.querySelectorAll('[data-k]').forEach((b) => {
        const k = b.dataset.k, v = +b.dataset.v;
        const cur = k === 'glasses' ? (av.glasses ? 1 : 0) : av[k];
        b.classList.toggle('is-on', cur === v);
        b.setAttribute('aria-pressed', cur === v ? 'true' : 'false');
      });
    };
    body.querySelectorAll('[data-k]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.k, v = +b.dataset.v;
        if (k === 'glasses') av.glasses = !!v;
        else av[k] = v;
        pose = 'wave';
        poseT = 0;
        B.Audio.sfx('tap');
        sync();
      })
    );
    sync();

    const canvas = body.querySelector('canvas');
    let alive = true;
    const draw = (now) => {
      if (!alive) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || 200, h = canvas.clientHeight || 220;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // подиум
      ctx.fillStyle = 'rgba(30,26,29,.12)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.86, w * 0.3, h * 0.05, 0, 0, U.TAU);
      ctx.fill();
      const t = now / 1000;
      poseT += 1 / 60;
      if (pose === 'wave' && poseT > 1.4) pose = 'idle';
      const s = Math.min(w / 70, (h * 0.76) / 118);
      Art.avatar(ctx, w / 2, h * 0.86, s, av, { kind: pose, t, phase: t * 9, shadow: false });
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    const input = body.querySelector('#pf-name');
    const err = body.querySelector('.field__err');
    input.addEventListener('input', () => {
      err.hidden = true;
    });

    const submit = (h) => {
      const v = input.value.trim().replace(/\s+/g, ' ');
      if (!v) {
        err.hidden = false;
        input.focus();
        input.classList.add('is-shake');
        setTimeout(() => input.classList.remove('is-shake'), 400);
        B.Audio.sfx('wrong');
        return;
      }
      alive = false;
      h.close(true);
      if (existing) {
        existing.name = v;
        existing.av = av;
        Save.save();
      } else Save.createProfile(v, av);
      B.Audio.sfx('unlock');
      if (opts.onDone) opts.onDone();
    };

    const h = UI.modal({
      eyebrow: existing ? 'Профиль' : 'Новый участник',
      title: existing ? 'Твой персонаж' : 'Создай персонажа',
      cls: 'modal--editor',
      wide: true,
      closable: !!opts.closable,
      body,
      actions: [
        {
          label: 'Случайно', kind: 'ghost', icon: 'dice', keepOpen: true,
          onClick: () => {
            Object.assign(av, Art.randomAvatar());
            pose = 'wave';
            poseT = 0;
            sync();
          },
        },
        { label: existing ? 'Сохранить' : 'Готово', kind: 'primary', icon: 'check', keepOpen: true, onClick: (hh) => submit(hh) },
      ],
      focus: '#pf-name',
      onClose: () => {
        alive = false;
        if (opts.onCancel) opts.onCancel();
      },
      onKey: (e, hh) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit(hh);
          return true;
        }
        return false;
      },
    });
    if (!U.isTouch()) setTimeout(() => input.focus(), 80);
    return h;
  };

  // ---------------------------------------------------------------
  // Выбор игрока
  // ---------------------------------------------------------------
  M.players = function (onPicked) {
    const list = Save.profiles();
    const cur = Save.data.current;
    const body = UI.el(`<div class="players">${list
      .map(
        (p) => `
      <div class="player ${p.id === cur ? 'is-current' : ''}" data-id="${p.id}">
        <canvas class="player__pic" width="56" height="56"></canvas>
        <div class="player__info"><b>${U.esc(p.name)}</b><span>${D.rankFor(Save.totalStars(p)).rank.title} · ${Save.totalStars(p)}★</span></div>
        <button type="button" class="btn btn--small btn--${p.id === cur ? 'ghost' : 'primary'}" data-pick="${p.id}">${p.id === cur ? 'Сейчас играет' : 'Выбрать'}</button>
      </div>`
      )
      .join('')}</div>`);
    body.querySelectorAll('.player').forEach((row) => {
      const p = Save.data.profiles[row.dataset.id];
      Art.portrait(row.querySelector('canvas'), p.av, { size: 56, bg: '#F3E6CF' });
    });
    const h = UI.modal({
      eyebrow: 'Это устройство',
      title: 'Игроки',
      body,
      actions: [{ label: 'Новый игрок', kind: 'gold', icon: 'user', onClick: () => M.profileEditor({ closable: true, onDone: onPicked }) }],
    });
    body.querySelectorAll('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        Save.switchProfile(b.dataset.pick);
        B.Audio.sfx('click');
        h.close(true);
        if (onPicked) onPicked();
      })
    );
  };

  // ---------------------------------------------------------------
  // Рекорды
  // ---------------------------------------------------------------
  M.leaderboard = function (gameId) {
    let active = gameId || D.MISSIONS[0].id;
    const body = UI.el(`<div class="board">
      <div class="tabs" role="tablist">${D.MISSIONS.map((m) => `<button type="button" role="tab" class="tab" data-g="${m.id}" style="--c:${m.color}">${m.title}</button>`).join('')}</div>
      <ol class="board__list"></ol>
      <p class="muted small">Рекорды хранятся на этом устройстве. Играйте по очереди на одном компьютере — и соревнуйтесь всем классом!</p>
    </div>`);
    const render = () => {
      body.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.g === active ? 'true' : 'false'));
      const m = D.missionById(active);
      const rows = (Save.data.board[active] || []).slice(0, 10);
      const me = Save.data.current;
      body.querySelector('.board__list').innerHTML = rows.length
        ? rows
            .map(
              (r, i) => `<li class="${r.pid === me ? 'is-me' : ''}"><span class="board__pos">${i + 1}</span><span class="board__name">${U.esc(r.name)}${r.label ? `<small>${U.esc(r.label)}</small>` : ''}</span><b class="board__score">${U.fmt(r.score)}</b><span class="board__date">${U.dateStr(r.date)}</span></li>`
            )
            .join('')
        : `<li class="board__empty">Пока пусто. Сыграй в «${m.title}» и стань первым!</li>`;
    };
    body.querySelectorAll('.tab').forEach((t) =>
      t.addEventListener('click', () => {
        active = t.dataset.g;
        B.Audio.sfx('tap');
        render();
      })
    );
    render();
    UI.modal({ eyebrow: 'Зал славы', title: 'Рекорды', body, wide: true });
  };

  // ---------------------------------------------------------------
  // Значки
  // ---------------------------------------------------------------
  M.badges = function () {
    const p = Save.profile();
    const got = D.BADGES.filter((b) => p && p.badges[b.id]).length;
    const body = UI.el(`<div>
      <p class="lead">Собрано <b>${got}</b> из ${D.BADGES.length}. Значки дают за особые достижения в миссиях.</p>
      <div class="badges">${D.BADGES.map((b) => {
        const e = p && p.badges[b.id];
        return `<div class="badge ${e ? 'is-earned' : ''}"><img src="${Art.badgeImage(b, !!e, 72)}" alt=""><b>${U.esc(b.title)}</b><span>${U.esc(b.desc)}</span>${e ? `<small>${U.dateStr(e)}</small>` : ''}</div>`;
      }).join('')}</div></div>`);
    UI.modal({ eyebrow: 'Коллекция', title: 'Значки', body, wide: true });
  };

  // ---------------------------------------------------------------
  // Настройки
  // ---------------------------------------------------------------
  M.settings = function (onChange) {
    const s = B.settings;
    const toggle = (id, label, desc) => `
      <label class="toggle">
        <span><b>${label}</b><small>${desc}</small></span>
        <input type="checkbox" id="${id}" ${s[id.replace('set-', '')] ? 'checked' : ''}>
        <span class="toggle__ui" aria-hidden="true"></span>
      </label>`;
    const p = Save.profile();
    const body = UI.el(`<div class="settings">
      ${toggle('set-sound', 'Звук', 'Все звуки и музыка')}
      ${toggle('set-music', 'Фоновая музыка', 'Мелодии на карте и в миссиях')}
      ${toggle('set-reduceMotion', 'Меньше тряски', 'Слабее трясётся экран при ударах')}
      <div class="settings__group">
        <div class="eyebrow">Игрок${p ? `: ${U.esc(p.name)}` : ''}</div>
        <div class="settings__btns">
          <button type="button" class="btn btn--ghost btn--small" data-a="edit">${UI.icon('user')}<span>Изменить персонажа</span></button>
          <button type="button" class="btn btn--ghost btn--small" data-a="players">${UI.icon('users')}<span>Сменить игрока</span></button>
          <button type="button" class="btn btn--danger btn--small" data-a="reset">${UI.icon('trash')}<span>Сбросить прогресс</span></button>
        </div>
      </div>
      ${document.fullscreenEnabled || document.webkitFullscreenEnabled ? `<button type="button" class="btn btn--gold btn--small" data-a="fs">${UI.icon('arrow')}<span>${document.fullscreenElement ? 'Выйти из полного экрана' : 'Во весь экран'}</span></button>` : ''}
    </div>`);
    body.querySelectorAll('input[type=checkbox]').forEach((inp) =>
      inp.addEventListener('change', () => {
        const k = inp.id.replace('set-', '');
        s[k] = inp.checked;
        Save.save();
        B.applySettings();
        B.Audio.sfx('tap');
      })
    );
    const h = UI.modal({ eyebrow: 'Параметры', title: 'Настройки', body });
    body.querySelector('[data-a=edit]').addEventListener('click', () => {
      h.close(true);
      M.profileEditor({ edit: true, closable: true, onDone: onChange });
    });
    body.querySelector('[data-a=players]').addEventListener('click', () => {
      h.close(true);
      M.players(onChange);
    });
    const fs = body.querySelector('[data-a=fs]');
    if (fs)
      fs.addEventListener('click', () => {
        const de = document.documentElement;
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else (de.requestFullscreen || de.webkitRequestFullscreen).call(de).catch(() => UI.toast('Полный экран недоступен в этом браузере'));
        } catch (e) {
          UI.toast('Полный экран недоступен в этом браузере');
        }
        h.close(true);
      });
    body.querySelector('[data-a=reset]').addEventListener('click', () => {
      UI.confirm(
        'Все звёзды, рекорды и значки этого игрока исчезнут. Персонаж и имя останутся.',
        () => {
          Save.resetProfile();
          h.close(true);
          UI.toast('Прогресс сброшен. Всё с чистого листа!');
          if (onChange) onChange();
        },
        { title: 'Сбросить прогресс?', yes: 'Сбросить', danger: true }
      );
    });
  };

  // ---------------------------------------------------------------
  // Об игре и о БРСМ
  // ---------------------------------------------------------------
  M.about = function () {
    UI.modal({
      eyebrow: 'Об игре',
      title: 'БРСМ: Команда 212',
      wide: true,
      body: `
        <div class="about">
          <p class="lead">Игра о <b>Белорусском республиканском союзе молодёжи</b>, созданная для учеников ${D.SCHOOL.name} (${D.SCHOOL.address}).</p>
          <div class="about__grid">
            <div>
              <h3>Что такое БРСМ</h3>
              <p>Крупнейшая молодёжная организация Беларуси. Решение о её создании приняли 6 сентября 2002 года, когда объединились БПСМ и БСМ. Вступить можно с 14 до 31 года.</p>
              <p>Направления, о которых эта игра: волонтёрство («Доброе Сердце»), студенческие отряды, экология, творчество и память о героях.</p>
            </div>
            <div>
              <h3>Как играть</h3>
              <p>На карте микрорайона пять миссий. За каждую можно получить до трёх звёзд. Звёзды повышают твоё звание — от новичка до легенды школы. С шести звёзд открывается игровой билет команды 212.</p>
              <p>Загляни к мемориалу: там история Героя Советского Союза В. Е. Лобанка, чьё имя носит пионерская дружина школы.</p>
            </div>
          </div>
          <p class="muted small">Неофициальная фан-игра, сделанная для школы. Не является ресурсом ОО «БРСМ». Вся графика и музыка созданы кодом прямо в браузере. Прогресс хранится только на этом устройстве.</p>
        </div>`,
    });
  };

  // ---------------------------------------------------------------
  // Игровой билет (сертификат)
  // ---------------------------------------------------------------
  M.drawCard = function (canvas, p) {
    const W = 1000, H = 620;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const stars = Save.totalStars(p);
    const rank = D.rankFor(stars).rank;
    const badges = Object.keys(p.badges).length;
    // фон-лён
    ctx.fillStyle = '#FFF7EA';
    ctx.fillRect(0, 0, W, H);
    const rnd = U.rng(7);
    ctx.fillStyle = 'rgba(160,120,80,.05)';
    for (let i = 0; i < 2200; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 1);
    // полоса у края — как у флага
    ctx.fillStyle = '#C8202C';
    ctx.fillRect(0, 0, 96, H);
    const strip = Art.ornamentStrip(6, '#FFF7EA');
    ctx.save();
    ctx.translate(96, 0);
    ctx.rotate(Math.PI / 2);
    for (let x = 0; x < H; x += strip.width) ctx.drawImage(strip, x, 0, strip.width, strip.height);
    ctx.restore();
    // зелёная дуга внизу
    ctx.fillStyle = '#0E8A4E';
    ctx.beginPath();
    ctx.moveTo(96, H);
    ctx.lineTo(96, H - 46);
    ctx.quadraticCurveTo(W * 0.55, H - 120, W, H - 46);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    // рамка
    ctx.strokeStyle = '#1E1A1D';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    // заголовок
    ctx.fillStyle = '#1E1A1D';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 54px ${B.FONT_DISPLAY}`;
    ctx.fillText('КОМАНДА 212', 140, 96);
    ctx.font = `600 22px ${B.FONT_BODY}`;
    ctx.fillStyle = '#7A5A3A';
    ctx.fillText('ИГРОВОЙ БИЛЕТ УЧАСТНИКА · «БРСМ: КОМАНДА 212»', 142, 132);
    // портрет
    const pc = document.createElement('canvas');
    Art.portrait(pc, p.av, { size: 220, bg: '#F3E1C2' });
    ctx.save();
    ctx.beginPath();
    ctx.arc(250, 300, 110, 0, U.TAU);
    ctx.fillStyle = '#F3E1C2';
    ctx.fill();
    ctx.clip();
    ctx.drawImage(pc, 140, 190, 220, 220);
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#F6B92B';
    ctx.beginPath();
    ctx.arc(250, 300, 112, 0, U.TAU);
    ctx.stroke();
    // имя и звание
    ctx.fillStyle = '#1E1A1D';
    let fs = 56;
    ctx.font = `900 ${fs}px ${B.FONT_DISPLAY}`;
    while (ctx.measureText(p.name).width > 560 && fs > 26) {
      fs -= 2;
      ctx.font = `900 ${fs}px ${B.FONT_DISPLAY}`;
    }
    ctx.fillText(p.name, 400, 245);
    ctx.fillStyle = '#C8202C';
    ctx.font = `700 30px ${B.FONT_DISPLAY}`;
    ctx.fillText(rank.title.toUpperCase(), 402, 292);
    // статистика
    const stat = (x, label, value) => {
      ctx.fillStyle = '#1E1A1D';
      ctx.font = `900 40px ${B.FONT_DISPLAY}`;
      ctx.fillText(value, x, 368);
      ctx.fillStyle = '#7A5A3A';
      ctx.font = `600 18px ${B.FONT_BODY}`;
      ctx.fillText(label, x, 396);
    };
    stat(402, 'звёзд из 15', String(stars));
    stat(572, 'значков из ' + D.BADGES.length, String(badges));
    const played = D.MISSIONS.filter((m) => p.games[m.id] && p.games[m.id].plays).length;
    stat(762, 'миссий из 5', String(played));
    // школа
    ctx.fillStyle = '#1E1A1D';
    ctx.font = `600 20px ${B.FONT_BODY}`;
    ctx.fillText(D.SCHOOL.name, 142, 470);
    ctx.fillStyle = '#7A5A3A';
    ctx.fillText(D.SCHOOL.address + ' · выдан ' + U.dateStr(Date.now()), 142, 498);
    // печать
    ctx.save();
    ctx.translate(880, 150);
    ctx.rotate(-0.18);
    ctx.strokeStyle = 'rgba(200,32,44,.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, U.TAU);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, U.TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,32,44,.85)';
    ctx.font = `900 30px ${B.FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('212', 0, 4);
    for (let i = 0; i < 3; i++) {
      Art.star(ctx, -24 + i * 24, -30, 7, 3);
      ctx.fill();
    }
    ctx.font = `700 11px ${B.FONT_BODY}`;
    ctx.fillText('КОМАНДА', 0, 32);
    ctx.restore();
    // подпись
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = `500 15px ${B.FONT_BODY}`;
    ctx.fillText('Игровой сертификат. Не является официальным документом ОО «БРСМ».', 142, H - 18);
  };

  M.card = function () {
    const p = Save.profile();
    if (!p) return;
    const stars = Save.totalStars(p);
    const need = D.RANKS[2].stars;
    if (stars < need) {
      UI.modal({
        eyebrow: 'Игровой билет',
        title: 'Билет пока закрыт',
        body: `<p class="lead">Собери <b>${need} звёзд</b>, чтобы получить звание «${D.RANKS[2].title}» и именной билет команды 212.</p>
          <div class="progress"><div class="progress__bar" style="width:${(stars / need) * 100}%"></div></div>
          <p class="muted">Сейчас: ${stars} из ${need}</p>`,
        actions: [{ label: 'Понятно', kind: 'primary' }],
      });
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'card-canvas';
    M.drawCard(canvas, p);
    const body = UI.el('<div class="card-wrap"></div>');
    body.appendChild(canvas);
    body.appendChild(UI.el('<p class="muted small">Если файл не скачивается, сделай скриншот экрана.</p>'));
    UI.modal({
      eyebrow: 'Игровой билет',
      title: 'Команда 212',
      wide: true,
      cls: 'modal--card',
      body,
      actions: [
        {
          label: 'Скачать PNG', kind: 'primary', icon: 'download', keepOpen: true,
          onClick: async () => {
            const filename = `komanda-212-${p.name.replace(/[^\wА-Яа-яЁё-]+/g, '_')}.png`;
            // Внутри просмотрщика Claude файл отдаётся через его окно сохранения
            const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
            if (dl) {
              const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
              try {
                await dl.save({ filename, data: blob });
                UI.toast('Билет сохранён!');
              } catch (e) {
                if (!e || e.code !== 'declined') UI.toast('Не получилось сохранить файл — сделай скриншот.');
              }
              return;
            }
            try {
              const a = document.createElement('a');
              a.download = filename;
              a.href = canvas.toDataURL('image/png');
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (e) {
              UI.toast('Не получилось сохранить файл — сделай скриншот.');
            }
          },
        },
      ],
    });
  };
})(window.B);
