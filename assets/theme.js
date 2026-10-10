/* Dark / light switch for the LED theme.
   Loaded synchronously in <head> so the chosen mode is applied before
   the first paint. The default is the dark panel; a visitor's choice is
   remembered in localStorage. */
(function () {
  'use strict';
  var KEY = 'kw-theme';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function apply(mode) {
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
  }

  var mode = read();
  if (mode !== 'light' && mode !== 'dark') mode = 'dark';
  apply(mode);

  var api = {
    get: function () { return root.getAttribute('data-theme') || 'dark'; },
    set: function (next) {
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* private mode */ }
      document.dispatchEvent(new CustomEvent('kw-theme', { detail: next }));
      sync();
    },
    toggle: function () { api.set(api.get() === 'dark' ? 'light' : 'dark'); }
  };
  window.kwTheme = api;

  function sync() {
    var dark = api.get() === 'dark';
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', dark ? 'false' : 'true');
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  function init() {
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () { api.toggle(); });
    }
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
