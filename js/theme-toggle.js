// Dark/light mode toggle.
// No saved choice = follow the OS. Clicking the button picks a theme
// explicitly and remembers it in localStorage ("theme": "light"|"dark").
(function () {
  'use strict';

  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  var mql = window.matchMedia('(prefers-color-scheme: dark)');

  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return mql.matches ? 'dark' : 'light';
  }

  function render() {
    var dark = effectiveTheme() === 'dark';
    btn.textContent = dark ? '☀️' : '🌙'; // sun / moon
    var label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }

  btn.addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {
      // Private browsing / blocked storage: theme still applies for this visit.
    }
    render();
  });

  // Track OS changes while the visitor hasn't made an explicit choice.
  if (mql.addEventListener) {
    mql.addEventListener('change', render);
  }

  render();
})();
