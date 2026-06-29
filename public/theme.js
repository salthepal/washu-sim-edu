(() => {
  const key = 'washu-em-sim-theme';

  const readCookieTheme = () => {
    const match = document.cookie.match(/(?:^|;\s*)washu-em-sim-theme=(dark|light)(?:;|$)/);
    return match ? match[1] : null;
  };

  const writeCookieTheme = (theme) => {
    const host = window.location.hostname;
    const domain = host === 'localhost' || host === '127.0.0.1' ? '' : '; domain=.washuemsim.org';
    document.cookie = `${key}=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}`;
  };

  const getTheme = () => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    return readCookieTheme() === 'dark' ? 'dark' : 'light';
  };

  const persistTheme = (theme) => {
    try {
      localStorage.setItem(key, theme);
    } catch {}
    writeCookieTheme(theme);
  };

  const apply = (theme) => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-pressed', String(isDark));
      button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = button.querySelector('.theme-toggle__icon');
      const text = button.querySelector('.theme-toggle__text');
      if (icon) icon.textContent = isDark ? '☀' : '☾';
      if (text) text.textContent = isDark ? 'Light' : 'Dark';
    });
  };

  apply(getTheme());

  document.addEventListener('DOMContentLoaded', () => {
    apply(getTheme());

    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        persistTheme(nextTheme);
        apply(nextTheme);
        window.dispatchEvent(new CustomEvent('washu-theme-change', { detail: { theme: nextTheme } }));
      });
    });
  });

  window.addEventListener('storage', (event) => {
    if (event.key === key) apply(getTheme());
  });
})();
