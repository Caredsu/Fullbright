import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');

async function fixAdminPassword() {
  try {
    await client.connect();
    const db = client.db('teacher_eval');
    const adminsCollection = db.collection('admins');
    
    // Generate new hash
    const password = 'admin1234';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('New hash:', hash);
    
    // Update admin password
    const result = await adminsCollection.updateOne(
      { username: 'Cared' },
      { $set: { password: hash, updated_at: new Date() } }
    );
    
    console.log('Updated:', result.modifiedCount, 'documents');
    console.log('✅ Admin password updated successfully!');
    console.log('Username: Cared');
    console.log('Password: admin1234');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixAdminPassword();
