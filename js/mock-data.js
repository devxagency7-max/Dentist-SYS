/* ==========================================================================
   Mock Data — structured to mirror future API shapes.
   Replace MOCK_API calls with real fetch() calls when backend is ready.
   ========================================================================== */

const MOCK_DATA = {
  clinics: [],
  patients: [],
  appointments: [],
  queue: [],
  treatments: [],
  payments: [],
  employees: [],
  notifications: [],
  messageLog: [],
  revenueChart: { labels: [], values: [] },
  monthlyRevenueChart: { labels: [], values: [] },
  appointmentStatusChart: { labels: [], values: [], colors: [] },
  noShowChart: { labels: [], values: [] },
  treatmentPopularityChart: { labels: [], values: [], colors: [] },
  employeePerformance: []
};


/* ---------------------------------------------------------------------- */
/* Mock "API" layer — swap internals for real fetch() calls later.        */
/* Keeping this indirection means pages never talk to MOCK_DATA directly. */
/* Collection accessors take an optional clinicId — omit it to get every  */
/* record unfiltered (used by admin/receptionist pages once TENANT knows  */
/* the current clinic; omitted call sites keep working during migration). */
/* ---------------------------------------------------------------------- */
const MOCK_API = {
  getClinics: () => Promise.resolve(MOCK_DATA.clinics),
  getClinicById: (id) => Promise.resolve(MOCK_DATA.clinics.find(c => c.id === id)),
  findClinicByCredentials: (email, password) => Promise.resolve(
    MOCK_DATA.clinics.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password)
  ),

  getPatients: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.patients.filter(p => p.clinicId === clinicId) : MOCK_DATA.patients),
  getPatient: (id) => Promise.resolve(MOCK_DATA.patients.find(p => p.id === id)),
  getAppointments: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.appointments.filter(a => a.clinicId === clinicId) : MOCK_DATA.appointments),
  getQueue: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.queue.filter(q => q.clinicId === clinicId) : MOCK_DATA.queue),
  getTreatments: () => Promise.resolve(MOCK_DATA.treatments),
  getPayments: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.payments.filter(p => p.clinicId === clinicId) : MOCK_DATA.payments),
  getEmployees: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.employees.filter(e => e.clinicId === clinicId) : MOCK_DATA.employees),
  getNotifications: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.notifications.filter(n => n.clinicId === clinicId) : MOCK_DATA.notifications),
  getMessageLog: (clinicId) => Promise.resolve(clinicId ? MOCK_DATA.messageLog.filter(m => m.clinicId === clinicId) : MOCK_DATA.messageLog),
  getRevenueChart: () => Promise.resolve(MOCK_DATA.revenueChart),
  getMonthlyRevenueChart: () => Promise.resolve(MOCK_DATA.monthlyRevenueChart),
  getAppointmentStatusChart: () => Promise.resolve(MOCK_DATA.appointmentStatusChart),
  getNoShowChart: () => Promise.resolve(MOCK_DATA.noShowChart),
  getTreatmentPopularityChart: () => Promise.resolve(MOCK_DATA.treatmentPopularityChart),
  getEmployeePerformance: () => Promise.resolve(MOCK_DATA.employeePerformance),
};
