/* ==========================================================================
   Super-admin Cloud Functions.

   These run with the Admin SDK's full privileges, which is the only way to
   create a Firebase Auth account for *someone else* without hijacking the
   caller's own session (the client SDK can only sign up the currently-signed
   -in browser). Every function here is gated on a `superAdmin` custom claim
   set once on the operator's own account via scripts/set-super-admin.js —
   never trust a client-supplied "I am the admin" flag.
   ========================================================================== */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
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

function assertSuperAdmin(request) {
  if (!request.auth || request.auth.token.superAdmin !== true) {
    throw new HttpsError('permission-denied', 'Only the super admin can perform this action.');
  }
}

exports.createDoctorAccount = onCall(async (request) => {
  assertSuperAdmin(request);

  const { clinicName, doctorName, email, password, phone, whatsappNumber, address } = request.data || {};
  if (!clinicName || !doctorName || !email || !password) {
    throw new HttpsError('invalid-argument', 'clinicName, doctorName, email and password are required.');
  }
  if (String(password).length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  const trimmedEmail = String(email).trim();
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: trimmedEmail,
      password: String(password),
      displayName: String(doctorName).trim(),
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    if (err.code === 'auth/invalid-password' || err.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', err.message);
    }
    throw new HttpsError('internal', err.message || 'Could not create the account.');
  }

  const clinicDoc = {
    clinicName: String(clinicName).trim(),
    doctorName: String(doctorName).trim(),
    email: trimmedEmail,
    contactEmail: trimmedEmail,
    phone: phone ? String(phone).trim() : '',
    whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : (phone ? String(phone).trim() : ''),
    address: address ? String(address).trim() : '',
    workingHours: DEFAULT_WORKING_HOURS,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  };

  try {
    await db.collection('clinics').doc(userRecord.uid).set(clinicDoc);
    await db.collection('branches').add({
      clinicId: userRecord.uid,
      name: 'Main Branch',
      address: clinicDoc.address,
      phone: clinicDoc.phone,
      whatsappNumber: clinicDoc.whatsappNumber,
      workingHours: DEFAULT_WORKING_HOURS,
      status: 'active',
      isDefault: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    throw new HttpsError('internal', 'Account was created but the clinic record failed to save, so the account was rolled back. Please try again.');
  }

  return { uid: userRecord.uid, clinicId: userRecord.uid };
});

exports.listClinics = onCall(async (request) => {
  assertSuperAdmin(request);

  const snapshot = await db.collection('clinics').get();
  const clinics = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      clinicName: data.clinicName || '',
      doctorName: data.doctorName || '',
      email: data.email || '',
      phone: data.phone || '',
      status: data.status || 'active',
      createdAt: data.createdAt && typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : null,
    };
  });
  clinics.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return clinics;
});

exports.setDoctorAccountStatus = onCall(async (request) => {
  assertSuperAdmin(request);

  const { clinicId, status } = request.data || {};
  if (!clinicId || !['active', 'disabled'].includes(status)) {
    throw new HttpsError('invalid-argument', 'clinicId and a valid status ("active" or "disabled") are required.');
  }

  await auth.updateUser(clinicId, { disabled: status === 'disabled' });
  await db.collection('clinics').doc(clinicId).update({ status });

  // Disabling (or re-enabling) a doctor cascades to every branch they own —
  // a disabled doctor shouldn't leave an active, still-bookable branch behind.
  const branchesSnapshot = await db.collection('branches').where('clinicId', '==', clinicId).get();
  if (!branchesSnapshot.empty) {
    const batch = db.batch();
    branchesSnapshot.docs.forEach((doc) => batch.update(doc.ref, { status }));
    await batch.commit();
  }

  return { ok: true };
});

exports.requestBranch = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to request a branch.');
  }
  const clinicId = request.auth.uid;
  const clinicDoc = await db.collection('clinics').doc(clinicId).get();
  if (!clinicDoc.exists) {
    throw new HttpsError('permission-denied', 'Only a doctor account can request a new branch.');
  }

  const { requestedName, requestedAddress, requestedPhone, notes } = request.data || {};
  if (!requestedName) {
    throw new HttpsError('invalid-argument', 'requestedName is required.');
  }

  const requestRef = await db.collection('branchRequests').add({
    clinicId,
    requestedName: String(requestedName).trim(),
    requestedAddress: requestedAddress ? String(requestedAddress).trim() : '',
    requestedPhone: requestedPhone ? String(requestedPhone).trim() : '',
    notes: notes ? String(notes).trim() : '',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });

  return { requestId: requestRef.id };
});

exports.listBranchRequests = onCall(async (request) => {
  assertSuperAdmin(request);

  const snapshot = await db.collection('branchRequests').get();
  const requests = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      clinicId: data.clinicId || '',
      requestedName: data.requestedName || '',
      requestedAddress: data.requestedAddress || '',
      requestedPhone: data.requestedPhone || '',
      notes: data.notes || '',
      status: data.status || 'pending',
      createdAt: data.createdAt && typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : null,
    };
  });
  requests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return requests;
});

exports.approveBranchRequest = onCall(async (request) => {
  assertSuperAdmin(request);

  const { requestId } = request.data || {};
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.');
  }

  const requestRef = db.collection('branchRequests').doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'That branch request no longer exists.');
  }
  const reqData = requestDoc.data();
  if (reqData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This request has already been resolved.');
  }

  const branchRef = await db.collection('branches').add({
    clinicId: reqData.clinicId,
    name: reqData.requestedName,
    address: reqData.requestedAddress || '',
    phone: reqData.requestedPhone || '',
    whatsappNumber: reqData.requestedPhone || '',
    workingHours: DEFAULT_WORKING_HOURS,
    status: 'active',
    isDefault: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  await requestRef.update({
    status: 'approved',
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: request.auth.uid,
  });

  return { branchId: branchRef.id };
});

exports.rejectBranchRequest = onCall(async (request) => {
  assertSuperAdmin(request);

  const { requestId, reason } = request.data || {};
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.');
  }

  const requestRef = db.collection('branchRequests').doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'That branch request no longer exists.');
  }
  if (requestDoc.data().status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This request has already been resolved.');
  }

  await requestRef.update({
    status: 'rejected',
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: request.auth.uid,
    rejectionReason: reason ? String(reason).trim() : '',
  });

  return { ok: true };
});
