/* 금형 공정 연속 그림 재생기: figure.view3d.seq
   Blender(Cycles)로 미리 렌더한 그림을 차례로 보여 준다. 그림과 manifest.json 은 tools/blender/ 스크립트가 만든다 (docs/3d/die_blender.md).
   - data-src: 그림 폴더(…/img/3d/die/). 그 안에 manifest.json, ext/ sec/ cool/ turn/ 의 f000.webp …
   - 보기 ext·sec·cool 은 프레임 번호가 같은 공정 애니메이션(sec 는 단면 전용 카메라). turn 은 돌려 보기(끌어서 회전).
   - manifest 의 seqs.<보기>.stride 가 2 이면 그 보기는 짝수 프레임 그림만 있다.
   - 단추: [data-step] 0~3, [data-act=play], [data-view], [data-act=tags]. 설명 줄: .view3d-say (aria-live)
   - window.CLT_SEQ = {manifest, frames:{ext:[data URI], turn:[data URI]}} 가 있으면 파일을 따로 받지 않는다(카카오톡으로 보내는 한 파일 판).
   - 스크립트나 manifest 가 없으면 첫 그림(.seq-poster)과 부품 목록이 그대로 남는다.
   - prefers-reduced-motion: 자동 재생 없음, 단계는 바로 넘어간다. */
(function () {
  'use strict';
  var figs = Array.prototype.slice.call(document.querySelectorAll('figure.view3d.seq'));
  if (!figs.length) return;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FPS = 24, HOLD = 2600, TURN_MS = 110, NS = 'http://www.w3.org/2000/svg';
  var INL = window.CLT_SEQ || null;            // 파일 하나로 보낼 때(tools/share_file.py): 그림과 manifest 가 쪽 안에 들어 있다
  function pad(n) { return ('00' + n).slice(-3); }
  function arr(l) { return Array.prototype.slice.call(l); }

  function setup(fig, man) {
    var base = fig.getAttribute('data-src'), ver = fig.getAttribute('data-v'), stage = fig.querySelector('.seq-stage');
    ver = ver ? '?v=' + ver : '';
    var cv = stage.querySelector('canvas'), ctx = cv.getContext('2d'), bar = stage.querySelector('.seq-load i');
    var svg = stage.querySelector('.seq-leads');
    var tags = arr(stage.querySelectorAll('.seq-tag')).map(function (el) {
      var ln = document.createElementNS(NS, 'line'), dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', 3); svg.appendChild(ln); svg.appendChild(dot);
      return { el: el, key: el.getAttribute('data-l'), ln: ln, dot: dot, w: 0 };
    });
    var steps = arr(fig.querySelectorAll('[data-step]')), views = arr(fig.querySelectorAll('[data-view]'));
    var play = fig.querySelector('[data-act="play"]'), tagBtn = fig.querySelector('[data-act="tags"]'), say = fig.querySelector('.view3d-say');
    var S = man.steps, cache = {}, loaded = {}, loading = {};
    var view = 'ext', fp = S[0], ft = 0, step = 0, playing = !reduce, vis = false, tagsOn = true;
    if (!play) playing = true;
    if (tagBtn && tagBtn.getAttribute('aria-pressed') === 'false') tagsOn = false;
    var hold = 0, tick = 0, target = -1, dir = 1, onDone = null;
    cv.width = man.size[0]; cv.height = man.size[1];

    function fi(v, i) { var st = man.seqs[v].stride || 1; return i - (i % st); }   // stride 2 면 홀수 프레임은 앞 짝수 프레임 그림을 쓴다
    function img(v, i, cb) {
      i = fi(v, i);
      var a = cache[v] || (cache[v] = []), im = a[i];
      if (!im) {
        var url = INL ? INL.frames[v][i] : base + v + '/f' + pad(i) + '.webp' + ver;
        im = a[i] = new Image(); im.decoding = 'async'; im._cbs = []; im._try = 0;
        im.onload = function () { var c = im._cbs; im._cbs = []; c.forEach(function (f) { f(im); }); };
        im.onerror = function () {                               // 받지 못하면 3번까지 다시 받는다. 그래도 안 되면 그 프레임은 건너뛴다
          if (!INL && im._try++ < 3) setTimeout(function () { im.src = url + (ver ? '&' : '?') + 'r=' + im._try; }, 500 * im._try);
          else { im._fail = true; var c = im._cbs; im._cbs = []; c.forEach(function (f) { f(null); }); }
        };
        im.src = url;
      }
      if (cb) { if (im.complete && im.naturalWidth) cb(im); else if (im._fail) cb(null); else im._cbs.push(cb); }
      return im;
    }
    function ready(v, i) { var im = cache[v] && cache[v][fi(v, i)]; return !!(im && im.complete && im.naturalWidth); }
    function failed(v, i) { var im = cache[v] && cache[v][fi(v, i)]; return !!(im && im._fail); }
    function cur() { return view === 'turn' ? ft : fp; }
    function draw() {
      var i = cur();
      if (!ready(view, i)) { var v = view; if (!failed(v, i)) img(v, i, function (im) { if (im && view === v && cur() === i) draw(); }); return false; }
      ctx.drawImage(cache[view][fi(view, i)], 0, 0, cv.width, cv.height);
      fig.classList.add('is-drawn');
      if (INL) { var po = stage.querySelector('.seq-poster'); if (po) po.parentNode.removeChild(po); }   // 한 파일 판의 첫 그림은 움직이는 그림이라 재생기가 켜지면 치운다
      place();
      return true;
    }
    function preload(v) {
      if (loaded[v] || loading[v]) return;
      loading[v] = true;
      var n = man.seqs[v].frames, order = [], left, i, k;
      if (v !== 'turn') S.forEach(function (s) { k = fi(v, s); if (order.indexOf(k) < 0) order.push(k); });
      for (i = 0; i < n; i++) { k = fi(v, i); if (order.indexOf(k) < 0) order.push(k); }
      n = left = order.length;
      fig.classList.add('is-loading');
      var act = 0;
      (function pump() {                                         // 한 번에 8장씩만 받는다
        while (act < 8 && order.length) {
          act++;
          img(v, order.shift(), function () {
            act--; left--;
            if (view === v && bar) bar.style.width = Math.round(100 * (1 - left / n)) + '%';
            if (!left) { loaded[v] = true; loading[v] = false; if (view === v) fig.classList.remove('is-loading'); }
            else pump();
          });
        }
      })();
    }

    /* 이름표: 왼쪽·오른쪽 가장자리에 세로로 늘어놓고 지시선을 긋는다 */
    var sides = {};
    function sideOf(v) {                                       // 보기마다 한 번: 평균 x 순으로 절반은 왼쪽, 절반은 오른쪽(프레임이 바뀌어도 자리가 안 바뀐다)
      if (sides[v]) return sides[v];
      var tv = man.tags && man.tags[v], list = [], out = {};
      if (tv) Object.keys(tv).forEach(function (k) { var sx = 0, n = 0; tv[k].forEach(function (p) { if (p[2]) { sx += p[0]; n++; } }); if (n) list.push([k, sx / n]); });
      list.sort(function (a, b) { return a[1] - b[1]; });
      list.forEach(function (it, i) { out[it[0]] = i < Math.ceil(list.length / 2) ? 0 : 1; });
      return (sides[v] = out);
    }
    function measure() { tags.forEach(function (t) { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; }); }
    function place() {
      var W = stage.clientWidth, H = stage.clientHeight, tv = man.tags && man.tags[view], f = fp, L = [], Rg = [];
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      tags.forEach(function (t) {
        var p = tagsOn && tv && tv[t.key] && tv[t.key][f], on = !!(p && p[2]);
        t.el.classList.toggle('is-on', on); t.ln.style.display = t.dot.style.display = on ? '' : 'none';
        if (!on) return;
        t.x = p[0] * W; t.y = p[1] * H;
        (sideOf(view)[t.key] ? Rg : L).push(t);
        if (t.key === 'blank' && t.el.dataset.hot) { var txt = f >= S[2] ? t.el.dataset.cold : t.el.dataset.hot; if (t.el.textContent !== txt) { t.el.textContent = txt; t.w = t.el.offsetWidth; } }
      });
      [L, Rg].forEach(function (g, side) {
        var gap = (W < 560 ? 20 : 26), m = (W < 560 ? 6 : 12), y = -1e9, over;
        g.sort(function (a, b) { return a.y - b.y; });
        g.forEach(function (t) { t.ly = Math.max(t.y - t.h / 2, y + gap, m); y = t.ly; });
        over = g.length ? g[g.length - 1].ly + g[g.length - 1].h - (H - m) : 0;
        if (over > 0) for (var k = g.length - 1; k >= 0; k--) { g[k].ly = Math.min(g[k].ly, (k === g.length - 1 ? H - m - g[k].h : g[k + 1].ly - gap)); }
        g.forEach(function (t) {
          var lx = side ? W - m - t.w : m, ex = side ? lx : lx + t.w, ey = t.ly + t.h / 2;
          t.el.style.transform = 'translate(' + Math.round(lx) + 'px,' + Math.round(t.ly) + 'px)';
          t.ln.setAttribute('x1', ex); t.ln.setAttribute('y1', ey); t.ln.setAttribute('x2', t.x); t.ln.setAttribute('y2', t.y);
          t.dot.setAttribute('cx', t.x); t.dot.setAttribute('cy', t.y);
        });
      });
    }

    /* 움직임 */
    function stop() { clearTimeout(hold); hold = 0; clearTimeout(tick); tick = 0; target = -1; onDone = null; }
    function run() {
      tick = 0;
      if (target < 0) return;
      if (fp === target) { var cb = onDone; target = -1; onDone = null; if (cb) cb(); return; }
      var nx = fp + dir;
      if (dir < 0 && nx - 1 >= target) nx -= 1;                    // 되돌아갈 때는 두 배 빠르게
      if (ready(view, nx)) { fp = nx; draw(); }
      else if (failed(view, nx)) fp = nx;                           // 받지 못한 프레임은 건너뛴다(앞 그림 유지)
      else img(view, nx);
      tick = setTimeout(run, 1000 / FPS);
    }
    function go(f, cb) { clearTimeout(tick); target = f; dir = f >= fp ? 1 : -1; onDone = cb || null; if (reduce) { fp = f; draw(); target = -1; if (cb) cb(); return; } run(); }
    function sayStep(i) {
      var b = steps[i]; if (!say || !b) return;
      var n = b.querySelector('i'), name = b.textContent.replace(n ? n.textContent : '', '').trim();
      say.textContent = '';
      var bb = document.createElement('b'); bb.textContent = (n ? n.textContent + ' ' : '') + name; say.appendChild(bb);
      if (b.dataset.say) { var sp = document.createElement('span'); sp.textContent = b.dataset.say; say.appendChild(sp); }
    }
    function mark(i) { step = i; steps.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.step === i ? 'true' : 'false'); }); sayStep(i); }
    function auto() {
      clearTimeout(hold); hold = 0;
      if (!playing || !vis) return;
      if (view === 'turn') { hold = setTimeout(function () { ft = (ft + 1) % man.seqs.turn.frames; draw(); auto(); }, TURN_MS); return; }
      hold = setTimeout(function () {
        var n = (step + 1) % S.length;
        mark(n);
        if (n === 0) { fp = 0; draw(); }                              // 4단계 뒤에는 처음(빈 금형)으로 넘어가 다시 투입
        go(S[n], auto);
      }, HOLD);
    }
    function playLabel() {
      if (!play) return;
      play.textContent = playing ? (play.dataset.on || 'Pause') : (play.dataset.off || 'Play');
      play.classList.toggle('is-playing', playing); play.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    function setView(v) {
      if (!man.seqs[v]) return;
      stop(); view = v;
      if (!play) playing = true;                                 // 재생 단추가 없는 판(공유용): 보기를 바꾸면 다시 움직인다
      views.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === v ? 'true' : 'false'); });
      fig.classList.toggle('is-turn', v === 'turn');
      steps.forEach(function (b) { b.disabled = v === 'turn'; });
      if (bar) bar.style.width = loaded[v] ? '100%' : '0%';
      fig.classList.toggle('is-loading', !loaded[v]);
      if (v !== 'turn') { fp = S[step]; }
      preload(v); draw(); auto();
    }

    steps.forEach(function (b) { b.addEventListener('click', function () {
      var i = +b.dataset.step; playing = false; playLabel(); stop(); mark(i); go(S[i]);
    }); });
    if (play) play.addEventListener('click', function () { playing = !playing; playLabel(); if (playing) auto(); else stop(); });
    views.forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
    if (tagBtn) tagBtn.addEventListener('click', function () { tagsOn = !tagsOn; tagBtn.setAttribute('aria-pressed', tagsOn ? 'true' : 'false'); place(); });

    /* 돌려 보기: 끌어서 회전 */
    var drag = null;
    stage.addEventListener('pointerdown', function (e) {
      if (view !== 'turn' || (e.button && e.button !== 0)) return;
      drag = { x: e.clientX, f: ft }; playing = false; playLabel(); stop();
      stage.classList.add('is-grab'); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var n = man.seqs.turn.frames, d = Math.round((e.clientX - drag.x) / (stage.clientWidth / n * 1.4));
      var nf = ((drag.f - d) % n + n) % n;
      if (nf !== ft) { ft = nf; draw(); }
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { stage.addEventListener(ev, function () { drag = null; stage.classList.remove('is-grab'); }); });

    fig.classList.add('is-on');                                  // 이름표가 보이는 상태가 된 뒤에 폭을 잰다
    measure(); playLabel(); mark(0);
    preload('ext'); draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); place(); });
    return {
      show: function (on) { if (on === vis) return; vis = on; if (on) { place(); auto(); } else stop(); },
      resize: function () { measure(); place(); },
      state: function () { return { view: view, fp: fp, ft: ft, step: step, playing: playing, loaded: loaded }; }
    };
  }

  function start(fig) {
    if (fig._seq !== undefined) return;
    fig._seq = null;
    if (INL) { fig._seq = setup(fig, INL.manifest); if (fig._vis) fig._seq.show(true); return; }
    var base = fig.getAttribute('data-src'), ver = fig.getAttribute('data-v');
    fetch(base + 'manifest.json' + (ver ? '?v=' + ver : '')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (man) {
      fig._seq = setup(fig, man);
      if (fig._vis) fig._seq.show(true);
    }).catch(function (e) { if (window.console) console.warn('seq3d', e); });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) {
      var fig = en.target; fig._vis = en.isIntersecting;
      if (en.isIntersecting) start(fig);
      if (fig._seq) fig._seq.show(en.isIntersecting);
    }); }, { rootMargin: '200px 0px' });
    figs.forEach(function (f) { io.observe(f); });
  } else figs.forEach(function (f) { f._vis = true; start(f); });
  var rq = 0;
  window.addEventListener('resize', function () { if (rq) return; rq = requestAnimationFrame(function () { rq = 0; figs.forEach(function (f) { if (f._seq) f._seq.resize(); }); }); });
})();
