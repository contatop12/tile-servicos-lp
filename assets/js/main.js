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

  function initFooterPhoneVisibility() {
    var mobileMq = window.matchMedia('(max-width: 639px)');

    function update() {
      var show = mobileMq.matches && isBusinessHours();
      document.querySelectorAll('.js-footer-phone').forEach(function (el) {
        el.hidden = !show;
      });
    }

    update();
    if (typeof mobileMq.addEventListener === 'function') {
      mobileMq.addEventListener('change', update);
    } else if (typeof mobileMq.addListener === 'function') {
      mobileMq.addListener(update);
    }
  }

  /* ─── Modal WA lead capture ──────────────────────────────────── */
  var WA_BASE = 'https://api.whatsapp.com/send/?phone=5511911794902';
  var LEAD_WEBHOOK = 'https://n8n.sitespdoze.com.br/webhook/contabilidade';
  var DISQUALIFY_MEI_URL = '/nao-atendemos-mei';
  var PHONE_DDI = '55';
  var _pendingWABase = WA_BASE;
  var _lastFocus = null;

  function getNationalPhoneDigits(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('55') === 0 && d.length > 11) d = d.slice(2);
    return d.slice(0, 11);
  }

  function formatNationalPhone(digits) {
    if (!digits) return '';
    if (digits.length <= 2) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    if (digits.length <= 10) {
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
    }
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }

  function formatPhoneWithDDI(nationalDigits) {
    return '+' + PHONE_DDI + ' ' + formatNationalPhone(nationalDigits);
  }

  function isMeiPorte(porte) {
    return String(porte || '').indexOf('MEI') === 0;
  }

  function sendLeadWebhook(data) {
    var utms = getStoredUTMs();
    var payload = {
      nome: data.nome,
      empresa: data.empresa,
      email: data.email,
      telefone: data.telefone,
      porte: data.porte,
      segmento: data.segmento,
      ajuda: data.ajuda,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      utm_source: utms.utm_source || '',
      utm_medium: utms.utm_medium || '',
      utm_campaign: utms.utm_campaign || ''
    };

    fetch(LEAD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  function openModal(base) {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;
    _pendingWABase = base || WA_BASE;
    _lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const first = modal.querySelector('#f-nome');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal() {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (_) {} }
  }

  // Monta a mensagem do WhatsApp com os dados do lead
  function buildLeadMessage(d) {
    const utms = getStoredUTMs();
    const source = utms.utm_source || (utms.gclid && 'google') || (utms.fbclid && 'meta') || 'site';
    return 'Olá! Vim do ' + source + ' e quero falar com a Tile Serviços.\n\n'
      + '• Nome: ' + d.nome + '\n'
      + '• Empresa: ' + d.empresa + '\n'
      + '• E-mail: ' + d.email + '\n'
      + '• Telefone: ' + d.telefone + '\n'
      + '• Porte: ' + d.porte + '\n'
      + '• Segmento: ' + d.segmento + '\n'
      + '• Como podemos ajudar: ' + d.ajuda;
  }

  function initWAModal() {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;

    // Intercepta cliques nos botões de WhatsApp → abre modal
    document.querySelectorAll('.js-open-wa-modal').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(el.href || el.getAttribute('data-wa-href'));
        pushEvent('whatsapp_modal_open', {
          location: el.closest('section') ? el.closest('section').id : 'header'
        });
      });
    });

    // Fechar
    modal.querySelectorAll('.js-modal-close').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    const form = modal.querySelector('#lead-form');
    if (!form) return;

    const fields = {
      nome:     { el: form.querySelector('#f-nome'),     errEl: form.querySelector('#f-nome-err') },
      empresa:  { el: form.querySelector('#f-empresa'),  errEl: form.querySelector('#f-empresa-err') },
      email:    { el: form.querySelector('#f-email'),    errEl: form.querySelector('#f-email-err') },
      telefone: { el: form.querySelector('#f-telefone'), errEl: form.querySelector('#f-telefone-err') },
      porte:    { errEl: form.querySelector('#f-porte-err') },
      segmento: { el: form.querySelector('#f-segmento'), errEl: form.querySelector('#f-segmento-err') },
      ajuda:    { errEl: form.querySelector('#f-ajuda-err') },
      ajudaOutro: { el: form.querySelector('#f-ajuda-outro'), errEl: form.querySelector('#f-ajuda-outro-err') }
    };
    const ajudaOutroWrap = form.querySelector('#ajuda-outro-wrap');
    const ajudaOutroCheck = form.querySelector('#f-ajuda-outro-check');

    function validateTexto(v, msg) { return v.trim().length >= 2 ? '' : msg; }
    function validateEmail(v) {
      v = v.trim();
      if (!v) return 'Informe seu e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'E-mail inválido.';
    }
    function validateTelefone(v) {
      const d = getNationalPhoneDigits(v);
      if (!d) return 'Informe seu telefone.';
      if (d.length < 10 || d.length > 11) return 'Número inválido. Ex.: (11) 91234-5678.';
      return '';
    }
    function getPorte() {
      const checked = form.querySelector('input[name="porte"]:checked');
      return checked ? checked.value : '';
    }
    function validatePorte() { return getPorte() ? '' : 'Selecione o porte da empresa.'; }
    function getAjuda() {
      return Array.from(form.querySelectorAll('input[name="ajuda"]:checked')).map(function (el) { return el.value; });
    }
    function validateAjuda() {
      return getAjuda().length ? '' : 'Selecione ao menos uma opção.';
    }
    function validateAjudaOutro() {
      if (!ajudaOutroCheck || !ajudaOutroCheck.checked) return '';
      return validateTexto(fields.ajudaOutro.el.value, 'Descreva como podemos ajudar.');
    }
    function toggleAjudaOutro() {
      if (!ajudaOutroWrap || !ajudaOutroCheck) return;
      const show = ajudaOutroCheck.checked;
      ajudaOutroWrap.hidden = !show;
      if (!show) {
        fields.ajudaOutro.el.value = '';
        setError(fields.ajudaOutro, '');
      }
    }

    function setError(field, msg) {
      if (field.errEl) field.errEl.textContent = msg;
      if (field.el) {
        field.el.classList.toggle('is-invalid', !!msg);
        if (msg) field.el.setAttribute('aria-invalid', 'true');
        else field.el.removeAttribute('aria-invalid');
      }
    }

    function formatPhone(el) {
      var digits = getNationalPhoneDigits(el.value);
      var formatted = formatNationalPhone(digits);
      if (el.value !== formatted) el.value = formatted;
    }

    fields.nome.el.addEventListener('blur', function () { setError(fields.nome, validateTexto(this.value, 'Informe seu nome.')); });
    fields.empresa.el.addEventListener('blur', function () { setError(fields.empresa, validateTexto(this.value, 'Informe o nome da empresa.')); });
    fields.email.el.addEventListener('blur', function () { setError(fields.email, validateEmail(this.value)); });
    fields.telefone.el.addEventListener('blur', function () { setError(fields.telefone, validateTelefone(this.value)); });
    fields.telefone.el.addEventListener('input', function () { formatPhone(this); });
    fields.segmento.el.addEventListener('blur', function () { setError(fields.segmento, validateTexto(this.value, 'Informe o segmento/nicho.')); });
    form.querySelectorAll('input[name="porte"]').forEach(function (r) {
      r.addEventListener('change', function () { setError(fields.porte, validatePorte()); });
    });
    form.querySelectorAll('input[name="ajuda"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (r === ajudaOutroCheck) toggleAjudaOutro();
        setError(fields.ajuda, validateAjuda());
        setError(fields.ajudaOutro, validateAjudaOutro());
      });
    });
    fields.ajudaOutro.el.addEventListener('blur', function () {
      setError(fields.ajudaOutro, validateAjudaOutro());
    });

    function validateAll() {
      const errs = {
        nome:     validateTexto(fields.nome.el.value, 'Informe seu nome.'),
        empresa:  validateTexto(fields.empresa.el.value, 'Informe o nome da empresa.'),
        email:    validateEmail(fields.email.el.value),
        telefone: validateTelefone(fields.telefone.el.value),
        porte:    validatePorte(),
        segmento: validateTexto(fields.segmento.el.value, 'Informe o segmento/nicho.'),
        ajuda:    validateAjuda(),
        ajudaOutro: validateAjudaOutro()
      };
      Object.keys(errs).forEach(function (k) { setError(fields[k], errs[k]); });
      return !Object.keys(errs).some(function (k) { return errs[k]; });
    }

    function formatAjudaMessage() {
      const selected = getAjuda().filter(function (v) { return v !== 'Outro'; });
      if (ajudaOutroCheck && ajudaOutroCheck.checked) {
        selected.push('Outro: ' + fields.ajudaOutro.el.value.trim());
      }
      return selected.join(', ');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateAll()) {
        const firstErr = form.querySelector('.is-invalid')
          || form.querySelector('input[name="porte"]')
          || form.querySelector('input[name="ajuda"]');
        if (firstErr) firstErr.focus();
        return;
      }

      const nationalDigits = getNationalPhoneDigits(fields.telefone.el.value);
      const data = {
        nome:     fields.nome.el.value.trim(),
        empresa:  fields.empresa.el.value.trim(),
        email:    fields.email.el.value.trim(),
        telefone: formatPhoneWithDDI(nationalDigits),
        porte:    getPorte(),
        segmento: fields.segmento.el.value.trim(),
        ajuda:    formatAjudaMessage()
      };

      const isMei = isMeiPorte(data.porte);

      let url;
      if (!isMei) {
        try { url = new URL(_pendingWABase); }
        catch (_) { url = new URL(WA_BASE); }
        url.searchParams.set('text', buildLeadMessage(data));
      }

      pushEvent('conversion_secondary', {
        form_name: 'lead_wa_modal',
        conversion_type: 'secondary',
        porte: data.porte,
        ajuda: data.ajuda,
        disqualified: isMei
      });
      sendLeadWebhook(data);
      closeModal();
      form.reset();
      toggleAjudaOutro();

      if (isMei) {
        window.location.href = DISQUALIFY_MEI_URL;
      } else {
        window.open(url.toString(), '_blank', 'noopener,noreferrer');
      }
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
    ['.section-header','.hero-stat','.segmento-card','.servico-card','.diferencial-item','.dif-photo','.depoimento-card','.faq-item','.cta-strip','.cta-final-inner','.segmentos-cta']
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
    initFooterPhoneVisibility();
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
