/* ==========================================================================
   Firestore-backed MOCK_API replacement.
   Keeps the exact same function names/shapes pages already call
   (MOCK_API.getPatients(clinicId), MOCK_API.getAppointments(clinicId), ...)
   so existing page code does not need to change — only the data source
   underneath does. Load AFTER js/firebase-init.js.

   Firestore collections (top-level):
     clinics/{clinicId}                -> { clinicName, doctorName, email, phone, whatsappNumber, address, workingHours[] }
     branches/{branchId}               -> { clinicId, name, address, phone, whatsappNumber, workingHours[], status, isDefault }
     patients/{patientId}              -> { clinicId, branchId, name, phone, email, ... }
     appointments/{appointmentId}      -> { clinicId, branchId, patientId, patientName, doctor, treatment, date, time, duration, status }
     queue/{queueId}                   -> { clinicId, branchId, position, patientId, patientName, service, waitingSince, status }
     treatments/{treatmentId}          -> { clinicId, ... } shared across a doctor's own branches, not shared across doctors
     payments/{paymentId}              -> { clinicId, branchId, patientId, ... }
     employees/{employeeId}            -> { clinicId, branchId (required for role "Receptionist"), name, role, email, phone, status, permissions{...} } (no password field — Firebase Auth owns credentials)
     notifications/{notificationId}    -> { clinicId, branchId, ... }
     messageLog/{messageId}            -> { clinicId, branchId, patientId, channel, ... }
   ========================================================================== */

function docsOf(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function scopedQuery(collectionName, clinicId, branchId) {
  let ref = db.collection(collectionName);
  if (clinicId) ref = ref.where('clinicId', '==', clinicId);
  if (branchId) ref = ref.where('branchId', '==', branchId);
  return ref;
}

const MOCK_API = {
  /* ---------------- Clinics / tenancy ---------------- */
  getClinics: () => db.collection('clinics').get().then(docsOf),
  getClinicById: (id) => id
    ? db.collection('clinics').doc(id).get().then((d) => (d.exists ? { id: d.id, ...d.data() } : null))
    : Promise.resolve(null),
  /* Auth now owns credential verification (see js/auth.js) — this only resolves
     a clinic doc for an already-authenticated user's uid/email. */
  getClinicByEmail: (email) => db.collection('clinics').where('email', '==', email.toLowerCase()).limit(1).get()
    .then((snap) => (snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() })),

  /* ---------------- Branches ---------------- */
  getBranches: (clinicId) => scopedQuery('branches', clinicId).get().then(docsOf),
  getBranchById: (id) => id
    ? db.collection('branches').doc(id).get().then((d) => (d.exists ? { id: d.id, ...d.data() } : null))
    : Promise.resolve(null),

  /* ---------------- Patients ---------------- */
  getPatients: (clinicId, branchId) => scopedQuery('patients', clinicId, branchId).get().then(docsOf),
  getPatient: (id) => id
    ? db.collection('patients').doc(id).get().then((d) => (d.exists ? { id: d.id, ...d.data() } : null))
    : Promise.resolve(null),
  addPatient: (patient) => db.collection('patients').add(patient).then((ref) => ref.id),
  updatePatient: (id, data) => db.collection('patients').doc(id).update(data),

  /* ---------------- Appointments ---------------- */
  getAppointments: (clinicId, branchId) => scopedQuery('appointments', clinicId, branchId).get().then(docsOf),
  addAppointment: (appt) => db.collection('appointments').add(appt).then((ref) => ref.id),
  updateAppointment: (id, data) => db.collection('appointments').doc(id).update(data),

  /* ---------------- Queue ---------------- */
  getQueue: (clinicId, branchId) => scopedQuery('queue', clinicId, branchId).get().then(docsOf),
  addQueueEntry: (entry) => db.collection('queue').add(entry).then((ref) => ref.id),
  removeQueueEntry: (id) => db.collection('queue').doc(id).delete(),

  /* ---------------- Treatments (shared per-clinic catalog, same across all of a doctor's branches) ---------------- */
  getTreatments: (clinicId) => scopedQuery('treatments', clinicId).get().then(docsOf),

  /* ---------------- Payments ---------------- */
  getPayments: (clinicId, branchId) => scopedQuery('payments', clinicId, branchId).get().then(docsOf),

  /* ---------------- Employees ---------------- */
  getEmployees: (clinicId, branchId) => scopedQuery('employees', clinicId, branchId).get().then(docsOf),
  addEmployee: (employee) => db.collection('employees').add(employee).then((ref) => ref.id),
  updateEmployee: (id, data) => db.collection('employees').doc(id).update(data),
  getEmployeeByEmail: (email) => db.collection('employees').where('email', '==', email.toLowerCase()).limit(1).get()
    .then((snap) => (snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() })),

  /* ---------------- Notifications / message log ---------------- */
  getNotifications: (clinicId, branchId) => scopedQuery('notifications', clinicId, branchId).get().then(docsOf),
  getMessageLog: (clinicId, branchId) => scopedQuery('messageLog', clinicId, branchId).get().then(docsOf),

  /* ---------------- Charts (per-clinic derived stats; fallback to empty shapes) ---------------- */
  getRevenueChart: () => db.collection('charts').doc('revenue').get().then((d) => (d.exists ? d.data() : { labels: [], values: [] })),
  getMonthlyRevenueChart: () => db.collection('charts').doc('monthlyRevenue').get().then((d) => (d.exists ? d.data() : { labels: [], values: [] })),
  getAppointmentStatusChart: () => db.collection('charts').doc('appointmentStatus').get().then((d) => (d.exists ? d.data() : { labels: [], values: [], colors: [] })),
  getNoShowChart: () => db.collection('charts').doc('noShow').get().then((d) => (d.exists ? d.data() : { labels: [], values: [] })),
  getTreatmentPopularityChart: () => db.collection('charts').doc('treatmentPopularity').get().then((d) => (d.exists ? d.data() : { labels: [], values: [], colors: [] })),
  getEmployeePerformance: () => db.collection('employeePerformance').get().then(docsOf),
};

// Global API alias for clean naming across all application scripts
const API = MOCK_API;

