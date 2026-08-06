/* ═══════════════════════════════════════════════════════════════════════
   ВЫГОДА — вся логика страницы. Контент лежит в data.js.
   Без зависимостей: обычный браузерный JS.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Мелкие помощники ───────────────────────────────────────────────── */

  // Неразрывные пробелы в числах: «5 000 ₽» не должно рваться по строкам.
  function nb(str) { return String(str).replace(/ /g, ' '); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function hidden(text) { return el('span', 'visually-hidden', text); }

  // Русские окончания: 1 предложение / 2 предложения / 5 предложений
  function plural(n, one, few, many) {
    var d10 = n % 10, d100 = n % 100;
    if (d10 === 1 && d100 !== 11) return one;
    if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return few;
    return many;
  }

  // Маркировка рекламы: токен erid берём прямо из партнёрской ссылки.
  function eridOf(url) {
    var m = /[?&]erid=([^&#]+)/i.exec(url || '');
    return m ? decodeURIComponent(m[1]) : '';
  }

  /* ── Название проекта и ссылки ──────────────────────────────────────── */

  var site = (typeof SITE === 'object' && SITE) || {};
  var tgChannel = site.telegram || 'https://t.me/';
  var tgChat    = site.chat || tgChannel;

  if (site.brand) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-brand]'), function (n) {
      n.textContent = site.brand;
    });
  }

  var ctaChannel = $('#cta-channel');
  var ctaChat    = $('#cta-chat');
  if (ctaChannel) {
    ctaChannel.href = tgChannel; ctaChannel.target = '_blank'; ctaChannel.rel = 'noopener';
    ctaChannel.firstChild.nodeValue = site.telegramLabel || 'Канал с подборками';
  }
  if (ctaChat) {
    ctaChat.href = tgChat; ctaChat.target = '_blank'; ctaChat.rel = 'noopener';
    ctaChat.firstChild.nodeValue = site.chatLabel || 'Задать вопрос';
  }

  /* ── Офферы и фильтры ───────────────────────────────────────────────── */

  var offersList = $('#offers-list');
  var filterRow  = $('#filters');
  var countEl    = $('#offers-count');
  var cats       = (typeof CATEGORIES !== 'undefined' && CATEGORIES) || [{ id: 'all', label: 'Все офферы', cta: 'Оформить' }];
  var defaults   = (typeof DEFAULTS !== 'undefined' && DEFAULTS) || {};
  var current    = 'all';

  /* Офферы с боевой партнёрской ссылкой идут первыми — сортируем один раз,
     до отрисовки, по копии массива (sort меняет исходный на месте, а OFFERS
     ещё нужен бегущей строке). Сравнение числовое: у него полный порядок,
     поэтому остальные офферы сохраняют группировку по категориям из data.js.
     Порядок именно в DOM, а не в CSS: order/dense разошлись бы с табуляцией. */
  var live = function (o) { return !!(o && o.url); };
  var offers = ((typeof OFFERS !== 'undefined' && OFFERS) || []).slice()
    .sort(function (a, b) { return (live(b) ? 1 : 0) - (live(a) ? 1 : 0); });

  function catOf(id) {
    return cats.filter(function (c) { return c.id === id; })[0] || {};
  }

  /* Плашка. kind — для стилей, чтобы вид не зависел от русского текста. */
  function badgeEl(text, kind) {
    var b = el('span', 'offer-badge', text);
    b.setAttribute('data-badge-kind', kind);
    return b;
  }

  function offerCard(o) {
    var cat = catOf(o.cat);
    var isLive = live(o);
    var li = el('li', 'offer' + (isLive ? ' offer--hot' : ''));

    /* верхняя строка: категория + плашки.
       Статус ДОСТУПЕН / СКОРО — словом, а не только рамкой: цвет как
       единственный признак не читается при дальтонизме и в режиме
       принудительных цветов. Рядом может стоять редакторская плашка (ТОП),
       поэтому слот — группа, а не одно место. */
    var top = el('div', 'offer-top');
    top.appendChild(el('span', null, cat.label || ''));

    var badges = el('div', 'offer-badges');
    badges.appendChild(badgeEl(isLive ? 'ДОСТУПЕН' : 'СКОРО', isLive ? 'live' : 'soon'));
    if (o.badge) badges.appendChild(badgeEl(o.badge, 'note'));
    top.appendChild(badges);

    li.appendChild(top);

    /* название компании крупно + продукт */
    var head = el('div');
    head.appendChild(el('h3', 'offer-brand', o.partner));
    head.appendChild(el('p', 'offer-title', o.title));
    li.appendChild(head);

    /* что известно точно — без выдуманных ставок и сроков */
    var facts = el('ul', 'offer-facts');
    facts.setAttribute('role', 'list');       // list-style:none снимает роль в Safari
    (o.bullets || defaults[o.cat] || []).forEach(function (b) {
      facts.appendChild(el('li', null, b));
    });
    li.appendChild(facts);

    /* подвал карточки */
    var foot = el('div', 'offer-foot');
    var erid = eridOf(o.url);
    foot.appendChild(el('span', 'offer-erid', erid ? 'erid: ' + erid : ''));

    /* Кнопка называется тем, что делает: у оффера со ссылкой — «Оформить»,
       у оффера без ссылки — «Написать в Telegram», потому что ведёт она
       именно туда. Видимый текст идёт первым в доступном имени: голосовое
       управление активирует кнопку по её началу. */
    var a = el('a', 'offer-cta' + (isLive ? '' : ' offer-cta--soft'));
    a.href = o.url || tgChat;
    a.target = '_blank';
    a.rel = isLive ? 'noopener nofollow sponsored' : 'noopener';
    a.appendChild(document.createTextNode(isLive ? (cat.cta || 'Оформить') : 'Написать в Telegram'));

    var arrow = el('span', 'offer-cta-arrow', '↗');   // видимый признак новой вкладки
    arrow.setAttribute('aria-hidden', 'true');
    a.appendChild(arrow);

    a.appendChild(hidden(
      ' — ' + o.partner + ', ' + o.title +
      (isLive ? ', прямая ссылка партнёра' : '') +
      ' (откроется в новой вкладке)'
    ));
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
      var label = catOf(current).label || 'Все офферы';
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

  /* ── Бегущая строка: названия партнёров без повторов ────────────────── */

  var track = $('#ticker-track');
  if (track) {
    var names = offers.map(function (o) { return o.partner; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (names.length) {
      for (var pass = 0; pass < 2; pass++) {
        var row = el('span', 'ticker-row');
        if (pass === 1) row.setAttribute('aria-hidden', 'true');
        names.forEach(function (n) {
          row.appendChild(document.createTextNode(n + ' '));
          var d = el('i', null, '◆');
          d.setAttribute('aria-hidden', 'true');
          row.appendChild(d);
          row.appendChild(document.createTextNode(' '));
        });
        track.appendChild(row);
      }
    }
  }

  /* ── Шаги ───────────────────────────────────────────────────────────── */

  var stepsEl = $('#steps');
  if (stepsEl && typeof STEPS !== 'undefined') {
    STEPS.forEach(function (s) {
      var li = el('li', 'step');
      li.appendChild(el('h3', 'step-title', s.title));
      li.appendChild(el('p', null, s.text));
      stepsEl.appendChild(li);
    });
  }

  /* ── Цифры ──────────────────────────────────────────────────────────── */

  var statsEl = $('#stats');
  if (statsEl && typeof STATS !== 'undefined') {
    STATS.forEach(function (s) {
      var value = typeof s.value === 'function' ? s.value() : s.value;
      var label = Array.isArray(s.label)
        ? plural(Number(value) || 0, s.label[0], s.label[1], s.label[2])
        : s.label;

      var wrap = el('div', 'stat');
      wrap.appendChild(el('dt', null, label));        // порядок в DOM: dt → dd
      var dd = el('dd');
      var v = el('span', null, nb(value));
      v.setAttribute('aria-hidden', 'true');
      dd.appendChild(v);
      dd.appendChild(hidden(s.read || String(value)));
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

  /* ── Бегущая строка: пауза ──────────────────────────────────────────── */

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
