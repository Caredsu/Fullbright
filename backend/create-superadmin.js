import { connectDB } from './src/config/database.js';
import bcrypt from 'bcryptjs';

await connectDB().then(async (db) => {
  try {
    console.log('🌱 Creating superadmin user...');
    
    const password = 'superadmin123';
    const hash = await bcrypt.hash(password, 10);
    
    // Check if superadmin exists
    const existing = await db.collection('users').findOne({ username: 'superadmin' });
    
    if (existing) {
      console.log('Superadmin user exists, updating password...');
      const result = await db.collection('users').updateOne(
        { username: 'superadmin' },
        { $set: { password: hash, updated_at: new Date() } }
      );
      console.log('✅ Superadmin password updated!');
      console.log('Updated records:', result.modifiedCount);
    } else {
      console.log('Creating new superadmin user...');
      const result = await db.collection('users').insertOne({
        username: 'superadmin',
        password: hash,
        email: 'superadmin@system.local',
        role: 'super_admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Superadmin user created successfully!');
      console.log('Created ID:', result.insertedId);
    }
    
    console.log('');
    console.log('Login Credentials:');
    console.log('Username: superadmin');
    console.log('Password: superadmin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}).catch(err => { 
  console.error('❌ Connection error:', err.message); 
  process.exit(1); 
});
