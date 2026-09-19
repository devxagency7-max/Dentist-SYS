/* ==========================================================================
   One-off admin script: creates a default "Main Branch" for an existing
   doctor and stamps branchId onto every one of their existing scoped
   documents (patients, appointments, queue, payments, employees,
   notifications, messageLog, treatments), so the new branch-aware rules and
   MOCK_API signatures don't leave pre-branch data invisible.

   Usage:
     node backfill-branches.js <clinicId>

   Example:
     node backfill-branches.js RZEZJj10cTcSaBvoAt6DDZ7jIgg1
   ========================================================================== */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const BRANCH_SCOPED_COLLECTIONS = ['patients', 'appointments', 'queue', 'payments', 'employees', 'notifications', 'messageLog'];

async function backfillCollection(collectionName, clinicId, branchId) {
  const snapshot = await db.collection(collectionName).where('clinicId', '==', clinicId).get();
  if (snapshot.empty) {
    console.log(`${collectionName}: 0 documents.`);
    return 0;
  }

  const docs = snapshot.docs;
  let touched = 0;
  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500);
    const batch = db.batch();
    chunk.forEach((doc) => batch.update(doc.ref, { branchId }));
    await batch.commit();
    touched += chunk.length;
  }
  console.log(`${collectionName}: ${touched} document(s) updated.`);
  return touched;
}

/* Treatments were originally seeded as a single shared/global catalog with no
   clinicId at all. Since this script only ever runs against one clinic at a
   time and today there is exactly one real clinic in the system, any
   treatment doc that has no clinicId yet is assumed to belong to it. Running
   this a second time for a genuinely different clinic would require the
   existing treatments to already be tagged — safe because this branch only
   ever fires once, before a second real clinic exists. */
async function backfillTreatments(clinicId) {
  const snapshot = await db.collection('treatments').get();
  const untagged = snapshot.docs.filter((doc) => !doc.data().clinicId);
  if (untagged.length === 0) {
    console.log('treatments: 0 documents (all already tagged).');
    return 0;
  }

  let touched = 0;
  for (let i = 0; i < untagged.length; i += 500) {
    const chunk = untagged.slice(i, i + 500);
    const batch = db.batch();
    chunk.forEach((doc) => batch.update(doc.ref, { clinicId }));
    await batch.commit();
    touched += chunk.length;
  }
  console.log(`treatments: ${touched} document(s) tagged with clinicId.`);
  return touched;
}

async function main() {
  const [clinicId] = process.argv.slice(2);
  if (!clinicId) {
    console.error('Usage: node backfill-branches.js <clinicId>');
    process.exit(1);
  }

  const clinicDoc = await db.collection('clinics').doc(clinicId).get();
  if (!clinicDoc.exists) {
    console.error(`No clinics/${clinicId} document found. Double-check the clinicId.`);
    process.exit(1);
  }
  const clinic = clinicDoc.data();

  const existingBranches = await db.collection('branches').where('clinicId', '==', clinicId).get();
  if (!existingBranches.empty) {
    console.error(`clinics/${clinicId} already has ${existingBranches.size} branch(es). Aborting to avoid creating a duplicate default branch.`);
    process.exit(1);
  }

  const branchRef = await db.collection('branches').add({
    clinicId,
    name: 'Main Branch',
    address: clinic.address || '',
    phone: clinic.phone || '',
    whatsappNumber: clinic.whatsappNumber || clinic.phone || '',
    workingHours: clinic.workingHours || [],
    status: 'active',
    isDefault: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`Created branches/${branchRef.id} ("Main Branch") for clinic "${clinic.clinicName}".`);

  for (const collectionName of BRANCH_SCOPED_COLLECTIONS) {
    await backfillCollection(collectionName, clinicId, branchRef.id);
  }
  await backfillTreatments(clinicId);

  console.log('Backfill complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
