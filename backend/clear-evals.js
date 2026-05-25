// Clear evaluations from the database for clean testing
const BASE_URL = 'http://localhost:8080/api';

async function clearEvals() {
  console.log('🗑️  Clearing all evaluations from database...\n');

  try {
    // Get all evaluations first
    const getRes = await fetch(`${BASE_URL}/evaluations?limit=1000`, { method: 'GET' });
    const getData = await getRes.json();
    
    console.log(`Found ${getData.data.pagination.total} evaluations\n`);
    
    let deletedCount = 0;
    for (const evaluation of getData.data.data) {
      console.log(`Deleting evaluation ${evaluation.id}...`);
      // Note: This requires admin auth, but for testing we can try
      const delRes = await fetch(`${BASE_URL}/evaluations/${evaluation.id}`, { method: 'DELETE' });
      const delData = await delRes.json();
      
      if (delData.success) {
        deletedCount++;
        console.log(`  ✅ Deleted`);
      } else {
        console.log(`  ⚠️ Failed: ${delData.message}`);
      }
    }
    
    console.log(`\n✅ Deleted ${deletedCount} evaluations`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

clearEvals();
