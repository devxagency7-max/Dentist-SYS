/* ==========================================================================
   One-off admin script: seeds realistic demo data into Firestore for the
   clinic created by seed-clinic.js — patients, treatments (shared catalog),
   staff, appointments, payments, queue, notifications, message log, and the
   public marketing content. Safe to re-run (uses fixed document IDs).

   Usage: node seed-demo-data.js <clinicId>
   Example: node seed-demo-data.js RZEZJj10cTcSaBvoAt6DDZ7jIgg1
   ========================================================================== */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function writeAll(collectionName, docs) {
  for (const { id, ...data } of docs) {
    await db.collection(collectionName).doc(id).set(data, { merge: true });
  }
  console.log(`${collectionName}: ${docs.length} document(s) written.`);
}

async function main() {
  const clinicId = process.argv[2];
  if (!clinicId) {
    console.error('Usage: node seed-demo-data.js <clinicId>');
    process.exit(1);
  }

  const clinicDoc = await db.collection('clinics').doc(clinicId).get();
  if (!clinicDoc.exists) {
    console.error(`No clinics/${clinicId} document found — run seed-clinic.js first.`);
    process.exit(1);
  }
  const doctorName = clinicDoc.data().doctorName || 'Dr. Amir Khalid';
  console.log(`Seeding demo data for clinic "${clinicDoc.data().clinicName}" (${doctorName})...`);

  // ---------------- Employees (the doctor themself + one receptionist) ----------------
  await writeAll('employees', [
    {
      id: clinicId, // the doctor's own employee-shaped record, keyed by their own uid for consistency
      clinicId, name: doctorName, role: 'Doctor', department: 'General Dentistry',
      email: clinicDoc.data().email, phone: clinicDoc.data().phone || '+1 555-0100',
      status: 'active', avatarColor: '2563EB', lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' '),
      permissions: { dashboard: true, appointments: true, patients: true, treatments: true, payments: true, reports: true, employees: true, settings: true },
    },
    {
      id: 'demo-receptionist-01',
      clinicId, name: 'Rana Youssef', role: 'Receptionist', department: 'Front Desk',
      email: 'rana.y@dentalcare.com', phone: '+1 555-0204',
      status: 'active', avatarColor: 'F59E0B', lastLogin: '2026-09-02 08:02',
      permissions: { dashboard: true, appointments: true, patients: false, treatments: false, payments: false, reports: false, employees: false, settings: false },
      note: 'Demo-only record — this receptionist has no matching Firebase Auth account yet. Create one via the Employees page "Add Receptionist" flow to let them actually log in.',
    },
  ]);

  // ---------------- Treatments (shared catalog, not clinic-scoped) ----------------
  await writeAll('treatments', [
    { id: 'T-01', name: 'Cleaning', category: 'General', description: 'Standard scale and polish to remove plaque and surface stains.', cost: 60, duration: 30, patientsCount: 140, status: 'active' },
    { id: 'T-02', name: 'Filling', category: 'General', description: 'Composite filling for a single cavity, includes local anesthesia.', cost: 150, duration: 30, patientsCount: 97, status: 'active' },
    { id: 'T-03', name: 'Root Canal', category: 'Endodontics', description: 'Full root canal therapy including cleaning and sealing of canal.', cost: 450, duration: 60, patientsCount: 42, status: 'active' },
    { id: 'T-04', name: 'Extraction', category: 'Oral Surgery', description: 'Simple tooth extraction under local anesthesia.', cost: 120, duration: 25, patientsCount: 58, status: 'active' },
    { id: 'T-05', name: 'Whitening', category: 'Cosmetic', description: 'In-office professional whitening session, single visit.', cost: 220, duration: 45, patientsCount: 76, status: 'active' },
    { id: 'T-06', name: 'Dental Crown', category: 'Prosthodontics', description: 'Custom-fit porcelain crown, two visits required.', cost: 780, duration: 50, patientsCount: 34, status: 'active' },
    { id: 'T-07', name: 'Implant', category: 'Surgery', description: 'Single-tooth titanium implant with abutment placement.', cost: 1800, duration: 90, patientsCount: 19, status: 'active' },
    { id: 'T-08', name: 'Braces Adjustment', category: 'Orthodontics', description: 'Routine orthodontic wire adjustment and check-up.', cost: 120, duration: 30, patientsCount: 54, status: 'active' },
    { id: 'T-09', name: 'Denture Fitting', category: 'Prosthodontics', description: 'Fitting and adjustment of full or partial denture.', cost: 650, duration: 40, patientsCount: 23, status: 'active' },
    { id: 'T-10', name: 'Gum Treatment', category: 'Periodontics', description: 'Deep cleaning and scaling for gum disease management.', cost: 300, duration: 45, patientsCount: 31, status: 'active' },
    { id: 'T-11', name: 'X-Ray', category: 'Diagnostics', description: 'Digital panoramic or bitewing X-ray imaging.', cost: 45, duration: 15, patientsCount: 165, status: 'active' },
  ]);

  // ---------------- Patients ----------------
  await writeAll('patients', [
    {
      id: 'P-1001', clinicId, name: 'Sarah Johnson', avatarColor: '2563EB', phone: '+1 555-0142', email: 'sarah.j@email.com',
      age: 34, gender: 'female', lastVisit: '2026-08-28', status: 'active', condition: 'Routine Checkup',
      dob: '1992-03-14', address: '221 Maple Street, Springfield', balance: 0, upcoming: '2026-09-04 10:30',
      allergies: ['Penicillin'], bloodType: 'O+',
      medicalHistory: 'No chronic conditions. Mild anxiety around dental procedures — prefers sedation options discussed in advance.',
    },
    {
      id: 'P-1002', clinicId, name: 'Ahmed Al-Farsi', avatarColor: '06B6D4', phone: '+1 555-0198', email: 'ahmed.f@email.com',
      age: 45, gender: 'male', lastVisit: '2026-08-25', status: 'active', condition: 'Root Canal',
      dob: '1981-11-02', address: '48 Cedar Ave, Springfield', balance: 450, upcoming: '2026-09-02 10:00',
      allergies: [], bloodType: 'A+', medicalHistory: 'Type 2 diabetes, well managed. No prior dental surgeries.',
    },
    {
      id: 'P-1003', clinicId, name: 'Emily Carter', avatarColor: '14B8A6', phone: '+1 555-0110', email: 'emily.c@email.com',
      age: 28, gender: 'female', lastVisit: '2026-08-20', status: 'active', condition: 'Teeth Whitening',
      dob: '1998-05-19', address: '17 Birch Court, Springfield', balance: 0, upcoming: null,
      allergies: ['Latex'], bloodType: 'B+', medicalHistory: 'No known conditions. Latex allergy noted — use nitrile gloves.',
    },
    {
      id: 'P-1005', clinicId, name: 'Layla Hassan', avatarColor: 'F59E0B', phone: '+1 555-0134', email: 'layla.h@email.com',
      age: 19, gender: 'female', lastVisit: '2026-08-30', status: 'active', condition: 'Braces Adjustment',
      dob: '2007-06-08', address: '63 Pine Street, Springfield', balance: 0, upcoming: '2026-09-02 13:00',
      allergies: [], bloodType: 'O-', medicalHistory: 'No known conditions. Currently in month 8 of orthodontic treatment.',
    },
    {
      id: 'P-1006', clinicId, name: 'David Martinez', avatarColor: '06B6D4', phone: '+1 555-0156', email: 'david.m@email.com',
      age: 61, gender: 'male', lastVisit: '2026-08-15', status: 'active', condition: 'Denture Fitting',
      dob: '1965-09-30', address: '5 Oak Ridge, Springfield', balance: 650, upcoming: '2026-09-02 14:30',
      allergies: ['Sulfa drugs'], bloodType: 'A-', medicalHistory: 'Full upper denture fitted 2023. Sulfa drug allergy — avoid related antibiotics.',
    },
    {
      id: 'P-1007', clinicId, name: 'Nora Ibrahim', avatarColor: '14B8A6', phone: '+1 555-0122', email: 'nora.i@email.com',
      age: 38, gender: 'female', lastVisit: '2026-08-10', status: 'active', condition: 'Cavity Filling',
      dob: '1988-02-22', address: '112 Elm Street, Springfield', balance: 0, upcoming: null,
      allergies: [], bloodType: 'B-', medicalHistory: 'No known conditions.',
    },
  ]);

  // ---------------- Appointments ----------------
  await writeAll('appointments', [
    { id: 'A-3001', clinicId, patientId: 'P-1001', patientName: 'Sarah Johnson', avatarColor: '2563EB', doctor: doctorName, treatment: 'Routine Checkup', date: '2026-09-02', time: '09:00', duration: 30, status: 'confirmed' },
    { id: 'A-3002', clinicId, patientId: 'P-1002', patientName: 'Ahmed Al-Farsi', avatarColor: '06B6D4', doctor: doctorName, treatment: 'Root Canal', date: '2026-09-02', time: '10:00', duration: 60, status: 'in_progress' },
    { id: 'A-3003', clinicId, patientId: 'P-1003', patientName: 'Emily Carter', avatarColor: '14B8A6', doctor: doctorName, treatment: 'Teeth Whitening', date: '2026-09-02', time: '11:30', duration: 45, status: 'waiting' },
    { id: 'A-3004', clinicId, patientId: 'P-1005', patientName: 'Layla Hassan', avatarColor: 'F59E0B', doctor: doctorName, treatment: 'Braces Adjustment', date: '2026-09-02', time: '13:00', duration: 30, status: 'confirmed' },
    { id: 'A-3005', clinicId, patientId: 'P-1006', patientName: 'David Martinez', avatarColor: '06B6D4', doctor: doctorName, treatment: 'Denture Fitting', date: '2026-09-02', time: '14:30', duration: 40, status: 'pending' },
    { id: 'A-3006', clinicId, patientId: 'P-1007', patientName: 'Nora Ibrahim', avatarColor: '14B8A6', doctor: doctorName, treatment: 'Cavity Filling', date: '2026-09-02', time: '15:15', duration: 30, status: 'completed' },
    { id: 'A-3009', clinicId, patientId: 'P-1001', patientName: 'Sarah Johnson', avatarColor: '2563EB', doctor: doctorName, treatment: 'Follow-up', date: '2026-09-04', time: '10:30', duration: 20, status: 'confirmed' },
    { id: 'A-3013', clinicId, patientId: 'P-1001', patientName: 'Sarah Johnson', avatarColor: '2563EB', doctor: doctorName, treatment: 'Cavity Filling', date: '2026-08-28', time: '10:00', duration: 30, status: 'completed' },
  ]);

  // ---------------- Queue (waiting room right now) ----------------
  await writeAll('queue', [
    { id: 'Q-01', clinicId, position: 3, patientId: 'P-1003', patientName: 'Emily Carter', avatarColor: '14B8A6', service: 'Teeth Whitening', waitingSince: 11, status: 'waiting' },
    { id: 'Q-02', clinicId, position: 4, patientId: 'P-1005', patientName: 'Layla Hassan', avatarColor: 'F59E0B', service: 'Braces Adjustment', waitingSince: 4, status: 'waiting' },
  ]);

  // ---------------- Payments ----------------
  await writeAll('payments', [
    { id: 'INV-5001', clinicId, patientId: 'P-1001', patientName: 'Sarah Johnson', treatment: 'Routine Checkup', amount: 50, paid: 50, date: '2026-09-02', status: 'paid', method: 'Card' },
    { id: 'INV-5002', clinicId, patientId: 'P-1002', patientName: 'Ahmed Al-Farsi', treatment: 'Root Canal', amount: 450, paid: 0, date: '2026-09-02', status: 'pending', method: '—' },
    { id: 'INV-5003', clinicId, patientId: 'P-1003', patientName: 'Emily Carter', treatment: 'Teeth Whitening', amount: 220, paid: 220, date: '2026-08-30', status: 'paid', method: 'Cash' },
    { id: 'INV-5005', clinicId, patientId: 'P-1005', patientName: 'Layla Hassan', treatment: 'Braces Adjustment', amount: 120, paid: 120, date: '2026-09-02', status: 'paid', method: 'Card' },
    { id: 'INV-5006', clinicId, patientId: 'P-1006', patientName: 'David Martinez', treatment: 'Denture Fitting', amount: 650, paid: 200, date: '2026-08-15', status: 'partial', method: 'Cash' },
    { id: 'INV-5007', clinicId, patientId: 'P-1007', patientName: 'Nora Ibrahim', treatment: 'Cavity Filling', amount: 150, paid: 150, date: '2026-08-10', status: 'paid', method: 'Insurance' },
  ]);

  // ---------------- Notifications (in-app) ----------------
  await writeAll('notifications', [
    { id: 'N-1', clinicId, type: 'appointment', title: 'New appointment booked', desc: 'Sarah Johnson booked a Routine Checkup for tomorrow at 9:00 AM', time: 5, read: false },
    { id: 'N-2', clinicId, type: 'payment', title: 'Payment received', desc: 'Emily Carter paid $220 for Teeth Whitening', time: 45, read: false },
    { id: 'N-4', clinicId, type: 'reminder', title: 'Upcoming appointment reminder', desc: 'Ahmed Al-Farsi has a Root Canal in 30 minutes', time: 150, read: true },
  ]);

  // ---------------- Message log (WhatsApp / SMS / Email) ----------------
  await writeAll('messageLog', [
    { id: 'M-9001', clinicId, patientId: 'P-1001', patientName: 'Sarah Johnson', channel: 'whatsapp', kind: 'confirmation', appointment: 'Routine Checkup · Sep 2, 09:00', state: 'delivered', sentAt: '2026-09-01 09:00', content: `Hi Sarah, your Routine Checkup with ${doctorName} is confirmed for Sep 2 at 9:00 AM.` },
    { id: 'M-9002', clinicId, patientId: 'P-1002', patientName: 'Ahmed Al-Farsi', channel: 'sms', kind: 'reminder', appointment: 'Root Canal · Sep 2, 10:00', state: 'sent', sentAt: '2026-09-02 08:00', content: `Reminder: your Root Canal appointment is today at 10:00 AM with ${doctorName}.` },
  ]);

  // ---------------- Public marketing content (shared, unscoped) ----------------
  await writeAll('publicDoctors', [
    { id: 'DOC-01', name: doctorName, specialty: 'General & Family Dentistry', avatarColor: '2563EB', experienceYears: 12, rating: 4.9, reviewCount: 214, availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], bio: `${doctorName} leads the practice with a gentle, patient-first approach to routine and restorative care.` },
  ]);
  await writeAll('testimonials', [
    { id: 'TS-1', name: 'Sarah Johnson', avatarColor: '2563EB', rating: 5, text: 'The entire team made me feel so comfortable. Booking online was effortless and the reminders were a lifesaver.' },
    { id: 'TS-2', name: 'Ahmed Al-Farsi', avatarColor: '06B6D4', rating: 5, text: 'Every step of my root canal procedure was explained clearly. Genuinely painless and quick recovery.' },
  ]);
  await writeAll('clinicStats', [
    { id: 'stat-patients', value: 12000, suffix: '+', label: 'Happy Patients' },
    { id: 'stat-years', value: 15, suffix: '+', label: 'Years of Experience' },
    { id: 'stat-dentists', value: 8, suffix: '', label: 'Expert Dentists' },
    { id: 'stat-satisfaction', value: 98, suffix: '%', label: 'Patient Satisfaction' },
  ]);
  await writeAll('faqs', [
    { id: 'faq-1', q: 'Do I need to create an account to book an appointment?', a: 'No — you can book as a guest with just your name and phone number.' },
    { id: 'faq-2', q: 'What notification channels do you support?', a: 'We send confirmations via WhatsApp with a pre-filled message you can review before sending.' },
    { id: 'faq-3', q: 'Can I reschedule or cancel my appointment?', a: 'Yes, call the clinic directly at least 24 hours in advance.' },
  ]);

  console.log('\nAll demo data seeded successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
