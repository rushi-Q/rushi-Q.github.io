/* Comments: anonymous, named, or GitHub-verified.
 *
 * Everything user-supplied is written with textContent — never innerHTML — so a
 * comment body can never inject markup. Backed by the Cloudflare Worker in
 * docs/worker.js. */
(function () {
  'use strict';

  var root = document.getElementById('comments');
  if (!root) return;

  var endpoint = (root.getAttribute('data-comments-endpoint') || '').replace(/\/+$/, '');
  var slug = root.getAttribute('data-comments-slug') || window.location.pathname;
  if (!endpoint) return;

  var thread = root.querySelector('[data-comments-thread]');
  var stateEl = root.querySelector('[data-comments-state]');
  var countEl = root.querySelector('[data-comments-count]');
  var form = root.querySelector('[data-comment-form]');
  var bodyEl = form.querySelector('[name="body"]');
  var nameEl = form.querySelector('[name="name"]');
  var siteEl = form.querySelector('[name="website"]');
  var trapEl = form.querySelector('[name="url2"]');
  var errEl = root.querySelector('[data-comment-error]');
  var hintEl = root.querySelector('[data-comment-hint]');
  var submitEl = form.querySelector('.comment-form__submit');
  var anonBox = root.querySelector('[data-identity-anon]');
  var ghBox = root.querySelector('[data-identity-gh]');
  var ghSignin = root.querySelector('[data-gh-signin]');
  var ghSignout = root.querySelector('[data-gh-signout]');
  var ghAvatar = root.querySelector('[data-gh-avatar]');
  var ghLogin = root.querySelector('[data-gh-login]');

  var TOKEN_KEY = 'gh-session';
  var NAME_KEY = 'comment-name';
  var me = null;
  var sending = false;

  /* ---------------------------------------------------------------- utils */

  function store(k, v) {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {}
  }
  function read(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function token() { return read(TOKEN_KEY); }

  function fail(msg) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* Turn bare URLs into links without ever touching innerHTML. */
  var URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;
  function linkify(text) {
    var frag = document.createDocumentFragment();
    var last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.href = m[1];
      a.textContent = m[1];
      a.rel = 'nofollow ugc noopener';
      frag.appendChild(a);
      last = m.index + m[1].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }

  /* A stable tint per name — four steps of the site's one accent, nothing more. */
  function tintClass(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return ' c-avatar--t' + (1 + (h % 4));
  }

  /* ---------------------------------------------------------------- render */

  function avatar(c) {
    if (c.gh && c.gh.avatar) {
      var img = document.createElement('img');
      img.className = 'c-avatar c-avatar--img';
      img.src = c.gh.avatar;
      img.alt = '';
      img.width = 30;
      img.height = 30;
      img.loading = 'lazy';
      return img;
    }
    var span = document.createElement('span');
    span.className = 'c-avatar';
    span.setAttribute('aria-hidden', 'true');
    if (c.name) {
      span.textContent = c.name.trim().charAt(0).toUpperCase();
      span.className += tintClass(c.name);
      span.removeAttribute('aria-hidden');
      span.setAttribute('role', 'presentation');
    } else {
      span.className += ' c-avatar--anon';
    }
    return span;
  }

  function render(list) {
    thread.textContent = '';
    countEl.textContent = list.length ? String(list.length) : '';

    if (!list.length) {
      var li = document.createElement('li');
      li.className = 'comments__state';
      li.textContent = 'No comments yet — yours would be the first.';
      thread.appendChild(li);
      return;
    }

    list.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'c-item';

      li.appendChild(avatar(c));

      var main = document.createElement('div');
      main.className = 'c-main';

      var head = document.createElement('p');
      head.className = 'c-head';

      var who = document.createElement('span');
      who.className = 'c-name';
      if (c.gh && c.gh.login) {
        var a = document.createElement('a');
        a.href = c.gh.url || ('https://github.com/' + c.gh.login);
        a.textContent = c.gh.login;
        who.appendChild(a);
        var badge = document.createElement('span');
        badge.className = 'c-badge';
        badge.textContent = 'GitHub';
        who.appendChild(badge);
      } else if (c.website && c.name) {
        var w = document.createElement('a');
        w.href = c.website;
        w.rel = 'nofollow ugc noopener';
        w.textContent = c.name;
        who.appendChild(w);
      } else if (c.name) {
        who.textContent = c.name;
      } else {
        who.textContent = 'Anonymous';
        who.className += ' c-name--anon';
      }
      head.appendChild(who);

      var time = document.createElement('time');
      time.className = 'c-time';
      time.dateTime = c.at || '';
      time.textContent = when(c.at);
      head.appendChild(time);

      main.appendChild(head);

      var body = document.createElement('div');
      body.className = 'c-body';
      String(c.body || '').split(/\n{2,}/).forEach(function (para) {
        var p = document.createElement('p');
        para.split('\n').forEach(function (line, i) {
          if (i) p.appendChild(document.createElement('br'));
          p.appendChild(linkify(line));
        });
        body.appendChild(p);
      });
      main.appendChild(body);

      li.appendChild(main);
      thread.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------- github */

  function showIdentity() {
    if (me) {
      anonBox.hidden = true;
      ghBox.hidden = false;
      ghSignin.hidden = true;
      ghAvatar.src = me.avatar || '';
      ghLogin.textContent = me.login;
      hintEl.textContent = '';
      var b = document.createElement('b');
      b.textContent = me.login;
      hintEl.appendChild(document.createTextNode('Posting as '));
      hintEl.appendChild(b);
      hintEl.appendChild(document.createTextNode(' — verified.'));
    } else {
      anonBox.hidden = false;
      ghBox.hidden = true;
      updateHint();
    }
  }

  function updateHint() {
    if (me) return;
    hintEl.textContent = '';
    var b = document.createElement('b');
    b.textContent = nameEl.value.trim() || 'Anonymous';
    hintEl.appendChild(document.createTextNode('Posting as '));
    hintEl.appendChild(b);
    hintEl.appendChild(document.createTextNode('.'));
  }

  function claimHashToken() {
    var m = /[#&]gh=([A-Za-z0-9]+)/.exec(window.location.hash);
    if (m) {
      store(TOKEN_KEY, m[1]);
      history.replaceState(null, '', window.location.pathname + window.location.search + '#comments');
      return true;
    }
    if (/[#&]gh_error=/.test(window.location.hash)) {
      fail('GitHub sign-in did not complete. You can still comment without it.');
      history.replaceState(null, '', window.location.pathname + window.location.search + '#comments');
    }
    return false;
  }

  function loadMe() {
    if (!token()) { showIdentity(); return Promise.resolve(); }
    return fetch(endpoint + '/auth/me', { headers: { Authorization: 'Bearer ' + token() } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        me = d && d.login ? d : null;
        if (!me) store(TOKEN_KEY, null);
        showIdentity();
      })
      .catch(function () { showIdentity(); });
  }

  ghSignin.addEventListener('click', function () {
    var back = window.location.origin + window.location.pathname;
    window.location.href = endpoint + '/auth/github?return=' + encodeURIComponent(back);
  });

  ghSignout.addEventListener('click', function () {
    store(TOKEN_KEY, null);
    me = null;
    showIdentity();
  });

  nameEl.addEventListener('input', function () { updateHint(); });

  /* ---------------------------------------------------------------- load */

  function load() {
    return fetch(endpoint + '/comments?slug=' + encodeURIComponent(slug), { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        if (d.github) ghSignin.hidden = !!me;
        render(d.comments || []);
      })
      .catch(function () {
        stateEl = document.createElement('li');
        stateEl.className = 'comments__state';
        stateEl.textContent = 'Comments could not be loaded right now.';
        thread.textContent = '';
        thread.appendChild(stateEl);
      });
  }

  /* ---------------------------------------------------------------- submit */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    fail('');

    var text = bodyEl.value.trim();
    if (text.length < 2) { fail('A comment needs at least a couple of characters.'); bodyEl.focus(); return; }
    if (trapEl.value) return;                 // bot

    var payload = { body: text };
    if (!me) {
      payload.name = nameEl.value.trim();
      payload.website = siteEl.value.trim();
      if (payload.name) store(NAME_KEY, payload.name);
    }

    sending = true;
    submitEl.disabled = true;
    submitEl.textContent = 'Posting…';

    var headers = { 'Content-Type': 'application/json' };
    if (me && token()) headers.Authorization = 'Bearer ' + token();

    fetch(endpoint + '/comments?slug=' + encodeURIComponent(slug), {
      method: 'POST', mode: 'cors', headers: headers, body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, d: d }; });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d && res.d.error ? res.d.error : 'Could not post that.');
        bodyEl.value = '';
        return load();
      })
      .catch(function (err) {
        fail(err.message || 'Could not post that — try again in a moment.');
      })
      .then(function () {
        sending = false;
        submitEl.disabled = false;
        submitEl.textContent = 'Post';
      });
  });

  /* ---------------------------------------------------------------- start */

  claimHashToken();
  var saved = read(NAME_KEY);
  if (saved) nameEl.value = saved;
  loadMe().then(load);
})();
