(function () {
  var LANG_KEY = 'digitaldoc-language';
  var SUPPORTED = ['ro', 'en'];
  var GEO_TIMEOUT_MS = 3500;

  function getSavedLanguage() {
    try {
      var raw = localStorage.getItem(LANG_KEY);
      if (raw === 'en' || raw === 'ro') return raw;
    } catch (_) {
      /* ignore */
    }
    return null;
  }

  /** Romania → ro; otherwise en (browser/timezone hints when geo is unavailable). */
  function localeFromCountryCode(code) {
    return code === 'RO' ? 'ro' : 'en';
  }

  function syncLocaleHint() {
    var tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (_) {
      /* ignore */
    }
    if (tz === 'Europe/Bucharest') return 'ro';

    var langs = [navigator.language].concat(navigator.languages || []);
    for (var i = 0; i < langs.length; i++) {
      var tag = String(langs[i] || '').toLowerCase();
      if (tag === 'ro' || tag.indexOf('ro-') === 0) return 'ro';
    }
    return 'en';
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .then(function (res) {
        clearTimeout(timer);
        return res;
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function parseCloudflareTrace(text) {
    var match = text.match(/^loc=([A-Z]{2})$/m);
    return match ? match[1] : null;
  }

  function detectCountryCode() {
    return fetchWithTimeout('https://www.cloudflare.com/cdn-cgi/trace', {}, GEO_TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) throw new Error('cf trace failed');
        return res.text();
      })
      .then(function (text) {
        var code = parseCloudflareTrace(text);
        if (!code) throw new Error('cf trace missing loc');
        return code;
      })
      .catch(function () {
        return fetchWithTimeout('https://ipapi.co/country_code/', {}, GEO_TIMEOUT_MS).then(
          function (res) {
            if (!res.ok) throw new Error('ipapi failed');
            return res.text();
          }
        );
      })
      .then(function (text) {
        return String(text || '')
          .trim()
          .toUpperCase();
      });
  }

  function detectDefaultLanguage() {
    return detectCountryCode()
      .then(localeFromCountryCode)
      .catch(function () {
        return syncLocaleHint();
      });
  }

  function resolveInitialLanguage() {
    var saved = getSavedLanguage();
    if (saved) return Promise.resolve(saved);
    return detectDefaultLanguage();
  }

  function getNested(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o && o[k] != null ? o[k] : null;
    }, obj);
  }

  function loadLocale(lang) {
    return fetch('i18n/' + lang + '.json').then(function (res) {
      if (!res.ok) throw new Error('Failed to load locale: ' + lang);
      return res.json();
    });
  }

  function applyTranslations(dict, lang) {
    document.documentElement.lang = lang;
    document.title = dict.meta.title;

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', dict.meta.description);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = getNested(dict, key);
      if (val != null) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var val = getNested(dict, key);
      if (val != null) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = getNested(dict, key);
      if (val != null) el.placeholder = val;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      var val = getNested(dict, key);
      if (val != null) el.setAttribute('aria-label', val);
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      var val = getNested(dict, key);
      if (val != null) el.alt = val;
    });

    document.querySelectorAll('.lang-switch__btn').forEach(function (btn) {
      var active = btn.dataset.lang === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function applyLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return Promise.resolve();
    return loadLocale(lang).then(function (dict) {
      applyTranslations(dict, lang);
    });
  }

  function setLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return Promise.resolve();
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_) {
      /* ignore */
    }
    return applyLanguage(lang);
  }

  function closeThemePanel() {
    var themePanel = document.getElementById('theme-panel');
    var themeTrigger = document.getElementById('theme-trigger');
    if (themePanel) themePanel.hidden = true;
    if (themeTrigger) themeTrigger.setAttribute('aria-expanded', 'false');
  }

  function closeMobileNav() {
    var header = document.getElementById('header');
    var menuToggle = document.getElementById('menu-toggle');
    var navBackdrop = document.getElementById('nav-backdrop');
    if (header) header.classList.remove('nav-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (navBackdrop) navBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function initLangSwitcher() {
    document.querySelectorAll('.lang-switch__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.dataset.lang;
        if (!lang) return;
        closeThemePanel();
        closeMobileNav();
        setLanguage(lang).catch(function (err) {
          console.error(err);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initLangSwitcher();
    resolveInitialLanguage()
      .then(applyLanguage)
      .catch(function (err) {
        console.error(err);
      });
  });
})();
