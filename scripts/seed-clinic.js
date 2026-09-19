/* ==========================================================================
   One-off admin script: creates/updates a clinics/{uid} Firestore document
   for an existing Firebase Auth user, using the Admin SDK (bypasses
   security rules — this is exactly the kind of trusted server-side
   operation the browser app cannot safely do on its own).

   Usage:
     node seed-clinic.js <uid> <clinicName> <doctorName> <email> <phone> <whatsappNumber> <address>

   Example:
     node seed-clinic.js RZEZJj10cTcSaBvoAt6DDZ7jIgg1 "DentalCare Downtown Branch" "Dr. Amir Khalid" "amir.khalid@dentalcare.com" "+1 555-0100" "+1 555-0100" "123 Main Street, Springfield"
   ========================================================================== */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const auth = getAuth();

async function main() {
  const [uid, clinicName, doctorName, email, phone, whatsappNumber, address] = process.argv.slice(2);

  if (!uid || !clinicName || !doctorName || !email) {
    console.error('Usage: node seed-clinic.js <uid> <clinicName> <doctorName> <email> [phone] [whatsappNumber] [address]');
    process.exit(1);
  }

  // Confirm the uid actually corresponds to a real Auth user before writing,
  // so a typo doesn't silently create an orphaned clinic doc.
  try {
    const user = await auth.getUser(uid);
    console.log(`Confirmed Auth user: ${user.email} (uid: ${user.uid})`);
  } catch (err) {
    console.error(`No Auth user found with uid "${uid}". Double-check it in Firebase Console -> Authentication -> Users.`);
    process.exit(1);
  }

  const data = {
    clinicName,
    doctorName,
    email,
    phone: phone || '',
    whatsappNumber: whatsappNumber || phone || '',
    address: address || '',
  };

  await db.collection('clinics').doc(uid).set(data, { merge: true });
  console.log(`clinics/${uid} written successfully:`);
  console.log(data);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
