import { connectDB, getCollection } from './src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateSetNumbers() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const questionsCollection = getCollection('questions');

    // Get all questions
    const allQuestions = await questionsCollection.find({}).toArray();
    console.log(`Found ${allQuestions.length} questions to migrate`);

    // Assign set_number based on question position or content
    // First 4 questions → Set 1
    // Next 4 questions → Set 2
    // Next 4 questions → Set 3
    // Next 4 questions → Set 4
    // Remaining → Set 5

    for (let i = 0; i < allQuestions.length; i++) {
      const question = allQuestions[i];
      
      // Determine set number based on index
      let setNumber;
      if (i < 2) setNumber = 1;
      else if (i < 4) setNumber = 2;
      else if (i < 6) setNumber = 3;
      else setNumber = 5; // Or Set 4 if more

      console.log(`Updating question ${i + 1}: "${question.text.substring(0, 40)}..." → Set ${setNumber}`);

      await questionsCollection.updateOne(
        { _id: question._id },
        {
          $set: {
            set_number: setNumber,
            choice_descriptions: {
              '1': 'Strongly Disagree',
              '2': 'Disagree',
              '3': 'Neutral',
              '4': 'Agree',
              '5': 'Strongly Agree'
            }
          }
        }
      );
    }

    console.log('✅ Migration complete!');

    // Verify the update
    const updated = await questionsCollection.find({}).toArray();
    console.log('\n📊 Updated questions:');
    updated.forEach(q => {
      console.log(`  Set ${q.set_number}: ${q.text.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateSetNumbers();
