// Rowspan-aware hover for the Service Manual column.
// A cell with rowspan belongs only to its first <tr>, so the CSS row-hover
// can't highlight it from the other rows it covers. This maps every row to
// the service cell covering it and toggles a highlight class on hover.
(function () {
  'use strict';

  var rows = document.querySelectorAll('table.wikitable tbody tr');
  var current = null;
  var remaining = 0;

  rows.forEach(function (tr) {
    var own = tr.querySelector('td.service');
    if (own) {
      current = own;
      remaining = own.rowSpan;
    }
    if (current && remaining > 0) {
      var cell = current;
      tr.addEventListener('mouseenter', function () {
        cell.classList.add('svc-hl');
      });
      tr.addEventListener('mouseleave', function () {
        cell.classList.remove('svc-hl');
      });
      remaining--;
    }
  });
})();

// Horizontal-scroll shadows for wide tables. Each .table-wrap is wrapped in a
// non-scrolling .table-scroll host whose ::before/::after draw edge shadows
// (css/main.css); we flag data-scroll-left / -right on the host as the wrap
// scrolls, so a shadow shows only on the side with more table hidden and fades
// out at each end. Progressive enhancement: with no JS the table still scrolls,
// just without the cue.
(function () {
  'use strict';

  function sync(wrap, host) {
    var max = wrap.scrollWidth - wrap.clientWidth;
    // 1px slack so sub-pixel widths don't leave a shadow stuck on at an end
    if (wrap.scrollLeft > 1) {
      host.setAttribute('data-scroll-left', '');
    } else {
      host.removeAttribute('data-scroll-left');
    }
    if (wrap.scrollLeft < max - 1) {
      host.setAttribute('data-scroll-right', '');
    } else {
      host.removeAttribute('data-scroll-right');
    }
  }

  var pairs = [];
  document.querySelectorAll('.table-wrap').forEach(function (wrap) {
    var host = document.createElement('div');
    host.className = 'table-scroll';
    wrap.parentNode.insertBefore(host, wrap);
    host.appendChild(wrap);
    pairs.push({ wrap: wrap, host: host });
    sync(wrap, host);
    wrap.addEventListener('scroll', function () { sync(wrap, host); }, { passive: true });
  });
  window.addEventListener('resize', function () {
    pairs.forEach(function (p) { sync(p.wrap, p.host); });
  });
})();

// Footnote popups: (1) Escape dismisses an open popup without moving the pointer
// or focus (WCAG 1.4.13); (2) flip the popup above its marker when it would
// otherwise clip off the bottom of the viewport (e.g. a bottom-row [a] on a
// phone). CSS (css/main.css) shows popups on hover/focus and provides the
// .fn-up / .fn-dismissed states; this just decides when to apply them.
(function () {
  'use strict';

  var refs = document.querySelectorAll('.fn-ref');
  if (!refs.length) {
    return;
  }

  // Choose up vs. down each time a popup is about to show: measure it in the
  // default (downward) spot, and flip up only if it clips the viewport bottom
  // AND there's room for it above the marker.
  function place(ref) {
    var pop = ref.querySelector('.fn-pop');
    if (!pop) {
      return;
    }
    ref.classList.remove('fn-dismissed'); // a fresh open is never pre-dismissed
    pop.classList.remove('fn-up');
    requestAnimationFrame(function () {
      var popRect = pop.getBoundingClientRect();
      var refRect = ref.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (popRect.bottom > vh && refRect.top > popRect.height) {
        pop.classList.add('fn-up');
      }
    });
  }

  refs.forEach(function (ref) {
    ref.addEventListener('mouseenter', function () { place(ref); });
    ref.addEventListener('focusin', function () { place(ref); });
    // once the pointer/focus leaves, clear any Esc-dismiss so it can reopen
    ref.addEventListener('mouseleave', function () { ref.classList.remove('fn-dismissed'); });
    ref.addEventListener('focusout', function () { ref.classList.remove('fn-dismissed'); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') {
      return;
    }
    var open = document.querySelector('.fn-ref:hover, .fn-ref:focus-within');
    if (!open) {
      return;
    }
    open.classList.add('fn-dismissed');
    var btn = open.querySelector('button');
    if (btn) {
      btn.blur();
    }
  });
})();
