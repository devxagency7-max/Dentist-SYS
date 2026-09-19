/* ==========================================================================
   One-off admin script: seeds the shared demo chart documents
   (charts/revenue, charts/monthlyRevenue, charts/appointmentStatus,
   charts/noShow, charts/treatmentPopularity) plus employeePerformance,
   so dashboards render real-looking data instead of blank charts.
   These are demo/starter numbers — replace with real aggregates later.

   Usage: node seed-charts.js
   ========================================================================== */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const charts = {
    revenue: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [1200, 1900, 1400, 2100, 1750, 2400, 900],
    },
    monthlyRevenue: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      values: [9800, 11200, 10500, 12800, 13950, 6100],
    },
    appointmentStatus: {
      labels: ['Confirmed', 'Completed', 'Pending', 'Cancelled'],
      values: [42, 68, 15, 8],
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    },
    noShow: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      values: [6, 4, 8, 5, 3, 2],
    },
    treatmentPopularity: {
      labels: ['Cleaning', 'Filling', 'X-Ray', 'Whitening', 'Root Canal'],
      values: [140, 97, 165, 76, 42],
      colors: ['#3B82F6', '#06B6D4', '#14B8A6', '#F59E0B', '#EF4444'],
    },
  };

  for (const [id, data] of Object.entries(charts)) {
    await db.collection('charts').doc(id).set(data, { merge: true });
    console.log(`charts/${id} written.`);
  }

  const employeePerformance = [
    { id: 'perf-amir-khalid', name: 'Dr. Amir Khalid', appointments: 58, revenue: 6200, rating: 4.9 },
    { id: 'perf-lina-wolfe', name: 'Dr. Lina Wolfe', appointments: 41, revenue: 9800, rating: 4.8 },
    { id: 'perf-sophia-reyes', name: 'Dr. Sophia Reyes', appointments: 37, revenue: 5400, rating: 4.7 },
    { id: 'perf-tom-becker', name: 'Tom Becker', appointments: 24, revenue: 1200, rating: 4.6 },
  ];
  for (const { id, ...emp } of employeePerformance) {
    await db.collection('employeePerformance').doc(id).set(emp, { merge: true });
  }
  console.log(`employeePerformance: ${employeePerformance.length} records written (idempotent).`);

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
