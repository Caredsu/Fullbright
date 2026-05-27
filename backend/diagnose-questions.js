#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'teacher_eval';

async function diagnose() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const questionsCollection = db.collection('questions');
    
    const questions = await questionsCollection.find({}).toArray();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 QUESTIONS COLLECTION DIAGNOSIS (${questions.length} total)`);
    console.log('='.repeat(60) + '\n');
    
    questions.forEach((q, i) => {
      console.log(`[${i+1}] "${q.text?.substring(0, 50)}..."`);
      console.log(`    set_number: ${JSON.stringify(q.set_number)} (type: ${typeof q.set_number})`);
      console.log(`    type: ${q.type}`);
      console.log(`    choice_descriptions: ${Object.keys(q.choice_descriptions || {}).length} keys`);
      if (q.choice_descriptions) {
        Object.entries(q.choice_descriptions).forEach(([key, val]) => {
          if (val) console.log(`      ${key}: "${val.substring(0, 30)}..."`);
        });
      }
      console.log('');
    });
    
    // Summary statistics
    const withoutSetNumber = questions.filter(q => q.set_number === null || q.set_number === undefined).length;
    const withSetNumber = questions.length - withoutSetNumber;
    
    console.log('='.repeat(60));
    console.log('📈 SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Questions with set_number: ${withSetNumber}`);
    console.log(`  Questions WITHOUT set_number: ${withoutSetNumber}`);
    
    if (withSetNumber > 0) {
      console.log('\n  Set breakdown:');
      for (let i = 1; i <= 5; i++) {
        const count = questions.filter(q => q.set_number === i).length;
        if (count > 0) {
          console.log(`    Set ${i}: ${count} questions`);
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

diagnose();
