import { connectDB, getCollection } from './src/config/database.js';
import { ObjectId } from 'mongodb';

const seedEvaluations = async () => {
  try {
    console.log('🌱 Starting evaluation data seeding...');
    
    await connectDB();

    const teachersCollection = getCollection('teachers');
    const evaluationsCollection = getCollection('evaluations');
    const adminsCollection = getCollection('admins');

    // Get teachers
    const teachers = await teachersCollection.find({}).toArray();
    if (teachers.length === 0) {
      console.log('❌ No teachers found. Run seed-data.js first.');
      process.exit(1);
    }

    // Get or create admin user
    let adminUser = await adminsCollection.findOne({ username: 'superadmin' });
    if (!adminUser) {
      console.log('⚠️  No admin user found. Creating one...');
      const result = await adminsCollection.insertOne({
        username: 'superadmin',
        password: 'superadmin123',
        role: 'super_admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      adminUser = { _id: result.insertedId };
      console.log('✅ Admin user created');
    }

    // Clear evaluations
    console.log('🗑️  Clearing evaluations...');
    await evaluationsCollection.deleteMany({});

    // Create sample evaluations with different dates and ratings
    const evaluations = [];
    const today = new Date();
    
    // Create 15 evaluations spread across different dates and ratings
    const ratings = [3, 4, 5, 4, 2, 5, 4, 4, 5, 3, 4, 5, 2, 4, 3];
    const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'completed', 'completed', 'completed', 'pending', 'completed'];

    for (let i = 0; i < teachers.length * 3; i++) {
      const teacherIndex = i % teachers.length;
      const daysAgo = Math.floor(i / teachers.length) * 5; // Spread across different dates
      const evalDate = new Date(today);
      evalDate.setDate(evalDate.getDate() - daysAgo);

      evaluations.push({
        teacher_id: teachers[teacherIndex]._id,
        evaluated_by: adminUser._id,
        rating: ratings[i % ratings.length],
        feedback: `Sample feedback for ${teachers[teacherIndex].first_name}. This is a test evaluation.`,
        status: statuses[i % statuses.length],
        created_at: evalDate,
        updated_at: evalDate,
        created_by: 'system',
        updated_by: 'system'
      });
    }

    console.log('📊 Inserting evaluations...');
    const result = await evaluationsCollection.insertMany(evaluations);
    console.log(`✅ Inserted ${result.insertedCount} evaluations`);

    // Show statistics
    const stats = await evaluationsCollection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
        }
      }
    ]).toArray();

    if (stats.length > 0) {
      console.log('\n📈 Evaluation Statistics:');
      console.log(`   Total Evaluations: ${stats[0].total}`);
      console.log(`   Average Rating: ${stats[0].avgRating.toFixed(1)}/5`);
      console.log(`   Completed: ${stats[0].completed}`);
      console.log(`   Pending: ${stats[0].pending}`);
    }

    console.log('✨ Evaluation seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedEvaluations();
