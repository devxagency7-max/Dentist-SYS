/* ==========================================================================
   Tenant/session manager — tracks which clinic (doctor account) and, for a
   receptionist, which branch of that clinic is "logged in" for this browser
   session. Prototype-only: real auth/session would live server-side; this
   simulates it via localStorage, exactly like THEME (clinic.theme) and I18N
   (clinic.lang) already do. A doctor's branchId is left unset — they see all
   of their own branches; only a receptionist is pinned to one.
   ========================================================================== */

const TENANT = (() => {
  const CLINIC_KEY = 'clinic.currentClinicId';
  const BRANCH_KEY = 'clinic.currentBranchId';

  function setCurrentClinicId(clinicId) {
    localStorage.setItem(CLINIC_KEY, clinicId);
    document.dispatchEvent(new CustomEvent('tenant:changed', { detail: { clinicId, branchId: getCurrentBranchId() } }));
  }

  function getCurrentClinicId() {
    return localStorage.getItem(CLINIC_KEY);
  }

  function setCurrentBranchId(branchId) {
    if (branchId) {
      localStorage.setItem(BRANCH_KEY, branchId);
    } else {
      localStorage.removeItem(BRANCH_KEY);
    }
    document.dispatchEvent(new CustomEvent('tenant:changed', { detail: { clinicId: getCurrentClinicId(), branchId } }));
  }

  function getCurrentBranchId() {
    return localStorage.getItem(BRANCH_KEY);
  }

  function clear() {
    localStorage.removeItem(CLINIC_KEY);
    localStorage.removeItem(BRANCH_KEY);
    document.dispatchEvent(new CustomEvent('tenant:changed', { detail: { clinicId: null, branchId: null } }));
  }

  return { setCurrentClinicId, getCurrentClinicId, setCurrentBranchId, getCurrentBranchId, clear };
})();
