/* ==========================================================================
   One-off admin script: creates (or reuses) a Firebase Auth account and
   grants it the `superAdmin` custom claim, which is the ONLY thing the
   Cloud Functions in /functions trust to allow creating doctor accounts.

   Usage:
     node set-super-admin.js <email> <password>

   If the email already exists, the existing account just gets the claim
   added (password is ignored in that case — sign in with whatever password
   the account already has).
   ========================================================================== */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node set-super-admin.js <email> <password>');
    process.exit(1);
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Found existing Auth user: ${user.email} (uid: ${user.uid})`);
  } catch (err) {
    user = await auth.createUser({ email, password, displayName: 'Super Admin' });
    console.log(`Created new Auth user: ${user.email} (uid: ${user.uid})`);
  }

  await auth.setCustomUserClaims(user.uid, { superAdmin: true });
  console.log(`Granted superAdmin claim to ${user.email}.`);
  console.log('Sign in at pages/super-admin/login.html with this email/password.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
