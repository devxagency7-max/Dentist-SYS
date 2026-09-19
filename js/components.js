/* ==========================================================================
   Shared component behavior: Toasts, Modals, Confirm Dialog, Dropdowns
   ========================================================================== */

/* ---------- Toasts ---------- */
const Toast = (() => {
  let region;

  function ensureRegion() {
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    return region;
  }

  const ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  function show({ type = 'info', title, message, duration = 4000 }) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    ensureRegion().appendChild(el);

    const remove = () => {
      el.classList.add('closing');
      setTimeout(() => el.remove(), 220);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    if (duration) setTimeout(remove, duration);
    return el;
  }

  return {
    show,
    success: (title, message, duration) => show({ type: 'success', title, message, duration }),
    error: (title, message, duration) => show({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => show({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => show({ type: 'info', title, message, duration }),
  };
})();

/* ---------- Modal ---------- */
const Modal = (() => {
  function open(id) {
    const backdrop = document.getElementById(id);
    if (!backdrop) return;
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close(id) {
    const backdrop = document.getElementById(id);
    if (!backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeAll() {
    document.querySelectorAll('.modal-backdrop.open').forEach((b) => b.classList.remove('open'));
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('open');
      document.body.style.overflow = '';
    }
    const closeBtn = e.target.closest('[data-modal-close]');
    if (closeBtn) {
      const backdrop = closeBtn.closest('.modal-backdrop');
      if (backdrop) {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
    const openBtn = e.target.closest('[data-modal-open]');
    if (openBtn) {
      open(openBtn.getAttribute('data-modal-open'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  return { open, close, closeAll };
})();

/* ---------- Confirm Dialog ---------- */
const ConfirmDialog = (() => {
  let resolver = null;

  function ensureModal() {
    let el = document.getElementById('confirm-dialog-modal');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.id = 'confirm-dialog-modal';
    el.innerHTML = `
      <div class="modal modal-sm" role="alertdialog" aria-modal="true">
        <div class="modal-body" style="text-align:center; padding-top: var(--space-8);">
          <div class="confirm-icon danger" style="margin-inline:auto;" id="confirm-dialog-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <h3 id="confirm-dialog-title">Delete this item?</h3>
          <p class="text-muted mt-2" id="confirm-dialog-desc">This action cannot be undone.</p>
        </div>
        <div class="modal-footer" style="justify-content:center;">
          <button class="btn btn-secondary" id="confirm-dialog-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-dialog-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector('#confirm-dialog-cancel').addEventListener('click', () => settle(false));
    el.querySelector('#confirm-dialog-ok').addEventListener('click', () => settle(true));
    el.addEventListener('click', (e) => { if (e.target === el) settle(false); });

    return el;
  }

  function settle(result) {
    const el = document.getElementById('confirm-dialog-modal');
    el.classList.remove('open');
    document.body.style.overflow = '';
    if (resolver) { resolver(result); resolver = null; }
  }

  function open({ title, desc, confirmLabel = 'Confirm', tone = 'danger' } = {}) {
    const el = ensureModal();
    if (title) el.querySelector('#confirm-dialog-title').textContent = title;
    if (desc) el.querySelector('#confirm-dialog-desc').textContent = desc;
    const okBtn = el.querySelector('#confirm-dialog-ok');
    okBtn.textContent = confirmLabel;
    okBtn.className = tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary';
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    return new Promise((resolve) => { resolver = resolve; });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const el = document.getElementById('confirm-dialog-modal');
      if (el && el.classList.contains('open')) settle(false);
    }
  });

  return { open };
})();

/* ---------- Dropdowns ---------- */
(function initDropdowns() {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-dropdown-toggle]');
    if (toggle) {
      const dropdown = toggle.closest('.dropdown');
      const wasOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
      if (!wasOpen) dropdown.classList.add('open');
      e.stopPropagation();
      return;
    }
    if (!e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
    }
  });
})();

/* ---------- Tabs ---------- */
(function initTabs() {
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab[data-tab-target]');
    if (!tab) return;
    const group = tab.closest('.tabs');
    const targetSelector = tab.getAttribute('data-tab-target');
    const panelGroup = tab.closest('[data-tabs-root]') || document;

    group.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    panelGroup.querySelectorAll('[data-tab-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.getAttribute('data-tab-panel') !== targetSelector);
    });
  });
})();
