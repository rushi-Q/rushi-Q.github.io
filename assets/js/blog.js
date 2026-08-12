/* Blog behaviour: like button and in-page links.
 * No dependencies, safe to load on every page (each part no-ops if absent). */
(function () {
  'use strict';

  /* ======================================================================
     Like button
     ====================================================================== */

  var btn = document.querySelector('.like-btn');
  if (btn) {
    initLike(btn);
  }

  function initLike(btn) {
    var slug = btn.getAttribute('data-like-slug') || window.location.pathname;
    var endpoint = (btn.getAttribute('data-like-endpoint') || '').replace(/\/+$/, '');
    var countEl = btn.querySelector('[data-like-count]');
    var labelEl = btn.querySelector('.like-btn__label');
    var storeKey = 'liked:' + slug;
    var liked = false;
    var count = null;
    var inflight = false;

    try {
      liked = window.localStorage.getItem(storeKey) === '1';
    } catch (e) { /* private mode */ }

    paint();

    if (endpoint) {
      fetch(endpoint + '/likes?slug=' + encodeURIComponent(slug), { mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && typeof d.count === 'number') { count = d.count; paint(); }
        })
        .catch(function () { /* offline or worker not deployed yet */ });
    }

    btn.addEventListener('click', function () {
      if (inflight) return;

      liked = !liked;
      try { window.localStorage.setItem(storeKey, liked ? '1' : '0'); } catch (e) {}

      if (typeof count === 'number') {
        count = Math.max(0, count + (liked ? 1 : -1));
      }

      if (liked) {
        btn.classList.remove('is-popping');
        void btn.offsetWidth;               // restart the animation
        btn.classList.add('is-popping');
      }
      paint();

      if (!endpoint) return;
      inflight = true;
      fetch(endpoint + '/likes?slug=' + encodeURIComponent(slug), {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: liked ? 1 : -1 })
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && typeof d.count === 'number') { count = d.count; paint(); }
        })
        .catch(function () {})
        .then(function () { inflight = false; });
    });

    function paint() {
      btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      if (labelEl) labelEl.textContent = liked ? 'Liked' : 'Like';
      if (countEl) countEl.textContent = count === null ? '' : String(count);
      btn.setAttribute(
        'aria-label',
        (liked ? 'Remove your like from this post' : 'Like this post') +
          (count === null ? '' : ' — ' + count + ' so far')
      );
    }
  }

  /* ======================================================================
     Keep in-page and same-site links in this tab

     head.html sets <base target="_blank"> so outbound links open in a new tab.
     Inside a post that would also fire for footnote markers and cross-links,
     which is jarring, so walk them back to _self.
     ====================================================================== */

  var body = document.querySelector('.post__body');
  if (body) {
    var links = body.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.hasAttribute('target')) continue;
      var href = a.getAttribute('href');
      if (href.charAt(0) === '#' || a.hostname === window.location.hostname) {
        a.setAttribute('target', '_self');
      }
    }
  }

})();
