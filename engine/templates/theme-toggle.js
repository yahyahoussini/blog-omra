// Light/dark toggle for sites whose default theme is dark (docs/DESIGN.md). Served as /assets/theme-toggle.js
// (the CSP blocks inline scripts). Without a saved choice the page follows prefers-color-scheme (CSS); a click
// locks the chosen theme and keeps it in localStorage for this reader only. No network call.
(function () {
  var root = document.documentElement;
  var button = document.querySelector('.theme-toggle');
  var KEY = 'omra-theme';
  var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
  function current() {
    if (root.hasAttribute('data-theme-lock')) return root.getAttribute('data-theme');
    return prefersLight && prefersLight.matches ? 'light' : 'dark';
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-lock', '');
  }
  function sync() {
    if (!button) return;
    var dark = current() === 'dark';
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }
  try { var saved = window.localStorage.getItem(KEY); if (saved === 'light' || saved === 'dark') apply(saved); } catch (e) { /* storage blocked */ }
  if (!button) return;
  button.hidden = false;
  sync();
  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { window.localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
    sync();
  });
  if (prefersLight && prefersLight.addEventListener) prefersLight.addEventListener('change', sync);
})();
