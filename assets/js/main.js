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

  /* ─── WhatsApp: injeta UTM no texto pré-preenchido ──────────── */
  function updateWALinks() {
    const utms = getStoredUTMs();
    if (!Object.keys(utms).length) return;

    const source = utms.utm_source || utms.gclid && 'google' || utms.fbclid && 'meta' || 'anuncio';
    const baseText = 'Olá, vim do anúncio e quero saber mais sobre a contabilidade da Tile';
    const enriched = encodeURIComponent(baseText + ' (' + source + ')');

    document.querySelectorAll('.js-wa-link').forEach(function (el) {
      try {
        const url = new URL(el.href);
        url.searchParams.set('text', decodeURIComponent(enriched));
        el.href = url.toString();
      } catch (_) {}
    });
  }

  /* ─── WhatsApp sticky: aparece após 300px, some no form ──────── */
  function initStickyWA() {
    const sticky = document.querySelector('.js-wa-sticky');
    const form   = document.getElementById('form');
    if (!sticky) return;

    function toggle() {
      const scrolled = window.scrollY > 300;
      let formVisible = false;

      if (form) {
        const rect = form.getBoundingClientRect();
        formVisible = rect.top < window.innerHeight && rect.bottom > 0;
      }

      if (scrolled && !formVisible) {
        sticky.hidden = false;
      } else {
        sticky.hidden = true;
      }
    }

    window.addEventListener('scroll', toggle, { passive: true });
    toggle();

    // IntersectionObserver fallback para melhor performance
    if ('IntersectionObserver' in window && form) {
      const obs = new IntersectionObserver(function (entries) {
        const inView = entries[0].isIntersecting;
        if (inView) {
          sticky.hidden = true;
        } else if (window.scrollY > 300) {
          sticky.hidden = false;
        }
      }, { threshold: 0.1 });
      obs.observe(form);
    }
  }

  /* ─── Scroll reveal via IntersectionObserver ─────────────────── */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: mostrar tudo imediatamente
      document.querySelectorAll('.reveal').forEach(function (el) {
        el.classList.add('visible');
      });
      return;
    }

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) {
      obs.observe(el);
    });
  }

  /* ─── Smooth scroll para âncoras internas ───────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (!id || id === '#') return;

        try {
          const target = document.querySelector(id);
          if (!target) return;

          e.preventDefault();
          const header = document.querySelector('.site-header');
          const offset = header ? header.offsetHeight + 16 : 80;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;

          window.scrollTo({ top: top, behavior: 'smooth' });

          // Foco acessível no destino
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        } catch (_) {}
      });
    });
  }

  /* ─── Formulário: validação e envio ─────────────────────────── */
  function initForm() {
    const form = document.getElementById('contato-form');
    if (!form) return;

    const fields = {
      nome:     { el: form.querySelector('#f-nome'),     errEl: form.querySelector('#f-nome-err') },
      email:    { el: form.querySelector('#f-email'),    errEl: form.querySelector('#f-email-err') },
      whatsapp: { el: form.querySelector('#f-whatsapp'), errEl: form.querySelector('#f-whatsapp-err') },
      lgpd:     { el: form.querySelector('#f-lgpd'),     errEl: form.querySelector('#f-lgpd-err') },
    };

    function validateNome(v) {
      if (!v.trim()) return 'Informe seu nome completo.';
      if (v.trim().length < 2) return 'Nome muito curto.';
      return '';
    }
    function validateEmail(v) {
      if (!v.trim()) return 'Informe seu e-mail.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'E-mail inválido.';
      return '';
    }
    function validateWhatsapp(v) {
      const digits = v.replace(/\D/g, '');
      if (!digits) return 'Informe seu WhatsApp.';
      if (digits.length < 10 || digits.length > 11) return 'Número inválido. Ex.: (11) 91234-5678.';
      return '';
    }
    function validateLGPD(checked) {
      if (!checked) return 'É necessário aceitar para enviar.';
      return '';
    }

    function setError(field, msg) {
      field.errEl.textContent = msg;
      if (msg) {
        field.el.classList.add('is-invalid');
        field.el.setAttribute('aria-invalid', 'true');
      } else {
        field.el.classList.remove('is-invalid');
        field.el.removeAttribute('aria-invalid');
      }
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

    // Validação em blur
    fields.nome.el.addEventListener('blur', function () {
      setError(fields.nome, validateNome(this.value));
    });
    fields.email.el.addEventListener('blur', function () {
      setError(fields.email, validateEmail(this.value));
    });
    fields.whatsapp.el.addEventListener('blur', function () {
      setError(fields.whatsapp, validateWhatsapp(this.value));
    });
    fields.whatsapp.el.addEventListener('input', function () {
      formatPhone(this);
    });

    function validateAll() {
      const errs = [
        validateNome(fields.nome.el.value),
        validateEmail(fields.email.el.value),
        validateWhatsapp(fields.whatsapp.el.value),
        validateLGPD(fields.lgpd.el.checked),
      ];
      setError(fields.nome,     errs[0]);
      setError(fields.email,    errs[1]);
      setError(fields.whatsapp, errs[2]);
      setError(fields.lgpd,     errs[3]);
      return errs.every(function (e) { return !e; });
    }

    const btnSubmit  = document.getElementById('btn-submit');
    const btnText    = btnSubmit && btnSubmit.querySelector('.btn-text');
    const btnLoading = btnSubmit && btnSubmit.querySelector('.btn-loading');
    const feedback   = document.getElementById('form-feedback');

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
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateAll()) {
        // Foco no primeiro campo com erro
        const firstErr = form.querySelector('.is-invalid');
        if (firstErr) firstErr.focus();
        return;
      }

      setLoading(true);

      const utms = getStoredUTMs();
      const data = new FormData(form);
      // Anexar UTMs ao payload
      Object.keys(utms).forEach(function (k) { data.append(k, utms[k]); });

      // Endpoint definido pelo atributo action do form.
      // Se vazio, simula sucesso (dev mode).
      const action = form.getAttribute('action');
      if (!action) {
        setTimeout(function () {
          setLoading(false);
          showFeedback('Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.', 'success');
          form.reset();
          pushEvent('form_submit', { form_name: 'contato_lp' });
        }, 800);
        return;
      }

      fetch(action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
      })
        .then(function (res) {
          setLoading(false);
          if (res.ok) {
            showFeedback('Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.', 'success');
            form.reset();
            pushEvent('form_submit', { form_name: 'contato_lp' });
          } else {
            showFeedback('Erro ao enviar. Tente pelo WhatsApp: (11) 91179-4902.', 'error');
          }
        })
        .catch(function () {
          setLoading(false);
          showFeedback('Sem conexão. Tente pelo WhatsApp: (11) 91179-4902.', 'error');
        });
    });
  }

  /* ─── dataLayer / GTM helper ────────────────────────────────── */
  function pushEvent(event, data) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, data || {}));
    } catch (_) {}
  }

  /* ─── Tracking: WhatsApp click ──────────────────────────────── */
  function initTracking() {
    document.querySelectorAll('.js-wa-link').forEach(function (el) {
      el.addEventListener('click', function () {
        pushEvent('whatsapp_click', { location: el.closest('section') ? el.closest('section').id : 'header' });
      });
    });
  }

  /* ─── Adicionar classe reveal nos elementos certos ──────────── */
  function addRevealClasses() {
    const selectors = [
      '.servico-card',
      '.diferencial-item',
      '.step-item',
      '.faq-item',
      '.section-header',
      '.capsule-inner',
      '.form-wrapper',
      '.cta-final-inner',
    ];
    selectors.forEach(function (sel, si) {
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
    initForm();
    initTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
