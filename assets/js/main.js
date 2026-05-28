/* =============================================================
   Tile Serviços — main.js
   Vanilla JS apenas. Zero dependências. < 10KB minificado.
   ============================================================= */

(function () {
  'use strict';

  /* ─── UTM: captura no load, persiste em sessionStorage ─────── */
  function captureUTMs() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'];
    const stored = {};
    keys.forEach(function (k) {
      const v = params.get(k);
      if (v) stored[k] = v;
    });
    if (Object.keys(stored).length) {
      try { sessionStorage.setItem('tile_utms', JSON.stringify(stored)); } catch (_) {}
    }
  }

  function getStoredUTMs() {
    try {
      return JSON.parse(sessionStorage.getItem('tile_utms') || '{}');
    } catch (_) { return {}; }
  }

  /* ─── WhatsApp: monta URL com UTM e nome do lead ───────────── */
  function buildWAUrl(baseUrl, nome) {
    const utms = getStoredUTMs();
    const source = utms.utm_source || (utms.gclid && 'google') || (utms.fbclid && 'meta') || 'anuncio';
    let text = nome
      ? 'Olá, meu nome é ' + nome + '. Vim do anúncio e quero saber mais sobre a contabilidade da Tile'
      : 'Olá, vim do anúncio e quero saber mais sobre a contabilidade da Tile';
    text += ' (' + source + ')';
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('text', text);
      return url.toString();
    } catch (_) { return baseUrl; }
  }

  function updateWALinks() {
    const utms = getStoredUTMs();
    if (!Object.keys(utms).length) return;
    document.querySelectorAll('.js-wa-link').forEach(function (el) {
      try {
        const built = buildWAUrl(el.href);
        el.href = built;
      } catch (_) {}
    });
  }

  /* ─── Horário comercial: Seg–Sex 8h–18h (America/Sao_Paulo) ── */
  function isBusinessHours() {
    try {
      const now = new Date();
      const spStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour12: false,
        weekday: 'short', hour: 'numeric', minute: 'numeric' });
      const parts = spStr.split(', ');
      const day = parts[0];
      const timeParts = parts[1].split(':');
      const hour = parseInt(timeParts[0], 10);
      const weekdays = ['Mon','Tue','Wed','Thu','Fri'];
      return weekdays.indexOf(day) !== -1 && hour >= 8 && hour < 18;
    } catch (_) {
      // Fallback: UTC-3
      const now = new Date();
      const spHour = ((now.getUTCHours() - 3) + 24) % 24;
      const spDay  = now.getUTCDay();
      return spDay >= 1 && spDay <= 5 && spHour >= 8 && spHour < 18;
    }
  }

  function initPhoneVisibility() {
    if (!isBusinessHours()) {
      document.querySelectorAll('.js-phone-btn').forEach(function (el) {
        el.hidden = true;
      });
    }
  }

  /* ─── Modal WA lead capture ──────────────────────────────────── */
  var _pendingWAUrl = null;

  function openModal(waUrl) {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;
    _pendingWAUrl = waUrl || 'https://wa.me/5511911794902';
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const first = modal.querySelector('input');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal() {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    _pendingWAUrl = null;
  }

  function initWAModal() {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;

    // Intercept WA button clicks → open modal
    document.querySelectorAll('.js-open-wa-modal').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(el.href || el.getAttribute('data-wa-href'));
        pushEvent('whatsapp_modal_open', {
          location: el.closest('section') ? el.closest('section').id : 'header'
        });
      });
    });

    // Close triggers
    modal.querySelectorAll('.js-modal-close').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    // Form
    const form = modal.querySelector('#contato-form');
    if (!form) return;

    const fields = {
      nome:     { el: form.querySelector('#f-nome'),     errEl: form.querySelector('#f-nome-err') },
      whatsapp: { el: form.querySelector('#f-whatsapp'), errEl: form.querySelector('#f-whatsapp-err') },
      lgpd:     { el: form.querySelector('#f-lgpd'),     errEl: form.querySelector('#f-lgpd-err') },
    };

    function validateNome(v)     { return v.trim().length >= 2 ? '' : 'Informe seu nome completo.'; }
    function validateWhatsapp(v) {
      const d = v.replace(/\D/g, '');
      if (!d) return 'Informe seu WhatsApp.';
      if (d.length < 10 || d.length > 11) return 'Número inválido. Ex.: (11) 91234-5678.';
      return '';
    }
    function validateLGPD(c)     { return c ? '' : 'É necessário aceitar para enviar.'; }

    function setError(field, msg) {
      field.errEl.textContent = msg;
      field.el.classList.toggle('is-invalid', !!msg);
      if (msg) field.el.setAttribute('aria-invalid', 'true');
      else field.el.removeAttribute('aria-invalid');
    }

    function formatPhone(el) {
      let v = el.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 6) {
        v = '(' + v.slice(0,2) + ') ' + v.slice(2, v.length > 10 ? 7 : 6) + '-' + v.slice(v.length > 10 ? 7 : 6);
      } else if (v.length > 2) {
        v = '(' + v.slice(0,2) + ') ' + v.slice(2);
      } else if (v.length > 0) {
        v = '(' + v;
      }
      el.value = v;
    }

    fields.nome.el.addEventListener('blur', function () { setError(fields.nome, validateNome(this.value)); });
    fields.whatsapp.el.addEventListener('blur', function () { setError(fields.whatsapp, validateWhatsapp(this.value)); });
    fields.whatsapp.el.addEventListener('input', function () { formatPhone(this); });

    function validateAll() {
      const e0 = validateNome(fields.nome.el.value);
      const e1 = validateWhatsapp(fields.whatsapp.el.value);
      const e2 = validateLGPD(fields.lgpd.el.checked);
      setError(fields.nome, e0);
      setError(fields.whatsapp, e1);
      setError(fields.lgpd, e2);
      return !e0 && !e1 && !e2;
    }

    const btnSubmit  = form.querySelector('#btn-submit');
    const btnText    = btnSubmit && btnSubmit.querySelector('.btn-text');
    const btnLoading = btnSubmit && btnSubmit.querySelector('.btn-loading');
    const feedback   = form.querySelector('#form-feedback');

    function setLoading(on) {
      if (!btnSubmit) return;
      btnSubmit.disabled = on;
      if (btnText)    btnText.hidden    = on;
      if (btnLoading) btnLoading.hidden = !on;
    }

    function showFeedback(msg, type) {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.className = 'form-feedback is-' + type;
      feedback.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateAll()) {
        const firstErr = form.querySelector('.is-invalid');
        if (firstErr) firstErr.focus();
        return;
      }

      setLoading(true);
      const nome  = fields.nome.el.value.trim();
      const utms  = getStoredUTMs();
      const data  = new FormData(form);
      Object.keys(utms).forEach(function (k) { data.append(k, utms[k]); });

      const action = form.getAttribute('action');

      function finish() {
        pushEvent('form_submit', { form_name: 'contato_lp_modal' });
        closeModal();
        form.reset();
        window.open(buildWAUrl(_pendingWAUrl || 'https://wa.me/5511911794902', nome), '_blank', 'noopener,noreferrer');
      }

      if (!action) {
        setTimeout(function () { setLoading(false); finish(); }, 600);
        return;
      }

      fetch(action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(function (res) {
          setLoading(false);
          if (res.ok) { finish(); }
          else {
            showFeedback('Erro ao enviar. Abrindo WhatsApp...', 'error');
            setTimeout(finish, 1500);
          }
        })
        .catch(function () {
          setLoading(false);
          showFeedback('Sem conexão. Abrindo WhatsApp...', 'error');
          setTimeout(finish, 1500);
        });
    });
  }

  /* ─── WhatsApp sticky: aparece após 300px ────────────────────── */
  function initStickyWA() {
    const sticky = document.querySelector('.js-wa-sticky');
    if (!sticky) return;
    function toggle() { sticky.hidden = window.scrollY <= 300; }
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  /* ─── Scroll reveal ──────────────────────────────────────────── */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
  }

  /* ─── Smooth scroll ──────────────────────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (!id || id === '#') return;
        try {
          const target = document.querySelector(id);
          if (!target) return;
          e.preventDefault();
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        } catch (_) {}
      });
    });
  }

  /* ─── dataLayer / GTM ───────────────────────────────────────── */
  function pushEvent(event, data) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, data || {}));
    } catch (_) {}
  }

  /* ─── Tracking ───────────────────────────────────────────────── */
  function initTracking() {
    document.querySelectorAll('.js-wa-link, .js-open-wa-modal').forEach(function (el) {
      el.addEventListener('click', function () {
        pushEvent('whatsapp_click', { location: el.closest('section') ? el.closest('section').id : 'header' });
      });
    });
  }

  /* ─── Cookie banner ──────────────────────────────────────────── */
  function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;
    if (localStorage.getItem('tile_cookie_consent')) { banner.hidden = true; return; }

    banner.hidden = false;

    function dismiss(consent) {
      localStorage.setItem('tile_cookie_consent', consent);
      banner.classList.add('is-hiding');
      setTimeout(function () { banner.hidden = true; }, 370);
      if (consent === 'accepted') pushEvent('cookie_consent', { action: 'accept' });
    }

    const btnAccept = banner.querySelector('.js-cookie-accept');
    const btnReject = banner.querySelector('.js-cookie-reject');
    if (btnAccept) btnAccept.addEventListener('click', function () { dismiss('accepted'); });
    if (btnReject) btnReject.addEventListener('click', function () { dismiss('rejected'); });
  }

  /* ─── Reveal classes ─────────────────────────────────────────── */
  function addRevealClasses() {
    ['.servico-card','.diferencial-item','.step-item','.faq-item','.section-header','.capsule-inner','.cta-final-inner']
      .forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el, i) {
          el.classList.add('reveal');
          const delay = i % 4;
          if (delay) el.classList.add('reveal-delay-' + delay);
        });
      });
  }

  /* ─── Init ───────────────────────────────────────────────────── */
  function init() {
    captureUTMs();
    updateWALinks();
    addRevealClasses();
    initReveal();
    initStickyWA();
    initSmoothScroll();
    initPhoneVisibility();
    initWAModal();
    initCookieBanner();
    initTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
