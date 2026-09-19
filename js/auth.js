/* ==========================================================================
   AUTH — thin wrapper around Firebase Authentication for this app.
   Doctors and receptionists both sign in with real email/password accounts
   created in the Firebase project. After sign-in, we look up which Firestore
   clinic doc the signed-in user belongs to (as the clinic owner, or as an
   employee) and hand that to TENANT so the rest of the app can stay clinic-
   scoped exactly as before.
   Load AFTER js/firebase-init.js, js/firestore-api.js, and js/tenant.js.
   ========================================================================== */

const AUTH = (() => {
  /* Sign in, then resolve + persist which clinic this account belongs to.
     Returns { role: 'doctor' | 'receptionist', clinicId } on success. */
  async function signIn(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
    const uid = cred.user.uid;

    // Doctor accounts: the clinic doc's id IS the doctor's Firebase Auth uid.
    // A doctor is never branch-restricted — they see every branch they own.
    const clinicDoc = await db.collection('clinics').doc(uid).get();
    if (clinicDoc.exists) {
      TENANT.setCurrentClinicId(uid);
      TENANT.setCurrentBranchId(null);
      return { role: 'doctor', clinicId: uid };
    }

    // Receptionist accounts: an employees/{uid} doc with role "Receptionist",
    // a clinicId pointing back at the doctor who created them, and a branchId
    // pinning them to exactly one of that doctor's branches.
    const employeeDoc = await db.collection('employees').doc(uid).get();
    if (employeeDoc.exists && employeeDoc.data().role === 'Receptionist') {
      const { clinicId, branchId } = employeeDoc.data();
      TENANT.setCurrentClinicId(clinicId);
      TENANT.setCurrentBranchId(branchId || null);
      return { role: 'receptionist', clinicId, branchId };
    }

    await auth.signOut();
    throw new Error('This account is not linked to a clinic or staff record.');
  }

  function signOut() {
    TENANT.clear();
    return auth.signOut();
  }

  function onChange(callback) {
    return auth.onAuthStateChanged(callback);
  }

  function currentUser() {
    return auth.currentUser;
  }

  return { signIn, signOut, onChange, currentUser };
})();
