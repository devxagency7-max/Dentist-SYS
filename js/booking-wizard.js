/* ==========================================================================
   Booking Wizard — shared 5-step "New Appointment" modal for Doctor and
   Receptionist pages. Injects its own modal markup into <body> and wires up
   navigation. Writes the appointment (and, for a new patient, the patient)
   directly to Firestore via MOCK_API/TENANT — same data source the rest of
   the app already uses.
   Usage: include this script AFTER js/firebase-init.js, js/firestore-api.js
   and js/tenant.js, then call BookingWizard.mount() once the page's
   i18n/theme scripts have loaded.
   ========================================================================== */

const BookingWizard = (() => {
  const STEP_KEYS = ['patient', 'service', 'date', 'time', 'confirm'];
  const STEP_LABELS = {
    patient: 'receptionist.step_patient',
    service: 'receptionist.step_service',
    date: 'receptionist.step_date',
    time: 'receptionist.step_time',
    confirm: 'receptionist.step_confirm',
  };

  let state = {};
  let stepIndex = 0;
  let patients = [];
  let treatments = [];
  let appointments = [];
  let clinicId = null;
  let branchId = null;
  let doctorName = '';
  let saving = false;
  const ALL_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function resetState() {
    state = { patientMode: 'existing', patientId: null, patientName: '', patientPhone: '', treatmentId: null, date: todayISO(), time: null, channels: ['whatsapp'] };
    stepIndex = 0;
  }

  function markup() {
    return `
    <div class="modal-backdrop" id="bookingWizardModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title" data-i18n="receptionist.book_appointment">Book Appointment</div>
          <button class="btn-icon btn-sm" data-modal-close><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="wizard-steps" id="wizardSteps"></div>
        <div class="modal-body wizard-body" id="wizardBody"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="wizardBackBtn" data-i18n="common.back">Back</button>
          <button class="btn btn-primary" id="wizardNextBtn" data-i18n="common.next">Next</button>
        </div>
      </div>
    </div>`;
  }

  function renderSteps() {
    document.getElementById('wizardSteps').innerHTML = STEP_KEYS.map((key, i) => {
      const cls = i === stepIndex ? 'active' : i < stepIndex ? 'done' : '';
      const dotContent = i < stepIndex ? icon('check') : (i + 1);
      const line = i < STEP_KEYS.length - 1 ? '<div class="wizard-step-line"></div>' : '';
      return `
        <div class="wizard-step ${cls}">
          <div class="wizard-step__dot">${dotContent}</div>
          <div class="wizard-step__label">${I18N.t(STEP_LABELS[key])}</div>
        </div>${line}`;
    }).join('');
  }

  function initials(name) { return name.split(' ').map(n => n[0]).join('').slice(0, 2); }

  function renderPatientStep() {
    const existingSelected = state.patientMode === 'existing';
    return `
      <div class="tabs" style="border-bottom:1px solid var(--color-border); margin-bottom: var(--space-4);">
        <button class="tab ${existingSelected ? 'active' : ''}" id="tabExisting" data-i18n="receptionist.existing_patient">Existing Patient</button>
        <button class="tab ${!existingSelected ? 'active' : ''}" id="tabNew" data-i18n="receptionist.new_patient_tab">New Patient</button>
      </div>
      <div id="patientStepBody"></div>
    `;
  }

  function renderPatientStepBody() {
    const el = document.getElementById('patientStepBody');
    if (!el) return;
    if (state.patientMode === 'existing') {
      el.innerHTML = `
        <div class="search-bar mb-3" style="margin-bottom: var(--space-3);">
          ${icon('search')}
          <input type="text" id="wizardPatientSearch" data-i18n-placeholder="receptionist.search_placeholder_lg" placeholder="Search by name, phone, or patient ID...">
        </div>
        <div class="wizard-option-grid" id="wizardPatientList" style="max-height:280px; overflow-y:auto;"></div>
      `;
      const listEl = document.getElementById('wizardPatientList');
      function renderList(filter) {
        const filtered = !filter ? patients : patients.filter(p =>
          p.name.toLowerCase().includes(filter.toLowerCase()) || (p.phone || '').includes(filter) || p.id.toLowerCase().includes(filter.toLowerCase()));
        listEl.innerHTML = filtered.slice(0, 20).map(p => `
          <button class="wizard-option ${state.patientId === p.id ? 'selected' : ''}" data-id="${p.id}">
            <div class="avatar avatar-sm" style="background:#${p.avatarColor || '2563EB'}22; color:#${p.avatarColor || '2563EB'};">${initials(p.name)}</div>
            <div>
              <div class="wizard-option__title">${p.name}</div>
              <div class="wizard-option__meta">${p.phone || ''} · ${p.id}</div>
            </div>
          </button>
        `).join('') || `<div class="text-sm text-muted" style="padding: var(--space-4);">${I18N.t('common.no_results')}</div>`;
        listEl.querySelectorAll('.wizard-option').forEach(btn => btn.addEventListener('click', () => {
          const p = patients.find(x => x.id === btn.dataset.id);
          state.patientId = p.id; state.patientName = p.name;
          renderList(document.getElementById('wizardPatientSearch').value);
          syncNextEnabled();
        }));
      }
      renderList('');
      document.getElementById('wizardPatientSearch').addEventListener('input', (e) => renderList(e.target.value));
    } else {
      el.innerHTML = `
        <div class="form-row">
          <div class="form-group"><label class="form-label" data-i18n="common.name">Name</label><input type="text" class="form-control" id="wizardNewName" placeholder="Full name" value="${state.patientName || ''}"></div>
          <div class="form-group"><label class="form-label" data-i18n="common.phone">Phone</label><input type="tel" class="form-control" id="wizardNewPhone" placeholder="+1 555-0100" value="${state.patientPhone || ''}"></div>
        </div>
      `;
      document.getElementById('wizardNewName').addEventListener('input', (e) => { state.patientName = e.target.value; syncNextEnabled(); });
      document.getElementById('wizardNewPhone').addEventListener('input', (e) => { state.patientPhone = e.target.value; syncNextEnabled(); });
    }
  }

  function renderServiceStep() {
    return `<div class="wizard-option-grid" id="serviceGrid"></div>`;
  }
  function renderServiceStepBody() {
    document.getElementById('serviceGrid').innerHTML = treatments.map(t => `
      <button class="wizard-option ${state.treatmentId === t.id ? 'selected' : ''}" data-id="${t.id}">
        <div>
          <div class="wizard-option__title">${t.name}</div>
          <div class="wizard-option__meta">${t.duration} min · $${t.cost}</div>
        </div>
      </button>
    `).join('') || `<div class="text-sm text-muted" style="padding: var(--space-4);">${I18N.t('common.no_results')}</div>`;
    document.querySelectorAll('#serviceGrid .wizard-option').forEach(btn => btn.addEventListener('click', () => {
      state.treatmentId = btn.dataset.id;
      renderServiceStepBody();
      syncNextEnabled();
    }));
  }

  function renderDateStep() {
    return `
      <div class="form-group">
        <label class="form-label" data-i18n="common.date">Date</label>
        <input type="date" class="form-control" id="wizardDateInput" value="${state.date}" min="${todayISO()}">
      </div>
    `;
  }
  function renderDateStepBody() {
    document.getElementById('wizardDateInput').addEventListener('change', (e) => { state.date = e.target.value; syncNextEnabled(); });
  }

  function renderTimeStep() {
    return `<div class="time-slot-grid" id="timeGrid"></div>`;
  }
  function renderTimeStepBody() {
    const sameDay = appointments.filter(a => a.date === state.date && !['cancelled', 'no_show'].includes(a.status));
    const taken = new Set(sameDay.map(a => a.time));
    document.getElementById('timeGrid').innerHTML = ALL_TIMES.map(t => `
      <button class="time-slot ${state.time === t ? 'selected' : ''}" data-time="${t}" ${taken.has(t) ? 'disabled' : ''}>${t}</button>
    `).join('');
    document.querySelectorAll('#timeGrid .time-slot:not(:disabled)').forEach(btn => btn.addEventListener('click', () => {
      state.time = btn.dataset.time;
      renderTimeStepBody();
      syncNextEnabled();
    }));
  }

  function renderConfirmStep() {
    const treatment = treatments.find(t => t.id === state.treatmentId);
    const patientLabel = state.patientMode === 'existing' ? state.patientName : `${state.patientName} (new)`;
    const channelDefs = [
      { key: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp' },
      { key: 'sms', icon: 'sms', label: 'SMS' },
      { key: 'email', icon: 'mail', label: 'Email' },
    ];
    return `
      <h3 style="margin-bottom: var(--space-4);" data-i18n="receptionist.confirm_summary_title">Review Appointment</h3>
      <div class="summary-row"><span class="summary-row__label" data-i18n="common.patient">Patient</span><span class="summary-row__value">${patientLabel}</span></div>
      <div class="summary-row"><span class="summary-row__label" data-i18n="common.doctor">Doctor</span><span class="summary-row__value">${doctorName}</span></div>
      <div class="summary-row"><span class="summary-row__label" data-i18n="common.treatment">Service</span><span class="summary-row__value">${treatment ? treatment.name : ''}</span></div>
      <div class="summary-row"><span class="summary-row__label" data-i18n="common.date">Date</span><span class="summary-row__value">${state.date}</span></div>
      <div class="summary-row"><span class="summary-row__label" data-i18n="common.time">Time</span><span class="summary-row__value">${state.time}</span></div>
      <p class="text-sm text-muted" style="margin: var(--space-4) 0 var(--space-2);" data-i18n="receptionist.notify_via">Send confirmation via</p>
      <div class="channel-toggle-group" id="channelToggleGroup">
        ${channelDefs.map(c => `
          <button class="channel-toggle ${state.channels.includes(c.key) ? 'selected' : ''}" data-channel="${c.key}">
            ${icon(c.icon)}<span>${c.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="whatsapp-preview" style="margin-top: var(--space-4); display:flex; align-items:flex-start; gap: var(--space-3); background: var(--color-success-light); border: 1px solid var(--color-success); border-radius: var(--radius-md); padding: var(--space-3);">
        <span style="color:var(--color-success); flex-shrink:0;">${icon('checkCircle')}</span>
        <div class="text-sm" data-i18n="receptionist.confirm_notice">Appointment confirmation will be sent to the patient.</div>
      </div>
    `;
  }
  function renderConfirmStepBody() {
    document.querySelectorAll('#channelToggleGroup .channel-toggle').forEach(btn => btn.addEventListener('click', () => {
      const ch = btn.dataset.channel;
      const idx = state.channels.indexOf(ch);
      if (idx === -1) state.channels.push(ch); else state.channels.splice(idx, 1);
      document.querySelectorAll('#channelToggleGroup .channel-toggle').forEach(b => b.classList.toggle('selected', state.channels.includes(b.dataset.channel)));
    }));
  }

  function syncNextEnabled() {
    const btn = document.getElementById('wizardNextBtn');
    if (!btn) return;
    let valid = true;
    switch (STEP_KEYS[stepIndex]) {
      case 'patient':
        valid = state.patientMode === 'existing' ? !!state.patientId : !!(state.patientName && state.patientPhone);
        break;
      case 'service': valid = !!state.treatmentId; break;
      case 'date': valid = !!state.date; break;
      case 'time': valid = !!state.time; break;
      default: valid = true;
    }
    btn.disabled = !valid || saving;
  }

  function renderStepBody() {
    const body = document.getElementById('wizardBody');
    const key = STEP_KEYS[stepIndex];
    const renderers = {
      patient: renderPatientStep, service: renderServiceStep,
      date: renderDateStep, time: renderTimeStep, confirm: renderConfirmStep,
    };
    body.innerHTML = renderers[key]();
    I18N.applyToDOM(body);

    if (key === 'patient') {
      renderPatientStepBody();
      document.getElementById('tabExisting').addEventListener('click', () => { state.patientMode = 'existing'; renderPatientStepBody2(); });
      document.getElementById('tabNew').addEventListener('click', () => { state.patientMode = 'new'; renderPatientStepBody2(); });
    }
    if (key === 'service') renderServiceStepBody();
    if (key === 'date') renderDateStepBody();
    if (key === 'time') renderTimeStepBody();
    if (key === 'confirm') renderConfirmStepBody();

    syncNextEnabled();
  }

  function renderPatientStepBody2() {
    // re-render the whole patient step (tabs + body) since switching mode changes the tab active state
    const body = document.getElementById('wizardBody');
    body.innerHTML = renderPatientStep();
    I18N.applyToDOM(body);
    renderPatientStepBody();
    document.getElementById('tabExisting').addEventListener('click', () => { state.patientMode = 'existing'; renderPatientStepBody2(); });
    document.getElementById('tabNew').addEventListener('click', () => { state.patientMode = 'new'; renderPatientStepBody2(); });
    syncNextEnabled();
  }

  function updateFooter() {
    const backBtn = document.getElementById('wizardBackBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    backBtn.classList.toggle('hidden', stepIndex === 0);
    if (stepIndex === STEP_KEYS.length - 1) {
      nextBtn.textContent = I18N.t('receptionist.book_appointment');
    } else {
      nextBtn.textContent = I18N.t('common.next');
    }
  }

  function goStep(delta) {
    stepIndex = Math.max(0, Math.min(STEP_KEYS.length - 1, stepIndex + delta));
    renderSteps();
    renderStepBody();
    updateFooter();
  }

  async function confirmBooking() {
    if (saving) return;
    saving = true;
    const nextBtn = document.getElementById('wizardNextBtn');
    nextBtn.disabled = true;

    try {
      const treatment = treatments.find(t => t.id === state.treatmentId);
      let patientId = state.patientId;
      let patientName = state.patientName;

      if (state.patientMode === 'new') {
        patientId = await MOCK_API.addPatient({
          clinicId, branchId, name: state.patientName, phone: state.patientPhone, email: '',
          age: null, gender: '', lastVisit: null, status: 'active', condition: treatment ? treatment.name : '',
          balance: 0, avatarColor: '2563EB', allergies: [], medicalHistory: '',
          treatmentsDone: [], prescriptions: [], attachments: [], notes: [],
        });
      }

      await MOCK_API.addAppointment({
        clinicId, branchId, patientId, patientName, doctor: doctorName,
        treatment: treatment ? treatment.name : '', date: state.date, time: state.time,
        duration: treatment ? treatment.duration : 30, status: 'confirmed',
      });

      Modal.close('bookingWizardModal');
      Toast.success(I18N.t('toast.saved_title'), I18N.t('receptionist.confirm_notice'));
      document.dispatchEvent(new CustomEvent('booking:created'));
    } catch (err) {
      Toast.error(I18N.t('toast.error_title') || 'Error', err.message || 'Could not save the appointment.');
    } finally {
      saving = false;
      nextBtn.disabled = false;
    }
  }

  function mount() {
    if (document.getElementById('bookingWizardModal')) return;
    document.body.insertAdjacentHTML('beforeend', markup());

    clinicId = typeof TENANT !== 'undefined' ? TENANT.getCurrentClinicId() : null;
    branchId = typeof TENANT !== 'undefined' ? TENANT.getCurrentBranchId() : null;

    const loads = [
      MOCK_API.getPatients(clinicId),
      MOCK_API.getTreatments(clinicId),
      MOCK_API.getAppointments(clinicId),
      MOCK_API.getClinicById(clinicId),
    ];
    // A doctor has no branchId pinned (they see every branch); fall back to
    // their default branch so new patients/appointments still carry one.
    if (!branchId) loads.push(MOCK_API.getBranches(clinicId));

    Promise.all(loads).then(([p, t, a, clinic, branches]) => {
      patients = p;
      treatments = t.filter(x => x.status === 'active');
      appointments = a;
      doctorName = clinic ? clinic.doctorName : '';
      if (!branchId && branches && branches.length) {
        branchId = (branches.find(b => b.isDefault) || branches[0]).id;
      }
    });

    document.getElementById('wizardNextBtn').addEventListener('click', () => {
      if (stepIndex === STEP_KEYS.length - 1) { confirmBooking(); return; }
      goStep(1);
    });
    document.getElementById('wizardBackBtn').addEventListener('click', () => goStep(-1));

    // Reset wizard state whenever it's opened via data-modal-open="bookingWizardModal"
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-modal-open="bookingWizardModal"]');
      if (opener) {
        resetState();
        renderSteps();
        renderStepBody();
        updateFooter();
      }
    });
  }

  return { mount, open: () => Modal.open('bookingWizardModal') };
})();
