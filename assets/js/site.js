/* ㈜코링텍 홈페이지 스크립트. 라이브러리 없음.
   1) 주 메뉴 펼침  2) 첫 화면 전환  3) 갤러리 넘김  4) 문의 양식 */
(function () {
  'use strict';
  var EN = document.documentElement.lang === 'en';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) 주 메뉴: hover와 focus로 펼침, Esc로 닫음. 좁은 화면은 메뉴 버튼. */
  var gn = document.querySelector('.gn');
  if (gn) {
    var items = [].slice.call(gn.querySelectorAll(':scope > ul > li'));
    var wide = function () { return window.matchMedia('(min-width: 1000px)').matches; };
    var setOpen = function (li, on) { li.classList.toggle('is-open', on); var a = li.querySelector('.gn-top'); if (a) a.setAttribute('aria-expanded', on ? 'true' : 'false'); };
    var closeAll = function () { items.forEach(function (li) { setOpen(li, false); }); };
    items.forEach(function (li) {
      li.addEventListener('mouseenter', function () { if (wide()) { closeAll(); setOpen(li, true); } });
      li.addEventListener('mouseleave', function () { if (wide()) setOpen(li, false); });
      li.addEventListener('focusin', function () { if (wide() && !li.dataset.esc) { closeAll(); setOpen(li, true); } });
      li.addEventListener('focusout', function (e) { if (wide() && !li.contains(e.relatedTarget)) { setOpen(li, false); delete li.dataset.esc; } });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && wide()) { li.dataset.esc = '1'; var top = li.querySelector('.gn-top'); if (top) top.focus(); setOpen(li, false); }
      });
    });
    var btn = document.querySelector('.nav-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        var open = gn.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        items.forEach(function (li) { var a = li.querySelector('.gn-top'); if (a) a.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && gn.classList.contains('is-open')) { gn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
      });
    }
  }

  /* 2) 첫 화면 전환: 원형 버튼 3개, 정지 버튼. hover·focus 중에는 멈춘다. */
  var hero = document.querySelector('.hero');
  if (hero) {
    var slides = [].slice.call(hero.querySelectorAll('.hero-slide'));
    var picks = [].slice.call(hero.querySelectorAll('.pick'));
    var pause = hero.querySelector('.hero-pause');
    var cur = Math.max(0, slides.findIndex(function (s) { return s.classList.contains('is-on'); }));
    var stopped = reduce, hold = false, timer = null;
    var show = function (n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); s.setAttribute('aria-hidden', i === cur ? 'false' : 'true'); });
      picks.forEach(function (p, i) { if (i === cur) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
    };
    var live = hero.querySelector('.hero-slides');
    var label = function () {
      if (live) live.setAttribute('aria-live', stopped ? 'polite' : 'off');
      if (!pause) return;
      pause.classList.toggle('is-stopped', stopped);
      pause.setAttribute('aria-label', stopped ? (EN ? 'Start slide rotation' : '자동 전환 시작') : (EN ? 'Stop slide rotation' : '자동 전환 정지'));
    };
    var tick = function () { if (!stopped && !hold) show(cur + 1); };
    picks.forEach(function (p, i) { p.addEventListener('click', function () { show(i); }); });
    if (pause) pause.addEventListener('click', function () { stopped = !stopped; label(); });
    hero.addEventListener('mouseenter', function () { hold = true; });
    hero.addEventListener('mouseleave', function () { hold = false; });
    hero.addEventListener('focusin', function () { if (!stopped) { stopped = true; label(); } });
    show(cur); label();
    timer = window.setInterval(tick, 6000);
  }

  /* 3) 갤러리 넘김 */
  document.querySelectorAll('[data-gal]').forEach(function (box) {
    var track = box.querySelector('.gal-track');
    var n = track ? track.children.length : 0, pos = 0, per = 3;
    var prev = box.querySelector('.gal-prev'), next = box.querySelector('.gal-next'), count = box.querySelector('.gal-count');
    var go = function (d) {
      var max = Math.max(0, n - per);
      pos = pos + d; if (pos > max) pos = 0; if (pos < 0) pos = max;
      var w = track.children[0].getBoundingClientRect().width + 4;
      track.style.transform = 'translateX(' + (-pos * w) + 'px)';
      [].forEach.call(track.children, function (li, i) {
        var vis = i >= pos && i < pos + per;
        li.setAttribute('aria-hidden', vis ? 'false' : 'true');
        var a = li.querySelector('a'); if (a) a.tabIndex = vis ? 0 : -1;
      });
      if (count) count.textContent = (pos + 1) + '–' + Math.min(n, pos + per) + ' / ' + n;
    };
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    if (n) go(0);
    window.addEventListener('resize', function () { if (n) go(0); });
  });

  /* 그래프: 좁은 화면에서는 최근 연도가 먼저 보이게 오른쪽 끝으로 민다 */
  document.querySelectorAll('.chart-scroll').forEach(function (el) { el.scrollLeft = el.scrollWidth; });

  /* 4) 문의 양식: 전송 주소(data-endpoint)가 있으면 그곳으로 보낸다.
        없으면 받는 메일(data-mail)로 메일 창을 연다. 둘 다 없으면 작성 내용을 복사한다. */
  document.querySelectorAll('form.js-inquiry').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    var say = function (t, err) { if (msg) { msg.textContent = t; msg.classList.toggle('err', !!err); } };
    var endpoint = form.getAttribute('data-endpoint') || '', mail = form.getAttribute('data-mail') || '';
    var sheet = function () {
      var lines = ['[' + (form.getAttribute('data-title') || '') + ']'];
      form.querySelectorAll('input, textarea').forEach(function (el) {
        if (el.type === 'checkbox' || el.type === 'hidden' || el.type === 'submit') return;
        var lab = el.labels && el.labels[0] ? el.labels[0].childNodes[0].textContent.trim() : el.name;
        lines.push(lab + ': ' + el.value.trim());
      });
      return lines.join('\n');
    };
    var valid = function () {
      var bad = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.value.trim() !== '';
        if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !bad) bad = el;
      });
      if (msg && !msg.id) msg.id = 'form-msg';
      form.querySelectorAll('[required]').forEach(function (el) { if (el.getAttribute('aria-invalid') === 'true') el.setAttribute('aria-describedby', msg ? msg.id : ''); else el.removeAttribute('aria-describedby'); });
      if (bad) {
        var lab = bad.labels && bad.labels[0] ? bad.labels[0].childNodes[0].textContent.trim() : '';
        say((EN ? 'Please check this required field: ' : '필수 항목을 확인해 주십시오: ') + lab, true); bad.focus(); return false;
      }
      return true;
    };
    var copy = function () {
      var text = sheet();
      var done = function () { say(EN ? 'The sheet was copied. Paste it into your e-mail.' : '작성 내용을 복사했습니다. 메일에 붙여 넣어 보내 주십시오.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { say(text); });
      else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { say(text); } document.body.removeChild(ta); }
    };
    var copyBtn = form.querySelector('.js-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () { if (valid()) copy(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid()) return;
      if (endpoint) {
        var data = new FormData(form);
        say(EN ? 'Sending…' : '보내는 중입니다.');
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); say(EN ? 'Your inquiry was sent. Thank you.' : '문의를 접수했습니다. 감사합니다.'); })
          .catch(function () { say(EN ? 'Sending failed. Please copy the sheet and send it by e-mail.' : '전송에 실패했습니다. 작성 내용을 복사해 메일로 보내 주십시오.', true); });
      } else if (mail) {
        var subj = (form.getAttribute('data-title') || '') + ' ' + ((form.querySelector('[name="subject"]') || {}).value || '');
        window.location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(subj.trim()) + '&body=' + encodeURIComponent(sheet());
        say(EN ? 'Your e-mail program was opened.' : '메일 작성 창을 열었습니다.');
      } else { copy(); }
    });
  });
})();
