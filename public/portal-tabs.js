(() => {
  const tabs = [...document.querySelectorAll('button[data-view],button[data-student-view]')];
  const target = tab => tab.dataset.view || tab.dataset.studentView;
  function sync() {
    tabs.forEach(tab => {
      const active = tab.classList.contains('active');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }
  tabs.forEach(tab => {
    const id = target(tab), panel = document.getElementById(id);
    if (!panel) return;
    tab.id ||= 'tab-' + id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => {
      sync();
      history.replaceState(null, '', location.pathname + location.search + '#' + id);
    });
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
        : event.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length]
        : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : null;
      if (next) { event.preventDefault(); next.click(); next.focus(); }
    });
  });
  if (tabs.length) tabs[0].closest('nav')?.setAttribute('role', 'tablist');
  const restore = () => tabs.find(tab => '#' + target(tab) === location.hash)?.click();
  restore();
  sync();
  window.addEventListener('hashchange', restore);
  document.getElementById('openEnrollmentForm')?.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const url = new URL(document.getElementById('studentEnrollmentLink').value.trim());
      if (url.origin !== location.origin || url.pathname !== '/face-enroll.html' || !url.searchParams.get('enrollment')) throw Error();
      location.assign(url.href);
    } catch {
      document.getElementById('studentEnrollmentLinkStatus').textContent = 'Paste the face enrollment link shared by your teacher for this ClassSync website.';
    }
  });
})();
