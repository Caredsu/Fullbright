import { connectDB } from './src/config/database.js';
import bcrypt from 'bcryptjs';

connectDB().then(async (db) => {
  try {
    const password = 'admin1234';
    const hash = await bcrypt.hash(password, 10);
    
    // Check if admin exists
    const admin = await db.collection('admins').findOne({ username: 'admin' });
    
    if (admin) {
      console.log('Admin user exists, updating password...');
      const result = await db.collection('admins').updateOne(
        { username: 'admin' },
        { $set: { password: hash, password_hashed: hash } }
      );
      console.log('✅ Admin password updated!');
      console.log('Updated records:', result.modifiedCount);
    } else {
      console.log('Admin user not found, creating new admin...');
      const result = await db.collection('admins').insertOne({
        username: 'admin',
        password: hash,
        password_hashed: hash,
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Admin user created successfully!');
      console.log('Created ID:', result.insertedId);
    }
    
    console.log('');
    console.log('Login Credentials:');
    console.log('Username: admin');
    console.log('Password: admin1234');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}).catch(err => { 
  console.error('❌ Connection error:', err.message); 
  process.exit(1); 
});
