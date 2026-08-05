/* ═══════════════════════════════════════════════════════════════════════
   АБУЗИЩЕ — вся логика страницы. Контент лежит в data.js.
   Без зависимостей: обычный браузерный JS.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Мелкие помощники ───────────────────────────────────────────────── */

  // Неразрывные пробелы в числах: «20 000 ₽» не должно рваться по строкам.
  function nb(str) { return String(str).replace(/ /g, ' '); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function hidden(text) {
    var s = el('span', 'visually-hidden', text);
    return s;
  }

  // Русские окончания: 1 предложение / 2 предложения / 5 предложений
  function plural(n, one, few, many) {
    var d10 = n % 10, d100 = n % 100;
    if (d10 === 1 && d100 !== 11) return one;
    if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return few;
    return many;
  }

  /* ── Ссылки на Telegram ─────────────────────────────────────────────── */

  var contacts = (typeof CONTACTS === 'object' && CONTACTS) || {};
  var channelUrl = contacts.channel || 'https://t.me/';
  var chatUrl    = contacts.chat    || channelUrl;

  var ctaChannel = $('#cta-channel');
  var ctaChat    = $('#cta-chat');
  if (ctaChannel) { ctaChannel.href = channelUrl; ctaChannel.target = '_blank'; ctaChannel.rel = 'noopener'; }
  if (ctaChat)    { ctaChat.href    = chatUrl;    ctaChat.target    = '_blank'; ctaChat.rel    = 'noopener'; }

  /* ── Офферы и фильтры ───────────────────────────────────────────────── */

  var offersList = $('#offers-list');
  var filterRow  = $('#filters');
  var countEl    = $('#offers-count');
  var cats       = (typeof CATEGORIES !== 'undefined' && CATEGORIES) || [{ id: 'all', label: 'Все офферы' }];
  var offers     = (typeof OFFERS !== 'undefined' && OFFERS) || [];
  var current    = 'all';

  function offerCard(o) {
    var li = el('li', 'offer');

    /* верхняя строка: категория + плашка */
    var top = el('div', 'offer-top');
    var cat = cats.filter(function (c) { return c.id === o.cat; })[0];
    top.appendChild(el('span', null, cat ? cat.label : ''));
    if (o.badge) {
      var badge = el('span', 'offer-badge', o.badge);
      badge.setAttribute('data-badge', o.badge);
      top.appendChild(badge);
    }
    li.appendChild(top);

    /* крупная сумма бонуса: глазами — цифры, голосом — словами */
    var amount = el('p', 'offer-amount');
    var visual = el('span', null, nb(o.amount));
    visual.setAttribute('aria-hidden', 'true');
    var unit = el('span', 'offer-unit', o.unit || '');
    unit.setAttribute('aria-hidden', 'true');
    amount.appendChild(visual);
    amount.appendChild(unit);
    amount.appendChild(hidden(o.read || (o.amount + ' ' + (o.unit || ''))));
    li.appendChild(amount);

    /* название и суть */
    var head = el('div');
    head.appendChild(el('h3', 'offer-brand', o.brand));
    head.appendChild(el('p', 'offer-title', o.title));
    li.appendChild(head);

    /* условия */
    var dl = el('dl', 'offer-terms');
    (o.terms || []).forEach(function (pair) {
      var row = el('div');
      row.appendChild(el('dt', null, pair[0]));
      row.appendChild(el('dd', null, nb(pair[1])));
      dl.appendChild(row);
    });
    li.appendChild(dl);

    /* подвал карточки */
    var foot = el('div', 'offer-foot');
    foot.appendChild(el('span', 'offer-payout', nb(o.payout || '')));

    var a = el('a', 'offer-cta');
    a.href = o.url || channelUrl;
    a.target = '_blank';
    a.rel = o.url ? 'noopener nofollow sponsored' : 'noopener';
    a.appendChild(document.createTextNode('Забрать бонус'));
    a.appendChild(hidden(' — ' + o.brand + ', ' + (o.read || '') + ' (откроется в новой вкладке)'));
    foot.appendChild(a);

    li.appendChild(foot);
    return li;
  }

  function visibleOffers() {
    return current === 'all'
      ? offers
      : offers.filter(function (o) { return o.cat === current; });
  }

  function renderOffers() {
    if (!offersList) return;
    var list = visibleOffers();
    offersList.textContent = '';
    list.forEach(function (o) { offersList.appendChild(offerCard(o)); });

    if (countEl) {
      var label = (cats.filter(function (c) { return c.id === current; })[0] || {}).label || 'Все офферы';
      var text = list.length === 0
        ? label + ': подходящих предложений нет'
        : label + ': ' + list.length + ' ' +
          plural(list.length, 'предложение', 'предложения', 'предложений');
      // Тот же текст не переозвучиваем.
      if (countEl.textContent.trim() !== text) countEl.textContent = text;
    }
  }

  function renderFilters() {
    if (!filterRow) return;
    cats.forEach(function (c) {
      var b = el('button', 'filter-btn');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(c.id === current));
      b.setAttribute('data-cat', c.id);
      var tick = el('span', 'tick', '✓');
      tick.setAttribute('aria-hidden', 'true');
      b.appendChild(tick);
      b.appendChild(document.createTextNode(c.label));
      b.addEventListener('click', function () {
        if (current === c.id) return;               // повтор — молчим
        current = c.id;
        Array.prototype.forEach.call(filterRow.children, function (btn) {
          btn.setAttribute('aria-pressed', String(btn.getAttribute('data-cat') === current));
        });
        renderOffers();                              // фокус остаётся на кнопке
      });
      filterRow.appendChild(b);
    });
  }

  renderFilters();
  renderOffers();

  /* ── Цифры ──────────────────────────────────────────────────────────── */

  var statsEl = $('#stats');
  if (statsEl && typeof STATS !== 'undefined') {
    STATS.forEach(function (s) {
      var wrap = el('div', 'stat');
      wrap.appendChild(el('dt', null, s.label));       // порядок в DOM: dt → dd
      var dd = el('dd');
      var v = el('span', null, nb(s.value));
      v.setAttribute('aria-hidden', 'true');
      dd.appendChild(v);
      dd.appendChild(hidden(s.read || s.value));
      wrap.appendChild(dd);
      statsEl.appendChild(wrap);
    });
  }

  /* ── Вопросы ────────────────────────────────────────────────────────── */

  var faqEl = $('#faq-list');
  if (faqEl && typeof FAQ !== 'undefined') {
    FAQ.forEach(function (item) {
      var d = el('details');
      d.name = 'faq';                                  // нативный аккордеон
      var s = el('summary');
      var inner = el('div', 'summary-in');
      inner.appendChild(el('h3', null, item.q));
      var sign = el('span', 'faq-sign');
      sign.setAttribute('aria-hidden', 'true');
      inner.appendChild(sign);
      s.appendChild(inner);
      d.appendChild(s);
      d.appendChild(el('p', 'faq-answer', item.a));
      faqEl.appendChild(d);
    });
  }

  /* ── Бегущая строка ─────────────────────────────────────────────────── */

  var ticker = $('#ticker');
  var tickerBtn = $('#ticker-btn');
  if (ticker && tickerBtn) {
    var setMotion = function (on) {
      ticker.setAttribute('data-motion', on ? 'on' : 'off');
      tickerBtn.setAttribute('aria-pressed', String(!on)); // нажата = стоит на паузе
    };
    setMotion(!reduceMotion.matches);
    tickerBtn.hidden = false;                          // без JS ничего не двигается
    tickerBtn.addEventListener('click', function () {
      setMotion(ticker.getAttribute('data-motion') !== 'on');
    });
    var onMotionPref = function (e) { setMotion(!e.matches); };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionPref);
    else if (reduceMotion.addListener) reduceMotion.addListener(onMotionPref);
  }

  /* ── Мобильное меню ─────────────────────────────────────────────────── */

  var burger = $('#burger');
  var menu   = $('#site-menu');
  if (burger && menu) {
    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    };
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });
    var wide = window.matchMedia('(min-width: 901px)');
    var onWide = function (e) { if (e.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ── Появление блоков при скролле ───────────────────────────────────── */

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var targets = document.querySelectorAll('.sec-head, .offer, .step, .stat, .faq details, .cta-lead');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

    Array.prototype.forEach.call(targets, function (t, i) {
      t.classList.add('reveal');
      t.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      io.observe(t);
    });

    // Страховка: если наблюдатель по какой-то причине молчит (фоновая вкладка,
    // нестандартный браузер), через 1,5 с показываем всё принудительно —
    // контент важнее анимации.
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (t) {
        t.classList.add('is-in');
      });
      io.disconnect();
    }, 1500);
  }

  /* ── Год в подвале ──────────────────────────────────────────────────── */

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
