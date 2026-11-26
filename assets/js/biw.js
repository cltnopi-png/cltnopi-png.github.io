/* 차체 골격(BIW) 부위 그림: figure.view3d.biw
   목록 항목이나 번호 표지를 누르면 그 부위 층만 보인다. 다시 누르거나 "전체 보기"를 누르면 전체로 돌아간다.
   마우스를 올리면 미리 보여 준다. 스크립트가 없어도 그림(전체 표시)과 목록은 그대로 보인다. */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('figure.biw'), function (fig) {
    var items = Array.prototype.slice.call(fig.querySelectorAll('.view3d-zones li[data-zone]'));
    var pins = Array.prototype.slice.call(fig.querySelectorAll('.biw-pin'));
    var status = fig.querySelector('.biw-status'), allBtn = fig.querySelector('.biw-all');
    var sel = 0, btns = {}, texts = {};
    function show(z) { if (z) fig.setAttribute('data-sel', z); else fig.removeAttribute('data-sel'); }
    function set(z) {
      sel = (z === sel) ? 0 : z;
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute('aria-pressed', +k === sel ? 'true' : 'false'); });
      show(sel);
      if (status) status.textContent = sel ? texts[sel] : (status.getAttribute('data-all') || '');
      if (allBtn) allBtn.hidden = !sel;
    }
    items.forEach(function (li) {
      var z = +li.getAttribute('data-zone'), b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      while (li.firstChild) b.appendChild(li.firstChild);
      li.appendChild(b); btns[z] = b;
      var name = b.querySelector('b'), sub = b.querySelector('span');
      texts[z] = z + ' ' + (name ? name.textContent : '') + (sub ? ' · ' + sub.textContent : '');
      b.addEventListener('click', function () { set(z); });
      b.addEventListener('mouseenter', function () { show(z); });
      b.addEventListener('mouseleave', function () { show(sel); });
    });
    pins.forEach(function (p) {
      var z = +p.getAttribute('data-z');
      p.addEventListener('click', function () { set(z); });
      p.addEventListener('mouseenter', function () { show(z); });
      p.addEventListener('mouseleave', function () { show(sel); });
    });
    if (allBtn) allBtn.addEventListener('click', function () { if (sel) set(sel); });
    fig.classList.add('is-on');
  });
})();
