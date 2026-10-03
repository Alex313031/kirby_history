// parts.js - click-to-load 3D previews for the Service Tools section.
// Each tool shows a static render; only when the visitor clicks "View in 3D"
// do we swap in a live 3mfViewer iframe (keeps the page light - one viewer,
// ~4 MB of wasm/JS, loads on demand instead of four up front).
(function () {
  'use strict';

  // The viewer app lives in parts/vendor/ (index.html + assets + embed.js).
  // Pass it explicitly: embed.js's auto-detection can't see its own <script>
  // tag once create() runs from a click handler, so it would otherwise aim the
  // iframe at this page. baseUrl is resolved against this page's URL.
  var VIEWER_BASE = 'vendor/';

  // Open the viewer in whatever theme the site is currently using, passed as the
  // embed `theme` option (becomes ?theme=... on the iframe URL). The site adds
  // html.dark / html.light when the visitor toggles; with no manual choice we use
  // 'auto' so the viewer follows the OS, same as the site.
  function siteTheme() {
    var h = document.documentElement;
    return h.classList.contains('dark')  ? 'dark'
         : h.classList.contains('light') ? 'light'
         : 'auto';
  }

  function loadViewer(btn) {
    if (typeof window.ThreeMFViewerEmbed === 'undefined') return;  // embed.js missing
    var holder = document.createElement('div');
    holder.className = 'viewer-live';
    btn.replaceWith(holder);
    window.ThreeMFViewerEmbed.create({
      container: holder,
      baseUrl: VIEWER_BASE,
      src: btn.getAttribute('data-src'),   // e.g. "assets/T127.3mf", relative to this page
      theme: siteTheme(),                  // 'light' | 'dark' | 'auto', matches the site
      height: '100%',
    });
  }

  document.querySelectorAll('.view3d').forEach(function (btn) {
    btn.addEventListener('click', function () { loadViewer(btn); }, { once: true });
  });
})();
