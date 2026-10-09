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
    if (!btn.isConnected) return;  // already loaded (observer + click can both fire)
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
    // Cover the booting iframe with a themed "Loading..." overlay (appended AFTER
    // create() so it sits on top regardless of how the embed fills the holder).
    // Removed once the iframe fires 'load'; the timeout is a safety net so a
    // missed event can never strand the overlay over a working viewer.
    var loading = document.createElement('div');
    loading.className = 'viewer-loading';
    loading.textContent = 'Loading 3D viewer…';
    holder.appendChild(loading);
    var removeOverlay = function () {
      loading.style.opacity = '0';
      setTimeout(function () {
        if (loading.parentNode) loading.parentNode.removeChild(loading);
      }, 200);
    };
    var iframe = holder.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', removeOverlay, { once: true });
    }
    setTimeout(removeOverlay, 8000);
  }

  document.querySelectorAll('.view3d').forEach(function (btn) {
    btn.addEventListener('click', function () { loadViewer(btn); }, { once: true });
  });

  // Desktop only: lazy-load each viewer as it scrolls into view (rootMargin starts it
  // a bit early) so previews are ready without a click. Mobile/touch stays click-to-load
  // on purpose - it saves cellular data and, on iOS Safari, dodges its low ceiling on
  // simultaneous WebGL contexts (four auto-loaded viewers overflow it and silently fail).
  // Gate = a real mouse (hover + fine pointer) AND not a mobile/iOS UA. The UA check is
  // what catches iPadOS 13+, which reports itself as "MacIntel" with touch points, so it
  // would otherwise sneak through the pointer test as a "desktop".
  function desktopLazyLoadOK() {
    var ua = navigator.userAgent || '';
    var isIOS = /iP(hone|od|ad)/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isMobileUA = /Android|Mobi|iP(hone|od|ad)/.test(ua);
    var hasMouse = !!(window.matchMedia &&
                      window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    return hasMouse && !isIOS && !isMobileUA;
  }

  if (desktopLazyLoadOK() && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        loadViewer(e.target);
      });
    }, { rootMargin: '300px 0px' });
    document.querySelectorAll('.view3d').forEach(function (btn) { io.observe(btn); });
  }

  // "Full Size" links open the viewer full-tab (?embed=quick&src=...); tack on the
  // current site theme so the full view opens matching, same as the inline previews.
  document.querySelectorAll('a.view3d-full').forEach(function (a) {
    if (a.href.indexOf('theme=') < 0) a.href += '&theme=' + siteTheme();
  });
})();
