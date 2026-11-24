/* Адреса Cloudflare Worker, який пересилає заявки в Telegram.
   Вставте сюди адресу після створення Worker (інструкція в TELEGRAM-ЗАЯВКИ.txt). */
window.LEADS_ENDPOINT = 'https://pravo-leads.pravodopomoga5.workers.dev/';

(function () {
  // mobile menu
  var toggle = document.querySelector('.mobile-toggle'), links = document.querySelector('.links');
  if (toggle && links) toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // header shadow + mobile sticky CTA on scroll
  var bar = document.querySelector('.mobile-bar'), top = document.querySelector('.topbar');
  function onScroll() {
    var y = window.scrollY;
    if (top) top.classList.toggle('scrolled', y > 10);
    if (bar) bar.classList.toggle('show', y > 420);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // scroll reveal (class is removed after the animation so hover effects keep working)
  var els = document.querySelectorAll('.reveal');
  function done(el) { el.classList.add('in'); setTimeout(function () { el.classList.remove('reveal', 'in'); }, 800); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = (i % 4) * 80 + 'ms';
        done(e.target); io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(done);

  // booking form: phone mask + validation + sending to Telegram (via Cloudflare Worker)
  document.querySelectorAll('form[data-demo-form]').forEach(function (form) {
    var phone = form.querySelector('input[type="tel"]');
    if (phone) {
      phone.addEventListener('input', function () {
        var d = phone.value.replace(/\D/g, '');
        if (d.indexOf('38') === 0) d = d.slice(2);
        if (d && d[0] !== '0') d = '0' + d;
        d = d.slice(0, 10);
        var o = d ? '+38 (' + d.slice(0, 3) : '';
        if (d.length >= 3) o += ') ' + d.slice(3, 6);
        if (d.length > 6) o += '-' + d.slice(6, 8);
        if (d.length > 8) o += '-' + d.slice(8, 10);
        phone.value = o;
      });
      phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+38 (0'; });
      phone.addEventListener('blur', function () { if (phone.value.replace(/\D/g, '').length <= 3) phone.value = ''; });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('err'); });
      form.querySelectorAll('[required]').forEach(function (el) {
        var bad = !el.value.trim() || (el.type === 'tel' && el.value.replace(/\D/g, '').length !== 12);
        if (bad) { ok = false; el.closest('.field').classList.add('err'); }
      });
      if (!ok) return;
      var success = form.querySelector('.success');
      var errBox = form.querySelector('.form-error');
      var btn = form.querySelector('button[type="submit"]');
      if (errBox) { errBox.textContent = ''; errBox.classList.remove('show'); }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      data.page = location.href;
      var showOk = function () {
        if (success) { success.classList.add('show'); success.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        form.reset();
      };
      var showErr = function () {
        if (errBox) {
          errBox.textContent = 'Не вдалося надіслати заявку. Спробуйте ще раз або напишіть нам на pravodopomoga5@gmail.com.';
          errBox.classList.add('show');
        }
      };
      if (!window.LEADS_ENDPOINT) { console.warn('LEADS_ENDPOINT не налаштовано — заявка не надіслана'); showErr(); return; }
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
      fetch(window.LEADS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); }); })
        .then(showOk, showErr)
        .then(function () { if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); } });
    });
  });
})();

/* v23: картки на головній — така ж ширина, як на «Послугах» */
(function(){var t=document.querySelector('.hero .trust');if(!t)return;var g=t.closest('.hero-grid')||t.closest('.wrap');
function fit(){t.style.removeProperty('--trust-w');var w=g.getBoundingClientRect().width;t.style.setProperty('--trust-w',w+'px')}
fit();window.addEventListener('resize',fit);})();
