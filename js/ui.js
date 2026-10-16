/* БРСМ: Команда 212 — HTML-интерфейс: модальные окна, тосты, HUD, иконки */
'use strict';

(function (B) {
  const U = B.U;
  const UI = (B.UI = {});

  const ICONS = {
    pause: '<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    home: '<path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h4.5v-5.5h4V20h4.5V9.8" fill="none"/>',
    retry: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4.5v5h5" fill="none"/>',
    trophy: '<path d="M8 20.5h8M12 16.5v4M7 4h10v5.5a5 5 0 0 1-10 0zM7 6.5H4.2a3 3 0 0 0 3.3 3.6M17 6.5h2.8a3 3 0 0 1-3.3 3.6" fill="none"/>',
    medal: '<path d="M8 3l2.5 6M16 3l-2.5 6" fill="none"/><circle cx="12" cy="15" r="5.5" fill="none"/><path d="M12 12.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z"/>',
    user: '<circle cx="12" cy="8" r="4" fill="none"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" fill="none"/>',
    sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1" fill="none"/><circle cx="15" cy="6.5" r="2" fill="none"/><circle cx="9" cy="12" r="2" fill="none"/><circle cx="17" cy="17.5" r="2" fill="none"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none"/><path d="M12 11v6M12 7.6v.4" fill="none"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none"/>',
    sound: '<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none"/>',
    mute: '<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none"/>',
    music: '<path d="M9 17.5V5.5l10.5-2v12" fill="none"/><circle cx="6.5" cy="17.5" r="2.6"/><circle cx="17" cy="15.5" r="2.6"/>',
    star: '<path d="M12 3.2l2.6 5.5 6 .7-4.45 4.1 1.2 5.9L12 16.4l-5.35 3 1.2-5.9L3.4 9.4l6-.7z"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.2" fill="none"/><circle cx="8.5" cy="11" r="2" fill="none"/><path d="M6 15.5h5M14 10h4.5M14 13.5h3" fill="none"/>',
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z M9 4.5v13M15 6.5v13" fill="none"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5" fill="none"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="15.5" cy="8.5" r="1.3"/><circle cx="8.5" cy="15.5" r="1.3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6" fill="none"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6" fill="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7" fill="none"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" fill="none"/>',
    flame: '<path d="M12 3c3.5 4 6 6.5 6 10.5a6 6 0 0 1-12 0c0-2.4 1-4 2.5-5.5.3 2 1.2 3 2.5 3.5C10.5 8.5 11 6 12 3z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    users: '<circle cx="9" cy="8.5" r="3.3" fill="none"/><path d="M3 19.5a6 6 0 0 1 12 0M15.5 5.5a3.3 3.3 0 0 1 0 6.3M17.5 14a6 6 0 0 1 3.5 5.5" fill="none"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" fill="none"/>',
  };
  UI.icon = (name, cls = '') =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor">${ICONS[name] || ''}</svg>`;

  UI.el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  UI.hud = () => document.getElementById('hud');
  UI.setHud = (html) => {
    const h = UI.hud();
    h.innerHTML = html;
    return h;
  };
  UI.clearHud = () => {
    UI.hud().innerHTML = '';
  };
  UI.screen = () => document.getElementById('screen');
  UI.setScreen = (html) => {
    const s = UI.screen();
    s.innerHTML = html;
    return s;
  };
  UI.clearScreen = () => {
    UI.screen().innerHTML = '';
  };

  // ---------- Модальные окна ----------
  const stack = [];
  UI.modalOpen = () => stack.length > 0;
  UI.topModal = () => stack[stack.length - 1] || null;

  UI.modal = function (opts) {
    const root = document.getElementById('modals');
    const id = 'm' + Math.random().toString(36).slice(2, 8);
    const actions = (opts.actions || [])
      .map(
        (a, i) =>
          `<button type="button" class="btn btn--${a.kind || 'primary'} ${a.cls || ''}" data-act="${i}">${a.icon ? UI.icon(a.icon) : ''}<span>${a.label}</span></button>`
      )
      .join('');
    const el = UI.el(`
      <div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-t">
        <div class="modal__backdrop"></div>
        <div class="modal__card ${opts.wide ? 'modal__card--wide' : ''}">
          <div class="modal__orn" aria-hidden="true"></div>
          ${opts.closable !== false ? `<button type="button" class="modal__x" aria-label="Закрыть">${UI.icon('close')}</button>` : ''}
          ${opts.eyebrow ? `<div class="eyebrow">${opts.eyebrow}</div>` : ''}
          ${opts.title ? `<h2 class="modal__title" id="${id}-t">${opts.title}</h2>` : ''}
          <div class="modal__body"></div>
          ${actions ? `<div class="modal__actions">${actions}</div>` : ''}
        </div>
      </div>`);
    const body = el.querySelector('.modal__body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-open'));
    const handle = {
      el,
      body,
      opts,
      closed: false,
      close(silent) {
        if (handle.closed) return;
        handle.closed = true;
        const i = stack.indexOf(handle);
        if (i >= 0) stack.splice(i, 1);
        el.classList.remove('is-open');
        el.classList.add('is-closing');
        setTimeout(() => el.remove(), 220);
        if (!silent && opts.onClose) opts.onClose();
      },
    };
    el.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = opts.actions[+btn.dataset.act];
        B.Audio.sfx(a.kind === 'ghost' ? 'back' : 'click');
        if (a.keepOpen !== true) handle.close(true);
        if (a.onClick) a.onClick(handle);
      });
    });
    const x = el.querySelector('.modal__x');
    if (x)
      x.addEventListener('click', () => {
        B.Audio.sfx('back');
        handle.close();
      });
    if (opts.closable !== false)
      el.querySelector('.modal__backdrop').addEventListener('click', () => {
        B.Audio.sfx('back');
        handle.close();
      });
    stack.push(handle);
    // фокус на главной кнопке
    setTimeout(() => {
      const f = (opts.focus && el.querySelector(opts.focus)) || el.querySelector('.modal__actions .btn--primary') || el.querySelector('.modal__actions .btn');
      if (f && !U.isTouch()) f.focus({ preventScroll: true });
    }, 60);
    return handle;
  };

  UI.closeAll = () => {
    while (stack.length) stack[stack.length - 1].close(true);
  };

  UI.handleKey = function (e) {
    const top = UI.topModal();
    if (!top) return false;
    if (e.key === 'Escape' && top.opts.closable !== false) {
      B.Audio.sfx('back');
      top.close();
      return true;
    }
    if (top.opts.onKey && top.opts.onKey(e, top)) return true;
    return false;
  };

  UI.confirm = function (text, onYes, opts = {}) {
    return UI.modal({
      title: opts.title || 'Ты уверен?',
      body: `<p class="lead">${text}</p>`,
      actions: [
        { label: opts.no || 'Отмена', kind: 'ghost' },
        { label: opts.yes || 'Да', kind: opts.danger ? 'danger' : 'primary', onClick: onYes },
      ],
    });
  };

  // ---------- Тосты ----------
  UI.toast = function (html, opts = {}) {
    const root = document.getElementById('toasts');
    const el = UI.el(`<div class="toast ${opts.cls || ''}">${html}</div>`);
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 400);
    }, opts.duration || 2600);
    return el;
  };

  UI.badgeToast = function (badge) {
    B.Audio.sfx('badge');
    UI.toast(
      `<img class="toast__badge" src="${B.Art.badgeImage(badge, true, 56)}" alt="">
       <div><div class="toast__eyebrow">Новый значок</div><div class="toast__title">${U.esc(badge.title)}</div></div>`,
      { cls: 'toast--badge', duration: 3400 }
    );
  };

  // Звёзды как HTML
  UI.starsHtml = (n, total = 3, cls = '') =>
    `<span class="stars ${cls}" aria-label="${n} из ${total} звёзд">${Array.from({ length: total }, (_, i) => `<span class="star ${i < n ? 'is-on' : ''}">${UI.icon('star')}</span>`).join('')}</span>`;
})(window.B);
