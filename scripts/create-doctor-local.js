const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const auth = getAuth();

const DEFAULT_WORKING_HOURS = [
  { day: 'Sunday', enabled: false, open: '09:00', close: '17:00' },
  { day: 'Monday', enabled: true, open: '09:00', close: '18:00' },
  { day: 'Tuesday', enabled: true, open: '09:00', close: '18:00' },
  { day: 'Wednesday', enabled: true, open: '09:00', close: '18:00' },
  { day: 'Thursday', enabled: true, open: '09:00', close: '18:00' },
  { day: 'Friday', enabled: true, open: '09:00', close: '15:00' },
  { day: 'Saturday', enabled: false, open: '09:00', close: '14:00' },
];

async function main() {
  const clinicName = 'Dev Smart X';
  const doctorName = 'Abdallah';
  const email = 'abdallahmfathy204@gmail.com';
  const password = 'abdallahmfathy204';
  const phone = '01011335761';
  const whatsappNumber = '01011335761';
  const address = 'Egypt - bns';

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`User already exists: ${userRecord.uid}`);
  } catch (err) {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: doctorName,
    });
    console.log(`Created new Auth user: ${userRecord.uid}`);
  }

  const clinicDoc = {
    clinicName,
    doctorName,
    email,
    contactEmail: email,
    phone,
    whatsappNumber,
    address,
    workingHours: DEFAULT_WORKING_HOURS,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'local-script',
  };

  await db.collection('clinics').doc(userRecord.uid).set(clinicDoc);
  console.log(`Successfully created clinic doc for ${email}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
