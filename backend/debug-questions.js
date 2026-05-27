// Quick debug script to check questions in MongoDB
import { getCollection } from './src/config/database.js';

async function debug() {
  try {
    const questionsCollection = getCollection('questions');
    const questions = await questionsCollection.find({}).toArray();
    
    console.log('\n========== QUESTIONS IN MONGODB ==========');
    questions.forEach((q, i) => {
      console.log(`\n[${i+1}] "${q.text?.substring(0, 40)}..."`);
      console.log(`    set_number: ${q.set_number} (type: ${typeof q.set_number})`);
      console.log(`    choice_descriptions: ${Object.keys(q.choice_descriptions || {}).length} items`);
    });
    console.log('\n==========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debug();
