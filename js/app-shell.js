/* ==========================================================================
   App Shell — builds Sidebar + Topbar for every authenticated page.
   Each page calls AppShell.init({ active: 'dashboard', user: {...} })
   ========================================================================== */

const AppShell = (() => {
  const NAV_ITEMS = [
    { key: 'dashboard', icon: 'dashboard', href: 'dashboard.html' },
    { key: 'appointments', icon: 'appointments', href: 'appointments.html' },
    { key: 'calendar', icon: 'calendar', href: 'calendar.html' },
    { key: 'patients', icon: 'patients', href: 'patients.html' },
    { key: 'treatments', icon: 'treatments', href: 'treatments.html' },
    { key: 'payments', icon: 'payments', href: 'payments.html' },
    { key: 'notifications', icon: 'notifications', href: 'notifications.html', badge: 2 },
    { key: 'reports', icon: 'reports', href: 'reports.html' },
    { key: 'employees', icon: 'employees', href: 'employees.html' },
    { key: 'settings', icon: 'settings', href: 'settings.html' },
  ];

  /* Simplified operational nav for front-desk staff — appointments, calendar, and
     reminders only. No patient-record browsing, no financial/reporting/admin screens. */
  const RECEPTIONIST_NAV_ITEMS = [
    { key: 'dashboard', icon: 'dashboard', href: 'dashboard.html' },
    { key: 'queue', icon: 'clock', href: 'queue.html' },
    { key: 'appointments', icon: 'appointments', href: 'appointments.html' },
    { key: 'calendar', icon: 'calendar', href: 'calendar.html' },
  ];

  /* Patient-facing nav — only the patient's own records, no clinic operations. */
  const PATIENT_NAV_ITEMS = [
    { key: 'dashboard', icon: 'dashboard', href: 'dashboard.html' },
    { key: 'appointments', icon: 'appointments', href: 'appointments.html' },
    { key: 'medical_history', icon: 'treatments', href: 'medical-history.html' },
    { key: 'prescriptions', icon: 'pill', href: 'prescriptions.html' },
    { key: 'invoices', icon: 'payments', href: 'invoices.html' },
    { key: 'profile', icon: 'user', href: 'profile.html' },
  ];

  const ROLES = {
    doctor: {
      navItems: NAV_ITEMS,
      user: { initials: 'DR', name: 'Dr. Amir Khalid', role: 'Doctor', settingsHref: 'settings.html', showSettingsLink: true },
    },
    receptionist: {
      navItems: RECEPTIONIST_NAV_ITEMS,
      user: { initials: 'RY', name: 'Rana Youssef', role: 'Receptionist', settingsHref: null, showSettingsLink: false },
    },
    patient: {
      navItems: PATIENT_NAV_ITEMS,
      user: { initials: 'SJ', name: 'Sarah Johnson', role: 'Patient', settingsHref: 'profile.html', showSettingsLink: true },
    },
  };

  function buildSidebar(active, role) {
    const navHtml = role.navItems.map((item) => `
      <a href="${item.href}" class="nav-item ${item.key === active ? 'active' : ''}">
        ${icon(item.icon)}
        <span class="nav-item__label" data-i18n="nav.${item.key}"></span>
        ${item.badge ? `<span class="badge-count">${item.badge}</span>` : ''}
      </a>
    `).join('');

    const user = role.user;
    const settingsItem = user.showSettingsLink
      ? `<a href="${user.settingsHref}" class="dropdown-item">${icon('user')}<span data-i18n="settings.profile"></span></a>`
      : `<span class="dropdown-item" style="opacity:.6; cursor:default;">${icon('user')}<span>${user.role}</span></span>`;

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__brand">
          <div class="sidebar__brand-logo">${ICONS.logo}</div>
          <div class="sidebar__brand-name">
            <span data-i18n="app.name"></span>
            <small data-i18n="app.tagline"></small>
          </div>
        </div>
        <nav class="sidebar__nav">${navHtml}</nav>
        <div class="sidebar__footer">
          <div class="dropdown" style="width:100%;">
            <button class="sidebar__user w-full" data-dropdown-toggle style="width:100%; text-align:start;">
              <div class="avatar avatar-md">${user.initials}</div>
              <div class="sidebar__user-info">
                <div class="sidebar__user-name">${user.name}</div>
                <div class="sidebar__user-role">${user.role}</div>
              </div>
            </button>
            <div class="dropdown-menu" style="bottom: calc(100% + 6px); top: auto;">
              ${settingsItem}
              <a href="../public/login.html" class="dropdown-item danger logout-link">${icon('logout')}<span>Log Out</span></a>
            </div>
          </div>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
    `;
  }

  function buildTopbar(role) {
    const user = role.user;
    const settingsItems = user.showSettingsLink
      ? `<a href="${user.settingsHref}" class="dropdown-item">${icon('user')}<span data-i18n="settings.profile"></span></a>
         <a href="${user.settingsHref}" class="dropdown-item">${icon('settings')}<span data-i18n="nav.settings"></span></a>
         <div class="dropdown-divider"></div>`
      : '';
    const notifHref = role.navItems.some(i => i.key === 'notifications') ? 'notifications.html' : null;

    return `
      <header class="topbar">
        <div class="topbar__left">
          <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle menu">${icon('menu')}</button>
          <div class="search-bar topbar__search">
            ${icon('search')}
            <input type="text" id="globalSearch" data-i18n-placeholder="topbar.search_placeholder" placeholder="Search">
          </div>
        </div>
        <div class="topbar__right">
          <div class="lang-switch" id="langSwitch">
            <button data-lang="en">EN</button>
            <button data-lang="ar">AR</button>
          </div>
          <button class="icon-btn" id="themeToggle" data-i18n-title="theme.toggle" title="Toggle theme">
            <span id="themeIconSun">${ICONS.sun}</span>
            <span id="themeIconMoon" class="hidden">${ICONS.moon}</span>
          </button>
          ${notifHref ? `
          <button class="icon-btn tooltip" data-tooltip="Notifications" onclick="location.href='${notifHref}'">
            ${icon('bell')}
            <span class="dot"></span>
          </button>` : ''}
          <div class="dropdown">
            <button class="topbar__user" data-dropdown-toggle>
              <div class="avatar avatar-sm">${user.initials}</div>
              <span class="hidden md-inline">${user.name.split(' ')[0]}</span>
              ${icon('chevronDown')}
            </button>
            <div class="dropdown-menu dropdown-menu-end">
              ${settingsItems}
              <a href="../public/login.html" class="dropdown-item danger logout-link">${icon('logout')}<span>Log Out</span></a>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function wireEvents() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('sidebarToggle');

    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('open');
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('open');
    });

    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');
    function syncThemeIcon() {
      const isDark = THEME.getTheme() === 'dark';
      sunIcon.classList.toggle('hidden', isDark);
      moonIcon.classList.toggle('hidden', !isDark);
    }
    syncThemeIcon();
    themeToggle?.addEventListener('click', () => { THEME.toggle(); syncThemeIcon(); });

    const langButtons = document.querySelectorAll('#langSwitch button');
    function syncLangButtons() {
      const lang = I18N.getLang();
      langButtons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
    }
    syncLangButtons();
    langButtons.forEach((b) => b.addEventListener('click', () => {
      I18N.setLang(b.getAttribute('data-lang'));
      syncLangButtons();
    }));

    document.querySelectorAll('.logout-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const destination = link.getAttribute('href');
        const finish = () => { window.location.href = destination; };
        if (typeof AUTH !== 'undefined') {
          AUTH.signOut().then(finish).catch(finish);
        } else {
          if (typeof TENANT !== 'undefined') TENANT.clear();
          finish();
        }
      });
    });
  }

  /* "Dr. Lina Wolfe" -> "LW". Strips a leading "Dr."/"Dr" title token, takes the
     first letter of each remaining word, capped at 2 characters. */
  function initialsFromName(name) {
    const parts = name.replace(/^Dr\.?\s+/i, '').split(' ').filter(Boolean);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }

  /* Once the real clinic doc loads, patch the doctor's name/initials into the
     already-rendered shell rather than blocking the initial render on a
     network round-trip. */
  function applyDoctorIdentity(clinic) {
    if (!clinic) return;
    const initials = initialsFromName(clinic.doctorName);
    document.querySelectorAll('.sidebar__user-name').forEach((el) => { el.textContent = clinic.doctorName; });
    document.querySelectorAll('.sidebar__user .avatar, .topbar__user .avatar').forEach((el) => { el.textContent = initials; });
    const topbarFirstName = document.querySelector('.topbar__user .md-inline');
    if (topbarFirstName) topbarFirstName.textContent = clinic.doctorName.split(' ').pop();
  }

  function init({ active, role = 'doctor' }) {
    const shellRoot = document.getElementById('app-shell');
    if (!shellRoot) return;
    // Clone so per-session doctor-identity overrides below never mutate the shared ROLES config.
    const roleConfig = JSON.parse(JSON.stringify(ROLES[role] || ROLES.doctor));
    shellRoot.innerHTML = `
      ${buildSidebar(active, roleConfig)}
      <div class="main">
        ${buildTopbar(roleConfig)}
        <div class="content" id="pageContent"></div>
      </div>
    `;
    wireEvents();
    I18N.applyToDOM();

    if (role === 'doctor' && typeof TENANT !== 'undefined' && typeof MOCK_API !== 'undefined') {
      const clinicId = TENANT.getCurrentClinicId();
      if (clinicId) {
        MOCK_API.getClinicById(clinicId).then(applyDoctorIdentity).catch(() => {});
      }
    }
  }

  return { init, NAV_ITEMS, RECEPTIONIST_NAV_ITEMS };
})();
