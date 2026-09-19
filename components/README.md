# Components Reference

This folder documents the reusable UI building blocks used across the system.
All components are styled via `/css/components.css` and `/css/layout.css` using
the design tokens defined in `/css/variables.css`. Components are plain HTML +
CSS classes + small JS hooks (data-attributes) — no framework required.

## Structural
- **Sidebar** — `.sidebar` (built dynamically by `js/app-shell.js`)
- **Navbar / Topbar** — `.topbar`
- **Page Header** — `.page-header`

## Content
- **Card** — `.card`, `.card-header`, `.card-title`
- **Stat Card** — `.stat-card`
- **Appointment Card** — `.appt-card`
- **Patient Card** — `.patient-card`
- **Status Badge** — `.badge .badge-success|warning|danger|info|neutral`
- **Data Table** — `.table-wrap > table.data-table.to-cards` (responsive card fallback on mobile)
- **Empty State** — `.empty-state`
- **Error State** — `.error-state`
- **Skeleton Loader** — `.skeleton`, `.skeleton-text`, `.skeleton-title`, `.skeleton-avatar`, `.skeleton-card`

## Interaction
- **Search Bar** — `.search-bar`
- **Filter Dropdown / Dropdown Menu** — `.dropdown`, `[data-dropdown-toggle]`, `.dropdown-menu`
- **Modal** — `.modal-backdrop`, `[data-modal-open="id"]`, `[data-modal-close]`, JS: `Modal.open(id)` / `Modal.close(id)`
- **Confirmation Dialog** — JS: `ConfirmDialog.open({ title, desc, confirmLabel, tone })` returns a Promise<boolean>
- **Toast** — JS: `Toast.success(title, message)`, `Toast.error(...)`, `Toast.warning(...)`, `Toast.info(...)`
- **Tabs** — `.tabs > .tab[data-tab-target]` + `[data-tab-panel]` panels, wrap in `[data-tabs-root]` when nesting multiple tab groups
- **Pagination** — `.pagination` (built in JS per page)
- **Tooltip** — `.tooltip[data-tooltip="Text"]`

## Usage pattern (JS)
Each admin page:
1. Loads shared CSS + `js/translations.js`, `js/i18n.js`, `js/theme.js`, `js/icons.js`, `js/mock-data.js`, `js/components.js`, `js/app-shell.js`
2. Calls `THEME.init()`, `I18N.init(TRANSLATIONS)`, `AppShell.init({ active: 'pageKey' })`
3. Renders its own content into `#pageContent` from a `<template>` in the page
4. Fetches mock data via `MOCK_API.getX()` (swap internals for real `fetch()` later)

See `pages/admin/dashboard.html` for the fullest example.
