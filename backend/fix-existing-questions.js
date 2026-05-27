#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'teacher_eval';

async function fixQuestions() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const questionsCollection = db.collection('questions');
    
    // Fetch all questions
    const allQuestions = await questionsCollection.find({}).toArray();
    console.log(`📊 Found ${allQuestions.length} questions to fix\n`);
    
    // Assign set_number based on index (distribute evenly)
    // Questions 0-1 → Set 1
    // Questions 2-3 → Set 2
    // Questions 4-5 → Set 3
    // Questions 6-7 → Set 4
    // Questions 8+ → Set 5
    
    let updated = 0;
    for (let i = 0; i < allQuestions.length; i++) {
      const q = allQuestions[i];
      let setNumber;
      
      if (i < 2) setNumber = 1;
      else if (i < 4) setNumber = 2;
      else if (i < 6) setNumber = 3;
      else if (i < 8) setNumber = 4;
      else setNumber = 5;
      
      // Only update if set_number is missing
      if (!q.set_number) {
        await questionsCollection.updateOne(
          { _id: q._id },
          {
            $set: {
              set_number: setNumber,
              text: q.text || q.question_text || 'Question text missing',
              type: q.type || q.question_type || 'rating',
              choice_descriptions: q.choice_descriptions || {
                '1': 'Strongly Disagree',
                '2': 'Disagree',
                '3': 'Neutral',
                '4': 'Agree',
                '5': 'Strongly Agree'
              }
            }
          }
        );
        const shortText = (q.text || q.question_text || 'Q').substring(0, 40);
        console.log(`  ✅ Q${i+1}: "${shortText}..." → Set ${setNumber}`);
        updated++;
      }
    }
    
    // Verify the fix
    const updatedQuestions = await questionsCollection.find({}).toArray();
    console.log(`\n📊 Results (Updated ${updated} questions):`);
    for (let i = 1; i <= 5; i++) {
      const count = updatedQuestions.filter(q => q.set_number === i).length;
      if (count > 0) {
        console.log(`  Set ${i}: ${count} questions`);
      }
    }
    
    console.log('\n✅ Fix complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixQuestions();
