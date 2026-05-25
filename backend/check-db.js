// Check what evaluations are actually stored in the DB
const BASE_URL = 'http://localhost:8080/api';

async function checkDB() {
  console.log('🔍 Checking evaluations in database...\n');

  try {
    // Fetch all evaluations (no filter)
    const res = await fetch(`${BASE_URL}/evaluations?limit=100`, { method: 'GET' });
    const data = await res.json();
    
    console.log(`Total evaluations in DB: ${data.data.pagination.total}\n`);
    
    data.data.data.forEach((evaluation, i) => {
      console.log(`[${i+1}] Student ID: ${evaluation.student_id}, Teacher: ${evaluation.teacher_name}, Created: ${evaluation.created_at}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkDB();
