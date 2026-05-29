(function () {
  var LANG_KEY = 'digitaldoc-language';
  var SUPPORTED = ['ro', 'en'];

  function getStoredLanguage() {
    try {
      var raw = localStorage.getItem(LANG_KEY);
      if (raw === 'en' || raw === 'ro') return raw;
    } catch (_) {
      /* ignore */
    }
    return 'ro';
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

  function setLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return Promise.resolve();
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_) {
      /* ignore */
    }
    return loadLocale(lang).then(function (dict) {
      applyTranslations(dict, lang);
    });
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
    setLanguage(getStoredLanguage()).catch(function (err) {
      console.error(err);
    });
  });
})();
