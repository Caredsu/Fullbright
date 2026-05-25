import { connectDB } from './src/config/database.js';

const seedData = async () => {
  try {
    console.log('🌱 Starting data seeding...');
    
    const db = await connectDB();

    // Sample Questions
    const questions = [
      {
        question_text: 'Ang guro ay nag-eexplain ng concepts ng malinaw at naiintindihan.',
        question_type: 'rating',
        question_order: 1,
        category: 'teaching_quality',
        status: 'active',
        required: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        updated_by: 'system'
      },
      {
        question_text: 'Ang guro ay responsive sa mga tanong ng mga estudyante.',
        question_type: 'rating',
        question_order: 2,
        category: 'student_interaction',
        status: 'active',
        required: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        updated_by: 'system'
      },
      {
        question_text: 'Ang guro ay nag-aalok ng fair at objective na grading.',
        question_type: 'rating',
        question_order: 3,
        category: 'assessment',
        status: 'active',
        required: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        updated_by: 'system'
      },
      {
        question_text: 'Ang guro ay nag-conduct ng well-organized classes.',
        question_type: 'rating',
        question_order: 4,
        category: 'class_management',
        status: 'active',
        required: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        updated_by: 'system'
      },
      {
        question_text: 'Ang guro ay nag-eencourage ng class participation.',
        question_type: 'rating',
        question_order: 5,
        category: 'student_engagement',
        status: 'active',
        required: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        updated_by: 'system'
      }
    ];

    // Sample Teachers
    const teachers = [
      {
        first_name: 'Juan',
        middle_name: 'Santos',
        last_name: 'Garcia',
        email: 'juan.garcia@school.edu',
        department: 'ECT',
        status: 'active',
        picture: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: 'system'
      },
      {
        first_name: 'Maria',
        middle_name: 'Cruz',
        last_name: 'Reyes',
        email: 'maria.reyes@school.edu',
        department: 'EDUC',
        status: 'active',
        picture: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: 'system'
      },
      {
        first_name: 'Jose',
        middle_name: 'Dela',
        last_name: 'Cruz',
        email: 'jose.cruz@school.edu',
        department: 'CCJE',
        status: 'active',
        picture: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: 'system'
      },
      {
        first_name: 'Rosa',
        middle_name: 'Aquino',
        last_name: 'Santos',
        email: 'rosa.santos@school.edu',
        department: 'BHT',
        status: 'active',
        picture: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: 'system'
      },
      {
        first_name: 'Pedro',
        middle_name: 'Fernandez',
        last_name: 'Lopez',
        email: 'pedro.lopez@school.edu',
        department: 'ECT',
        status: 'active',
        picture: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: 'system'
      }
    ];

    // Clear existing collections
    console.log('🗑️  Clearing collections...');
    await db.collection('questions').deleteMany({});
    await db.collection('teachers').deleteMany({});

    // Insert data
    console.log('📝 Inserting questions...');
    const questionsResult = await db.collection('questions').insertMany(questions);
    console.log(`✅ Inserted ${questionsResult.insertedCount} questions`);

    console.log('👨‍🏫 Inserting teachers...');
    const teachersResult = await db.collection('teachers').insertMany(teachers);
    console.log(`✅ Inserted ${teachersResult.insertedCount} teachers`);

    console.log('✨ Data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
