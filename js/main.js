/* БРСМ: Команда 212 — запуск */
'use strict';

(function (B) {
  const Art = B.Art;

  B.applySettings = function () {
    const s = B.settings;
    B.Audio.soundOn = !!s.sound;
    B.Audio.musicOn = !!s.music;
    B.Audio.apply();
  };

  function boot() {
    B.Save.load();
    B.applySettings();
    const orn = Art.ornamentURL(2, '#FFE08A');
    if (orn) document.documentElement.style.setProperty('--orn', `url(${orn})`);
    B.App.init();

    // Музыка может стартовать только после первого касания
    let unlocked = false;
    const firstGesture = () => {
      if (unlocked) return;
      unlocked = true;
      B.Audio.unlock();
      const sc = B.App.scene;
      if (sc && sc.music && !B.Audio.currentMusic) B.Audio.playMusic(sc.music);
    };
    window.addEventListener('pointerdown', firstGesture, true);
    window.addEventListener('keydown', firstGesture, true);

    // При обновлении страницы в просмотрщике возвращаемся туда же (карта или заставка)
    const hot = window.claude && window.claude.hot;
    if (hot && hot.snapshot) hot.snapshot(() => ({ scene: B.App.sceneName && B.App.sceneName !== 'title' ? 'hub' : 'title' }));
    const begin = (data) => {
      Art.clearFlagCache();
      const bootEl = document.getElementById('boot');
      bootEl.classList.add('is-done');
      setTimeout(() => bootEl.remove(), 600);
      const hash = (location.hash || '').replace('#', '');
      const target = (data && data.scene) || hash;
      if (target && B.Scenes[target] && target !== 'title' && B.Save.profile()) B.App.go(target, null, { instant: true });
      else B.App.go('title', null, { instant: true });
    };
    const start = () => {
      if (hot && hot.ready) hot.ready((d) => begin(d || {}));
      else begin((hot && hot.data) || {});
    };
    const fonts = document.fonts && document.fonts.load
      ? Promise.all([
          document.fonts.load(`900 40px Unbounded`),
          document.fonts.load(`700 40px Unbounded`),
          document.fonts.load(`600 16px "Golos Text"`),
          document.fonts.load(`800 16px "Golos Text"`),
        ]).catch(() => null)
      : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 2600));
    Promise.race([fonts, timeout]).then(() => setTimeout(start, 250));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.B);
